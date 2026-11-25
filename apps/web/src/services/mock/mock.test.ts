import { INITIAL_FEN } from '@xiangqi/rules';
import {
  isValidJoinCode,
  ROOM_IDLE_TTL_MS,
  TIME_CONTROL_PRESETS,
  type MatchStartedPayload,
  type RoomView,
  type TimeControl,
} from '@xiangqi/shared';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../lib/errors';
import type { Services } from '../types';
import {
  createMemoryBus,
  createMemoryStorage,
  createMockServices,
  MOCK_ERROR_CODES,
  type MockEvent,
} from '.';
import { MOCK_SESSION_IDLE_MS } from './session';

const CLOCK: TimeControl = { initialMinutes: 10, incrementSeconds: 5 };

function createWorld() {
  let time = 1_000_000;
  const shared = createMemoryStorage();
  const bus = createMemoryBus<MockEvent>();
  return {
    now: () => time,
    advance: (ms: number) => (time += ms),
    tab(): Services {
      return createMockServices({
        latencyMs: 0,
        sessionStorage: createMemoryStorage(),
        sharedStorage: shared,
        bus,
        now: () => time,
      });
    },
  };
}

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    if (err instanceof ApiRequestError) return err.error.code;
    throw err;
  }
  throw new Error('expected a rejection');
}

describe('mock session', () => {
  it('creates a guest once and reuses it while active (A1)', async () => {
    const world = createWorld();
    const tab = world.tab();
    const first = await tab.session.bootstrap();
    const again = await tab.session.bootstrap();
    expect(first.isNew).toBe(true);
    expect(again).toMatchObject({ guestId: first.guestId, isNew: false });
    expect(Date.parse(again.expiresAt)).toBe(world.now() + MOCK_SESSION_IDLE_MS);
  });

  it('creates a new guest after 30 days without activity', async () => {
    const world = createWorld();
    const tab = world.tab();
    const first = await tab.session.bootstrap();
    world.advance(MOCK_SESSION_IDLE_MS + 1);
    const next = await tab.session.bootstrap();
    expect(next.isNew).toBe(true);
    expect(next.guestId).not.toBe(first.guestId);
  });

  it('validates nickname length (2-20), normalizes it and allows clearing it', async () => {
    const tab = createWorld().tab();
    await tab.session.bootstrap();
    expect(await errorCode(tab.session.setNickname('a'))).toBe('VALIDATION_FAILED');
    expect(await errorCode(tab.session.setNickname('x'.repeat(21)))).toBe('VALIDATION_FAILED');
    expect((await tab.session.setNickname('  Kỳ   Thủ  ')).nickname).toBe('Kỳ Thủ');
    expect((await tab.session.setNickname('   ')).nickname).toBeNull();
  });
});

describe('mock rooms', () => {
  async function hostAndGuest() {
    const world = createWorld();
    const host = world.tab();
    const guest = world.tab();
    const hostSession = await host.session.bootstrap();
    const guestSession = await guest.session.bootstrap();
    return { world, host, guest, hostSession, guestSession };
  }

  it('creates a RoomView with a base64url id and a valid join code', async () => {
    const { host, hostSession } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'BLACK' });
    expect(room.roomId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isValidJoinCode(room.joinCode)).toBe(true);
    expect(room).toMatchObject({
      status: 'WAITING',
      hostGuestId: hostSession.guestId,
      hostSide: 'BLACK',
      yourSide: 'BLACK',
      matchId: null,
    });
    expect(room.seats).toEqual([
      expect.objectContaining({ side: 'BLACK', guestId: hostSession.guestId }),
    ]);
  });

  it('resolves RANDOM to a real side', async () => {
    const { host } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RANDOM' });
    expect(['RED', 'BLACK']).toContain(room.hostSide);
  });

  it('rejects an invalid config with the allowed values in details (E1)', async () => {
    const { host } = await hostAndGuest();
    const bad = { timeControl: { initialMinutes: 7, incrementSeconds: 0 }, preferredSide: 'RED' };
    await expect(host.room.createRoom(bad as never)).rejects.toMatchObject({
      error: {
        code: 'VALIDATION_FAILED',
        details: { field: 'timeControl', allowed: TIME_CONTROL_PRESETS },
      },
    });
    const badSide = { timeControl: CLOCK, preferredSide: 'GREEN' };
    await expect(host.room.createRoom(badSide as never)).rejects.toMatchObject({
      error: { code: 'VALIDATION_FAILED', details: { field: 'preferredSide' } },
    });
  });

  it('starts the match when the second guest joins by code, and tells both sides', async () => {
    const { host, guest, hostSession, guestSession } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RED' });
    const started: MatchStartedPayload[] = [];
    const updates: RoomView[] = [];
    host.room.onMatchStarted(room.roomId, (e) => started.push(e));
    host.room.onRoomUpdated(room.roomId, (r) => updates.push(r));

    const joined = await guest.room.joinRoom({ joinCode: room.joinCode.toLowerCase() });
    expect(joined).toMatchObject({ status: 'STARTED', yourSide: 'BLACK' });
    expect(joined.seats.map((s) => s.side)).toEqual(['RED', 'BLACK']);

    // RoomUpdated is per recipient: the host sees its own side.
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ status: 'STARTED', yourSide: 'RED' });

    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      matchId: joined.matchId,
      roomId: room.roomId,
      mode: 'PVP',
      version: 0,
      turn: 'RED',
      fen: INITIAL_FEN,
      clocks: { redMs: 600_000, blackMs: 600_000 },
      players: {
        RED: { guestId: hostSession.guestId },
        BLACK: { guestId: guestSession.guestId },
      },
    });
  });

  it('gives a returning guest the same seat (A1) and refuses a third guest', async () => {
    const { world, host, guest } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RED' });
    await guest.room.joinRoom({ roomId: room.roomId });
    expect((await guest.room.joinRoom({ roomId: room.roomId })).yourSide).toBe('BLACK');
    expect((await host.room.joinRoom({ roomId: room.roomId })).yourSide).toBe('RED');

    const third = world.tab();
    await third.session.bootstrap();
    expect(await errorCode(third.room.joinRoom({ roomId: room.roomId }))).toBe('ROOM_FULL');
  });

  it('answers ROOM_NOT_FOUND and ROOM_EXPIRED', async () => {
    const { world, host, guest } = await hostAndGuest();
    expect(await errorCode(guest.room.joinRoom({ joinCode: 'ZZZZZZZZ' }))).toBe('ROOM_NOT_FOUND');

    const closed = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RED' });
    expect((await host.room.closeRoom(closed.roomId)).status).toBe('CLOSED');
    expect(await errorCode(guest.room.joinRoom({ joinCode: closed.joinCode }))).toBe(
      'ROOM_EXPIRED',
    );

    const idle = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RED' });
    world.advance(ROOM_IDLE_TTL_MS + 1);
    expect(await errorCode(guest.room.joinRoom({ roomId: idle.roomId }))).toBe('ROOM_EXPIRED');
  });

  it('has fixed codes for trying each error by hand', async () => {
    const { guest } = await hostAndGuest();
    for (const code of Object.values(MOCK_ERROR_CODES)) expect(isValidJoinCode(code)).toBe(true);
    const join = (joinCode: string) => errorCode(guest.room.joinRoom({ joinCode }));
    expect(await join(MOCK_ERROR_CODES.expired)).toBe('ROOM_EXPIRED');
    expect(await join(MOCK_ERROR_CODES.full)).toBe('ROOM_FULL');
    expect(await join(MOCK_ERROR_CODES.network)).toBe('NETWORK_ERROR');
  });

  it('lets only the host close the room', async () => {
    const { host, guest } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, preferredSide: 'RED' });
    expect(await errorCode(guest.room.closeRoom(room.roomId))).toBe('ACCESS_DENIED');
  });
});
