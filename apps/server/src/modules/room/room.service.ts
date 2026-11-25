import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  ROOM_IDLE_TTL_MS,
  SIDES,
  SIDE_PREFERENCES,
  TIME_CONTROL_PRESETS,
  isTimeControlPreset,
  type CreateRoomRequest,
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
      const room = await this.lockRoom(tx, roomId);
      if (room.hostGuestId !== guestId) throw new DomainException(ErrorCode.ACCESS_DENIED);
      if (room.status === 'CLOSED') return toRoomView(room, guestId);
      if (room.status === 'EXPIRED' || room.expiresAt.getTime() <= Date.now()) {
        throw new DomainException(ErrorCode.ROOM_EXPIRED);
      }
      if (room.status !== 'WAITING') {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Only waiting rooms can be closed');
      }

      const closed = await tx.room.update({
        where: { roomId },
        data: { status: 'CLOSED', lastActivityAt: new Date() },
        include: roomRelations,
      });
      return toRoomView(closed, guestId);
    });
  }

  private async lockRoom(tx: Prisma.TransactionClient, roomId: string): Promise<StoredRoom> {
    const locked = await tx.$queryRaw<Array<{ roomId: string }>>`
      SELECT room_id AS "roomId" FROM room WHERE room_id = ${roomId} FOR UPDATE
    `;
    if (!locked.length) throw new DomainException(ErrorCode.ROOM_NOT_FOUND);
    return tx.room.findUniqueOrThrow({ where: { roomId }, include: roomRelations });
  }
}
