import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createInitialPosition, toFen } from '@xiangqi/rules';
import {
  ErrorCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  ROOM_IDLE_TTL_MS,
  SIDES,
  SIDE_PREFERENCES,
  TIME_CONTROL_PRESETS,
  isValidJoinCode,
  isTimeControlPreset,
  normalizeJoinCode,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type MatchStartedPayload,
  type RoomView,
  type TimeControl,
} from '@xiangqi/shared';
import { randomBytes, randomInt } from 'node:crypto';
import { DomainException } from '../../common/domain.exception';
import { PrismaService } from '../../database/prisma.service';

const roomRelations = {
  seats: { include: { guest: { select: { nickname: true } } } },
  matches: { select: { matchId: true }, take: 1 },
} satisfies Prisma.RoomInclude;

type StoredRoom = Prisma.RoomGetPayload<{ include: typeof roomRelations }>;
type RoomIdentifier = { roomId: string } | { joinCode: string };

interface JoinResult {
  room: RoomView;
  changed: boolean;
  started?: MatchStartedPayload;
}

const MAX_ID_ATTEMPTS = 5;

function timeControlView(value: Prisma.JsonValue): TimeControl {
  if (!isTimeControlPreset(value)) throw new Error('Invalid stored room time control');
  return { initialMinutes: value.initialMinutes, incrementSeconds: value.incrementSeconds };
}

function toRoomView(room: StoredRoom, guestId: string): RoomView {
  const seats = [...room.seats]
    .sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side))
    .map(({ side, guestId, guest, connectionState }) => ({
      side,
      guestId,
      nickname: guest.nickname,
      connectionState,
    }));
  const host = seats.find((seat) => seat.guestId === room.hostGuestId);
  if (!host) throw new Error('Room is missing its host seat');

  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    status: room.status,
    timeControl: timeControlView(room.timeControl),
    hostGuestId: room.hostGuestId,
    hostSide: host.side,
    yourSide: seats.find((seat) => seat.guestId === guestId)?.side ?? null,
    seats,
    matchId: room.matches[0]?.matchId ?? null,
    expiresAt: room.expiresAt.toISOString(),
  };
}

function readRoomIdentifier(request: JoinRoomRequest | undefined): RoomIdentifier {
  const roomId = request?.roomId;
  const rawCode = request?.joinCode;
  if (typeof roomId === 'string' && roomId.length > 0 && rawCode === undefined) return { roomId };
  if (typeof rawCode === 'string' && rawCode.length > 0 && roomId === undefined) {
    const joinCode = normalizeJoinCode(rawCode);
    if (!isValidJoinCode(joinCode)) throw new DomainException(ErrorCode.ROOM_NOT_FOUND);
    return { joinCode };
  }
  throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Provide one room ID or join code');
}

function isExpired(room: StoredRoom, now: Date): boolean {
  return (
    room.status === 'EXPIRED' ||
    (room.status === 'WAITING' && room.expiresAt.getTime() <= now.getTime())
  );
}

@Injectable()
export class RoomService {
  constructor(private readonly db: PrismaService) {}

  async create(guestId: string, request: CreateRoomRequest | undefined): Promise<RoomView> {
    if (!isTimeControlPreset(request?.timeControl)) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Invalid time control', undefined, {
        field: 'timeControl',
        allowed: TIME_CONTROL_PRESETS,
      });
    }
    const preferredSide = SIDE_PREFERENCES.find((side) => side === request?.preferredSide);
    if (!preferredSide) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Invalid side preference', undefined, {
        field: 'preferredSide',
        allowed: SIDE_PREFERENCES,
      });
    }

    const { initialMinutes, incrementSeconds } = request.timeControl;
    const hostSide = preferredSide === 'RANDOM' ? SIDES[randomInt(SIDES.length)] : preferredSide;
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const roomId = randomBytes(32).toString('base64url');
      const joinCode = Array.from(
        { length: JOIN_CODE_LENGTH },
        () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)],
      ).join('');
      const now = new Date();

      try {
        const room = await this.db.room.create({
          data: {
            roomId,
            joinCode,
            timeControl: { initialMinutes, incrementSeconds },
            preferredSide,
            hostGuestId: guestId,
            lastActivityAt: now,
            expiresAt: new Date(now.getTime() + ROOM_IDLE_TTL_MS),
            seats: { create: { side: hostSide, guestId } },
          },
          include: roomRelations,
        });
        return toRoomView(room, guestId);
      } catch (error) {
        const collision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!collision || attempt + 1 === MAX_ID_ATTEMPTS) throw error;
      }
    }
    throw new Error('Room identifier allocation exhausted');
  }

  async close(guestId: string, roomId: unknown): Promise<RoomView> {
    if (typeof roomId !== 'string' || roomId.length === 0) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        'Room identifier is required',
        undefined,
        {
          field: 'roomId',
        },
      );
    }

    return this.db.$transaction(async (tx) => {
      const room = await this.lockRoom(tx, { roomId });
      if (!room) throw new DomainException(ErrorCode.ROOM_NOT_FOUND);
      const now = new Date();
      if (room.hostGuestId !== guestId) throw new DomainException(ErrorCode.ACCESS_DENIED);
      if (room.status === 'CLOSED') return toRoomView(room, guestId);
      if (isExpired(room, now)) throw new DomainException(ErrorCode.ROOM_EXPIRED);
      if (room.status !== 'WAITING') {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Only waiting rooms can be closed');
      }

      const closed = await tx.room.update({
        where: { roomId },
        data: { status: 'CLOSED', lastActivityAt: now },
        include: roomRelations,
      });
      return toRoomView(closed, guestId);
    });
  }

  async expireWaitingRooms(now = new Date()): Promise<RoomView[]> {
    const expired = await this.db.$queryRaw<Array<{ roomId: string }>>`
      UPDATE room SET status = 'EXPIRED'
      WHERE status = 'WAITING' AND expires_at <= ${now}
      RETURNING room_id AS "roomId"
    `;
    if (expired.length === 0) return [];

    const rooms = await this.db.room.findMany({
      where: { roomId: { in: expired.map(({ roomId }) => roomId) } },
      include: roomRelations,
    });
    return rooms.map((room) => toRoomView(room, room.hostGuestId));
  }

  async join(guestId: string, request: JoinRoomRequest | undefined): Promise<JoinResult> {
    const identifier = readRoomIdentifier(request);
    try {
      return await this.db.$transaction(async (tx) => {
        const room = await this.lockRoom(tx, identifier);
        if (!room) throw new DomainException(ErrorCode.ROOM_NOT_FOUND);
        const now = new Date();
        if (room.status === 'CLOSED' || isExpired(room, now)) {
          throw new DomainException(ErrorCode.ROOM_EXPIRED);
        }

        const seat = room.seats.find((entry) => entry.guestId === guestId);
        if (seat) return this.restoreSeat(tx, room, seat, now);
        if (room.status === 'STARTED' || room.seats.length >= 2) {
          throw new DomainException(ErrorCode.ROOM_FULL);
        }
        return this.startMatch(tx, room, guestId, now);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainException(ErrorCode.ROOM_FULL);
      }
      throw error;
    }
  }

  async disconnect(
    roomId: string,
    guestId: string,
    hasConnectedSocket: () => boolean,
  ): Promise<RoomView | null> {
    return this.db.$transaction(async (tx) => {
      const room = await this.lockRoom(tx, { roomId });
      const seat = room?.seats.find((entry) => entry.guestId === guestId);
      if (
        !room ||
        !seat ||
        seat.connectionState !== 'CONNECTED' ||
        hasConnectedSocket() ||
        (room.status !== 'WAITING' && room.status !== 'STARTED')
      ) {
        return null;
      }
      const connectionState = room.status === 'STARTED' ? 'RECONNECTING' : 'DISCONNECTED';
      const updated = await tx.room.update({
        where: { roomId },
        data: {
          seats: {
            update: {
              where: { roomId_side: { roomId, side: seat.side } },
              data: { connectionState, disconnectedAt: new Date() },
            },
          },
        },
        include: roomRelations,
      });
      return toRoomView(updated, guestId);
    });
  }

  private async restoreSeat(
    tx: Prisma.TransactionClient,
    room: StoredRoom,
    seat: StoredRoom['seats'][number],
    now: Date,
  ): Promise<JoinResult> {
    const { roomId } = room;
    const reconnecting = seat.connectionState !== 'CONNECTED';
    if (room.status !== 'WAITING' && !reconnecting) {
      return { room: toRoomView(room, seat.guestId), changed: false };
    }
    const updated = await tx.room.update({
      where: { roomId },
      data: {
        ...(room.status === 'WAITING'
          ? { lastActivityAt: now, expiresAt: new Date(now.getTime() + ROOM_IDLE_TTL_MS) }
          : {}),
        ...(reconnecting
          ? {
              seats: {
                update: {
                  where: { roomId_side: { roomId, side: seat.side } },
                  data: { connectionState: 'CONNECTED', disconnectedAt: null },
                },
              },
            }
          : {}),
      },
      include: roomRelations,
    });
    return { room: toRoomView(updated, seat.guestId), changed: true };
  }

  private async startMatch(
    tx: Prisma.TransactionClient,
    room: StoredRoom,
    guestId: string,
    now: Date,
  ): Promise<JoinResult> {
    const { roomId } = room;
    const host = room.seats.find((seat) => seat.guestId === room.hostGuestId);
    if (!host) throw new Error('Room is missing its host seat');
    const nextSide = host.side === 'RED' ? 'BLACK' : 'RED';
    const timeControl = timeControlView(room.timeControl);
    const startMs = timeControl.initialMinutes * 60_000;
    const clocks = { redMs: startMs, blackMs: startMs };
    const position = createInitialPosition();

    await tx.roomSeat.create({ data: { roomId, side: nextSide, guestId } });
    const match = await tx.match.create({
      data: {
        mode: 'PVP',
        roomId,
        redGuestId: nextSide === 'RED' ? guestId : host.guestId,
        blackGuestId: nextSide === 'BLACK' ? guestId : host.guestId,
        timeControl: { ...timeControl },
        turn: position.turn,
        snapshot: {
          board: position.board.map((piece) => (piece ? { ...piece } : null)),
          turn: position.turn,
        },
        clocks: { ...clocks, turnStartedAt: now.toISOString() },
      },
      select: { matchId: true, version: true, turn: true },
    });
    const startedRoom = await tx.room.update({
      where: { roomId },
      data: { status: 'STARTED', lastActivityAt: now },
      include: roomRelations,
    });
    const roomView = toRoomView(startedRoom, guestId);
    const [red, black] = roomView.seats;
    return {
      room: roomView,
      changed: true,
      started: {
        ...match,
        roomId,
        mode: 'PVP',
        timeControl,
        fen: toFen(position),
        clocks,
        players: {
          RED: { guestId: red.guestId, nickname: red.nickname },
          BLACK: { guestId: black.guestId, nickname: black.nickname },
        },
      },
    };
  }

  private async lockRoom(
    tx: Prisma.TransactionClient,
    identifier: RoomIdentifier,
  ): Promise<StoredRoom | null> {
    const predicate =
      'roomId' in identifier
        ? Prisma.sql`room_id = ${identifier.roomId}`
        : Prisma.sql`join_code = ${identifier.joinCode}`;
    const locked = await tx.$queryRaw<Array<{ roomId: string }>>`
      SELECT room_id AS "roomId" FROM room WHERE ${predicate} FOR UPDATE
    `;
    const [row] = locked;
    return row
      ? tx.room.findUnique({ where: { roomId: row.roomId }, include: roomRelations })
      : null;
  }
}
