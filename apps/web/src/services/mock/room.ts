import { INITIAL_FEN } from '@xiangqi/rules';
import {
  ErrorCode,
  isTimeControlPreset,
  normalizeJoinCode,
  ROOM_IDLE_TTL_MS,
  SIDE_PREFERENCES,
  SIDES,
  TIME_CONTROL_PRESETS,
  type MatchStartedPayload,
  type RoomView,
  type SeatView,
  type Side,
} from '@xiangqi/shared';
import type { CreateRoomInput, JoinRoomTarget, RoomService } from '../types';
import type { MockBus } from './bus';
import type { StoredSession } from './session';
import {
  delay,
  fail,
  randomBase64Url,
  randomJoinCode,
  readJson,
  writeJson,
  type KeyValueStorage,
} from './util';

export const MOCK_ROOMS_KEY = 'xq.mock.rooms';

/** Join codes that always fail, to try each error screen by hand. */
export const MOCK_ERROR_CODES = {
  expired: 'HETHAN99',
  full: 'PHNGDAY9',
  network: 'MATKETN9',
} as const;

export interface StoredRoom extends Omit<RoomView, 'yourSide' | 'expiresAt'> {
  lastActivityAt: number;
}

export type MockEvent =
  | { type: 'RoomUpdated'; room: StoredRoom }
  | { type: 'MatchStarted'; payload: MatchStartedPayload };

type RoomTable = Record<string, StoredRoom>;

export function createMockRoomService(opts: {
  storage: KeyValueStorage;
  bus: MockBus<MockEvent>;
  currentGuest: () => StoredSession | null;
  latencyMs: number;
  now?: () => number;
}): RoomService {
  const now = opts.now ?? Date.now;

  // Web Locks serialise this across tabs, so two concurrent joins cannot both take the last seat.
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

  function seatOf(guest: StoredSession, side: Side): SeatView {
    return { side, guestId: guest.guestId, nickname: guest.nickname, connectionState: 'CONNECTED' };
  }

  function viewFor(room: StoredRoom, guestId: string | undefined): RoomView {
    const copy: Partial<StoredRoom> = structuredClone(room);
    delete copy.lastActivityAt;
    return {
      ...(copy as Omit<StoredRoom, 'lastActivityAt'>),
      yourSide: room.seats.find((s) => s.guestId === guestId)?.side ?? null,
      expiresAt: new Date(room.lastActivityAt + ROOM_IDLE_TTL_MS).toISOString(),
    };
  }

  function view(room: StoredRoom): RoomView {
    return viewFor(room, opts.currentGuest()?.guestId);
  }

  function sortSeats(seats: SeatView[]): SeatView[] {
    return seats.sort((a, b) => SIDES.indexOf(a.side) - SIDES.indexOf(b.side));
  }

  function matchStarted(room: StoredRoom, matchId: string): MatchStartedPayload {
    const player = (side: Side) => {
      const seat = room.seats.find((s) => s.side === side)!;
      return { guestId: seat.guestId, nickname: seat.nickname };
    };
    const ms = room.timeControl.initialMinutes * 60_000;
    return {
      matchId,
      roomId: room.roomId,
      mode: 'PVP',
      version: 0,
      timeControl: { ...room.timeControl },
      turn: 'RED',
      fen: INITIAL_FEN,
      clocks: { redMs: ms, blackMs: ms },
      players: { RED: player('RED'), BLACK: player('BLACK') },
    };
  }

  function findRoom(rooms: RoomTable, target: JoinRoomTarget): StoredRoom | undefined {
    if ('roomId' in target) return rooms[target.roomId];
    const code = normalizeJoinCode(target.joinCode);
    return Object.values(rooms).find((r) => r.joinCode === code);
  }

  return {
    async createRoom(input: CreateRoomInput): Promise<RoomView> {
      await delay(opts.latencyMs);
      const guest = requireGuest();

      if (!isTimeControlPreset(input.timeControl)) {
        const clocks = TIME_CONTROL_PRESETS.map(
          (p) => `${p.initialMinutes}+${p.incrementSeconds}`,
        ).join(', ');
        fail(ErrorCode.VALIDATION_FAILED, `Invalid timeControl. Allowed: ${clocks}`, {
          field: 'timeControl',
          allowed: TIME_CONTROL_PRESETS,
        });
      }
      if (!SIDE_PREFERENCES.includes(input.preferredSide)) {
        fail(
          ErrorCode.VALIDATION_FAILED,
          `Invalid preferredSide. Allowed: ${SIDE_PREFERENCES.join(', ')}`,
          { field: 'preferredSide', allowed: SIDE_PREFERENCES },
        );
      }

      const hostSide: Side =
        input.preferredSide === 'RANDOM'
          ? Math.random() < 0.5
            ? 'RED'
            : 'BLACK'
          : input.preferredSide;
      const room = await withRooms((rooms) => {
        const codes = new Set(Object.values(rooms).map((r) => r.joinCode));
        let joinCode = randomJoinCode();
        while (codes.has(joinCode)) joinCode = randomJoinCode();
        const created: StoredRoom = {
          roomId: randomBase64Url(32),
          joinCode,
          status: 'WAITING',
          timeControl: { ...input.timeControl },
          hostGuestId: guest.guestId,
          hostSide,
          seats: [seatOf(guest, hostSide)],
          matchId: null,
          lastActivityAt: now(),
        };
        rooms[created.roomId] = created;
        return created;
      });
      return view(room);
    },

    async joinRoom(target: JoinRoomTarget): Promise<RoomView> {
      await delay(opts.latencyMs);
      if ('joinCode' in target) {
        const code = normalizeJoinCode(target.joinCode);
        if (code === MOCK_ERROR_CODES.network) fail('NETWORK_ERROR', 'Cannot reach the server');
        if (code === MOCK_ERROR_CODES.expired) fail(ErrorCode.ROOM_EXPIRED, 'Room has expired');
        if (code === MOCK_ERROR_CODES.full) fail(ErrorCode.ROOM_FULL, 'Room is full');
      }
      const guest = requireGuest();

      const { room, started } = await withRooms((rooms) => {
        const room = findRoom(rooms, target);
        if (!room) fail(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        if (
          room.status === 'CLOSED' ||
          room.status === 'EXPIRED' ||
          now() - room.lastActivityAt > ROOM_IDLE_TTL_MS
        ) {
          fail(ErrorCode.ROOM_EXPIRED, 'Room has expired');
        }

        // A1: a guest who already holds a seat gets the same seat back.
        if (room.seats.some((s) => s.guestId === guest.guestId)) {
          room.lastActivityAt = now();
          return { room, started: null };
        }

        const free = SIDES.find((side) => !room.seats.some((s) => s.side === side));
        if (!free) fail(ErrorCode.ROOM_FULL, 'Room is full');

        room.seats = sortSeats([...room.seats, seatOf(guest, free)]);
        room.lastActivityAt = now();
        let event: MatchStartedPayload | null = null;
        if (room.seats.length === SIDES.length) {
          room.status = 'STARTED';
          room.matchId = crypto.randomUUID();
          event = matchStarted(room, room.matchId);
        }
        return { room, started: event };
      });

      if (started) {
        opts.bus.publish({ type: 'RoomUpdated', room });
        opts.bus.publish({ type: 'MatchStarted', payload: started });
      }
      return view(room);
    },

    async closeRoom(roomId: string): Promise<RoomView> {
      await delay(opts.latencyMs);
      const guest = requireGuest();
      const room = await withRooms((rooms) => {
        const room = rooms[roomId];
        if (!room) fail(ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        if (room.hostGuestId !== guest.guestId) fail(ErrorCode.ACCESS_DENIED, 'Not the host');
        room.status = 'CLOSED';
        room.lastActivityAt = now();
        return room;
      });
      opts.bus.publish({ type: 'RoomUpdated', room });
      return view(room);
    },

    onRoomUpdated(roomId, listener) {
      return opts.bus.subscribe((event) => {
        if (event.type === 'RoomUpdated' && event.room.roomId === roomId) {
          listener(view(event.room));
        }
      });
    },

    onMatchStarted(roomId, listener) {
      return opts.bus.subscribe((event) => {
        if (event.type === 'MatchStarted' && event.payload.roomId === roomId) {
          listener(event.payload);
        }
      });
    },
  };
}
