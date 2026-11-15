import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SystemEvent, type Ack, type PingResult, type RequestEnvelope } from '@xiangqi/shared';
import type { Server, Socket } from 'socket.io';
import { runHandler } from './run-handler';

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
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`socket connected id=${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`socket disconnected id=${client.id}`);
  }

  @SubscribeMessage(SystemEvent.Ping)
  ping(@MessageBody() payload: RequestEnvelope | undefined): Promise<Ack<PingResult>> {
    return runHandler(payload, () => ({ serverTime: Date.now() }));
  }
}
