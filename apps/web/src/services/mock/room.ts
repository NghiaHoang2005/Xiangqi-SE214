import { ErrorCode, ROOM_IDLE_TTL_MS, TIME_CONTROL_PRESETS, type Side } from '@xiangqi/shared';
import type {
  CreateRoomInput,
  JoinRoomResult,
  MatchStartedEvent,
  RoomService,
  RoomSnapshot,
  SeatInfo,
} from '../types';
import type { MockBus } from './bus';
import type { StoredSession } from './session';
import {
  delay,
  fail,
  randomCode,
  randomHex,
  readJson,
  writeJson,
  type KeyValueStorage,
} from './util';

export const MOCK_ROOMS_KEY = 'xq.mock.rooms';

/** Codes that always answer with an error, to try each error screen by hand. */
export const MOCK_ERROR_CODES = {
  /** ROOM_EXPIRED */
  expired: 'HETHAN00',
  /** ROOM_FULL */
  full: 'PHONGDAY',
  /** NETWORK_ERROR, as if the server could not be reached */
  network: 'MATKETNO',
} as const;

const SIDES: readonly string[] = ['RED', 'BLACK', 'RANDOM'];

interface StoredRoom extends RoomSnapshot {
  lastActivityAt: number;
}

type RoomTable = Record<string, StoredRoom>;

export function createMockRoomService(opts: {
  /** Shared by all tabs (localStorage in the browser). */
  storage: KeyValueStorage;
  bus: MockBus<MatchStartedEvent>;
  currentGuest: () => StoredSession | null;
  latencyMs: number;
  now?: () => number;
}): RoomService {
  const now = opts.now ?? Date.now;

  /**
   * Read-modify-write of the shared table. Web Locks (when present) serialise it across
   * tabs, which is what makes "two guests join at once" give one ROOM_FULL, not three seats.
   */
  async function withRooms<T>(fn: (rooms: RoomTable) => T): Promise<T> {
    const run = () => {
      const rooms = readJson<RoomTable>(opts.storage, MOCK_ROOMS_KEY) ?? {};
      const result = fn(rooms);
      writeJson(opts.storage, MOCK_ROOMS_KEY, rooms);
      return result;
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request(MOCK_ROOMS_KEY, run) : run();
  }

  function requireGuest(): StoredSession {
    const guest = opts.currentGuest();
    if (!guest) fail(ErrorCode.ACCESS_DENIED, 'No guest session');
    return guest;
  }

  function seatOf(guest: StoredSession): SeatInfo {
    return { guestId: guest.guestId, nickname: guest.nickname };
  }

  function snapshot(room: StoredRoom): RoomSnapshot {
    const copy: Partial<StoredRoom> = structuredClone(room);
    delete copy.lastActivityAt;
    return copy as RoomSnapshot;
  }

  return {
    async createRoom(input: CreateRoomInput): Promise<RoomSnapshot> {
      await delay(opts.latencyMs);
      const guest = requireGuest();

      const validClock = TIME_CONTROL_PRESETS.some(
        (p) =>
          p.initialMinutes === input.timeControl?.initialMinutes &&
          p.incrementSeconds === input.timeControl?.incrementSeconds,
      );
      if (!validClock || !SIDES.includes(input.side)) {
        const clocks = TIME_CONTROL_PRESETS.map(
          (p) => `${p.initialMinutes}+${p.incrementSeconds}`,
        ).join(', ');
        fail(
          ErrorCode.VALIDATION_FAILED,
          `Invalid room config. timeControl: ${clocks}; side: ${SIDES.join(', ')}`,
        );
      }

      const side: Side =
        input.side === 'RANDOM' ? (Math.random() < 0.5 ? 'RED' : 'BLACK') : input.side;
      const room: StoredRoom = {
        roomId: randomHex(16), // 128 bits
        code: randomCode(8),
        hostGuestId: guest.guestId,
        timeControl: { ...input.timeControl },
        seats: { RED: null, BLACK: null, [side]: seatOf(guest) },
        status: 'WAITING',
        matchId: null,
        lastActivityAt: now(),
      };
      await withRooms((rooms) => {
        rooms[room.roomId] = room;
      });
      return snapshot(room);
    },

    async joinRoom(roomIdOrCode: string): Promise<JoinRoomResult> {
      await delay(opts.latencyMs);
      const key = roomIdOrCode.trim();
      const upper = key.toUpperCase();
      if (upper === MOCK_ERROR_CODES.network) fail('NETWORK_ERROR', 'Cannot reach the server');
      if (upper === MOCK_ERROR_CODES.expired) fail(ErrorCode.ROOM_EXPIRED, 'Room has expired');
      if (upper === MOCK_ERROR_CODES.full) fail(ErrorCode.ROOM_FULL, 'Room is full');
      const guest = requireGuest();

      const { result, started } = await withRooms((rooms) => {
        const room = rooms[key] ?? Object.values(rooms).find((r) => r.code === upper);
        if (!room) fail(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        if (room.status === 'CLOSED' || now() - room.lastActivityAt > ROOM_IDLE_TTL_MS) {
          fail(ErrorCode.ROOM_EXPIRED, 'Room has expired');
        }

        // A1: a guest who already holds a seat gets the same seat back.
        const held = (['RED', 'BLACK'] as const).find(
          (s) => room.seats[s]?.guestId === guest.guestId,
        );
        if (held) {
          room.lastActivityAt = now();
          return { result: { room: snapshot(room), seat: held }, started: null };
        }

        const free = (['RED', 'BLACK'] as const).find((s) => room.seats[s] === null);
        if (!free) fail(ErrorCode.ROOM_FULL, 'Room is full');

        room.seats[free] = seatOf(guest);
        room.lastActivityAt = now();
        let event: MatchStartedEvent | null = null;
        if (room.seats.RED && room.seats.BLACK) {
          room.status = 'PLAYING';
          room.matchId = crypto.randomUUID();
          event = {
            roomId: room.roomId,
            matchId: room.matchId,
            version: 0,
            red: room.seats.RED,
            black: room.seats.BLACK,
          };
        }
        return { result: { room: snapshot(room), seat: free }, started: event };
      });

      if (started) opts.bus.publish(started);
      return result;
    },

    async closeRoom(roomId: string): Promise<void> {
      await delay(opts.latencyMs);
      const guest = requireGuest();
      await withRooms((rooms) => {
        const room = rooms[roomId];
        if (!room) fail(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        if (room.hostGuestId !== guest.guestId) fail(ErrorCode.ACCESS_DENIED, 'Not the host');
        room.status = 'CLOSED';
      });
    },

    onMatchStarted(roomId, listener) {
      return opts.bus.subscribe((event) => {
        if (event.roomId === roomId) listener(event);
      });
    },
  };
}
