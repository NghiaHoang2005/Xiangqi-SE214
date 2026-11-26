import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ClientEvent,
  ServerEvent,
  SystemEvent,
  type Ack,
  type CloseRoomRequest,
  type CreateRoomRequest,
  type GuestSessionView,
  type JoinRoomRequest,
  type MatchStartedPayload,
  type PingResult,
  type RequestEnvelope,
  type RoomView,
} from '@xiangqi/shared';
import type { Server, Socket } from 'socket.io';
import { GuestSessionService, readGuestSessionToken } from '../modules/auth/guest-session.service';
import { RoomService } from '../modules/room/room.service';
import { runHandler } from './run-handler';

function socketRoomName(roomId: string): string {
  return `room:${roomId}`;
}

/**
 * Single Socket.IO entry point (SRS 9.3). Feature modules add their events here
 * (CreateRoom, SubmitMove, ...) and delegate to their services.
 * In dev the web app reaches it through the Vite proxy, in Docker through nginx,
 * so it is same-origin and CORS stays closed unless WEB_ORIGIN is set.
 */
@WebSocketGateway({
  cors: process.env.WEB_ORIGIN
    ? { origin: process.env.WEB_ORIGIN.split(','), credentials: true }
    : false,
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly guestSessions: GuestSessionService,
    private readonly rooms: RoomService,
  ) {}

  afterInit(server: Server): void {
    server.use((client, next) => {
      const token = readGuestSessionToken(client.handshake.headers.cookie);
      void this.guestSessions.authenticate(token).then(
        (session) => {
          if (session) client.data.guestId = session.guestId;
          next();
        },
        () => next(new Error('Guest session lookup failed')),
      );
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`socket connected id=${client.id}`);
    const guestId = client.data.guestId as string | undefined;
    if (guestId) {
      client.on('disconnecting', () => {
        for (const name of client.rooms) {
          if (!name.startsWith('room:')) continue;
          const roomId = name.slice('room:'.length);
          setImmediate(() => {
            void this.rooms
              .disconnect(roomId, guestId, () => this.hasRoomSocket(name, guestId))
              .then((room) => {
                if (room) this.queueRoomEvents(room);
              })
              .catch(() => this.logger.warn(`Room disconnect update failed roomId=${roomId}`));
          });
        }
      });
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`socket disconnected id=${client.id}`);
  }

  @SubscribeMessage(SystemEvent.Ping)
  ping(@MessageBody() payload: RequestEnvelope | undefined): Promise<Ack<PingResult>> {
    return runHandler(payload, () => ({ serverTime: Date.now() }));
  }

  @SubscribeMessage(ClientEvent.CreateRoom)
  createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateRoomRequest | undefined,
  ): Promise<Ack<RoomView>> {
    return runHandler(payload, async () => {
      const guest = await this.authenticateGuest(client);
      const room = await this.rooms.create(guest.guestId, payload);
      await client.join(socketRoomName(room.roomId));
      return room;
    });
  }

  @SubscribeMessage(ClientEvent.CloseRoom)
  closeRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CloseRoomRequest | undefined,
  ): Promise<Ack<RoomView>> {
    return runHandler(payload, async () => {
      const guest = await this.authenticateGuest(client);
      const room = await this.rooms.close(guest.guestId, payload?.roomId);
      this.queueRoomEvents(room);
      return room;
    });
  }

  @SubscribeMessage(ClientEvent.JoinRoom)
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomRequest | undefined,
  ): Promise<Ack<RoomView>> {
    return runHandler(payload, async () => {
      const guest = await this.authenticateGuest(client);
      const { room, changed, started } = await this.rooms.join(guest.guestId, payload);
      await client.join(socketRoomName(room.roomId));
      if (changed) this.queueRoomEvents(room, started);
      return room;
    });
  }

  private authenticateGuest(client: Socket): Promise<GuestSessionView> {
    const token = client.data.guestId
      ? readGuestSessionToken(client.handshake.headers.cookie)
      : undefined;
    return this.guestSessions.require(token);
  }

  private async publishRoomUpdate(room: RoomView): Promise<void> {
    const sockets = await this.server.in(socketRoomName(room.roomId)).fetchSockets();
    for (const socket of sockets) {
      const yourSide =
        room.seats.find((seat) => seat.guestId === socket.data.guestId)?.side ?? null;
      socket.emit(ServerEvent.RoomUpdated, { ...room, yourSide });
    }
  }

  private queueRoomEvents(room: RoomView, started?: MatchStartedPayload): void {
    // Nest sends the returned acknowledgement before the next turn of the event loop.
    setImmediate(() => {
      void this.publishRoomUpdate(room)
        .then(() => {
          if (started)
            this.server.to(socketRoomName(room.roomId)).emit(ServerEvent.MatchStarted, started);
        })
        .catch(() => this.logger.warn(`Room event delivery failed roomId=${room.roomId}`));
    });
  }

  private hasRoomSocket(name: string, guestId: string): boolean {
    const namespace = this.server.sockets;
    for (const socketId of namespace.adapter.rooms.get(name) ?? []) {
      if (namespace.sockets.get(socketId)?.data.guestId === guestId) return true;
    }
    return false;
  }
}
