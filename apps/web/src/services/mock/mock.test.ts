import { ROOM_IDLE_TTL_MS, type TimeControl } from '@xiangqi/shared';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../lib/errors';
import type { MatchStartedEvent, Services } from '../types';
import { createMemoryBus, createMemoryStorage, createMockServices, MOCK_ERROR_CODES } from '.';
import { MOCK_SESSION_IDLE_MS } from './session';

const CLOCK: TimeControl = { initialMinutes: 10, incrementSeconds: 5 };

/** Several "tabs" sharing one fake server: own session storage, shared rooms + bus. */
function createWorld() {
  let time = 1_000_000;
  const shared = createMemoryStorage();
  const bus = createMemoryBus<MatchStartedEvent>();
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
    const tab = createWorld().tab();
    const first = await tab.session.bootstrap();
    const again = await tab.session.bootstrap();
    expect(first.isNew).toBe(true);
    expect(again).toMatchObject({ guestId: first.guestId, isNew: false });
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

  it('validates nickname length and allows clearing it', async () => {
    const tab = createWorld().tab();
    await tab.session.bootstrap();
    expect(await errorCode(tab.session.setNickname('a'))).toBe('VALIDATION_FAILED');
    expect(await errorCode(tab.session.setNickname('x'.repeat(33)))).toBe('VALIDATION_FAILED');
    expect((await tab.session.setNickname('  Tướng  ')).nickname).toBe('Tướng');
    expect((await tab.session.setNickname('   ')).nickname).toBeNull();
  });
});

describe('mock rooms', () => {
  async function hostAndGuest() {
    const world = createWorld();
    const host = world.tab();
    const guest = world.tab();
    await host.session.bootstrap();
    await guest.session.bootstrap();
    return { world, host, guest };
  }

  it('creates a room with a 128-bit id and an 8-character code', async () => {
    const { host } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, side: 'BLACK' });
    expect(room.roomId).toMatch(/^[0-9a-f]{32}$/);
    expect(room.code).toMatch(/^[A-Z0-9]{8}$/);
    expect(room.seats.RED).toBeNull();
    expect(room.seats.BLACK).not.toBeNull();
    expect(room.status).toBe('WAITING');
  });

  it('rejects an invalid config and lists the valid values (E1)', async () => {
    const { host } = await hostAndGuest();
    const bad = { timeControl: { initialMinutes: 7, incrementSeconds: 0 }, side: 'RED' };
    await expect(host.room.createRoom(bad as never)).rejects.toMatchObject({
      error: { code: 'VALIDATION_FAILED', message: expect.stringContaining('10+5') },
    });
  });

  it('starts the match when the second guest joins by code, and tells both sides', async () => {
    const { host, guest } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, side: 'RED' });
    const seen: MatchStartedEvent[] = [];
    host.room.onMatchStarted(room.roomId, (e) => seen.push(e));

    const joined = await guest.room.joinRoom(room.code.toLowerCase());
    expect(joined.seat).toBe('BLACK');
    expect(joined.room.status).toBe('PLAYING');
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ matchId: joined.room.matchId, version: 0 });
  });

  it('gives a returning guest the same seat (A1) and refuses a third guest', async () => {
    const { world, host, guest } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, side: 'RED' });
    await guest.room.joinRoom(room.roomId);
    expect((await guest.room.joinRoom(room.roomId)).seat).toBe('BLACK');
    expect((await host.room.joinRoom(room.roomId)).seat).toBe('RED');

    const third = world.tab();
    await third.session.bootstrap();
    expect(await errorCode(third.room.joinRoom(room.roomId))).toBe('ROOM_FULL');
  });

  it('answers ROOM_NOT_FOUND and ROOM_EXPIRED', async () => {
    const { world, host, guest } = await hostAndGuest();
    expect(await errorCode(guest.room.joinRoom('ZZZZZZZZ'))).toBe('ROOM_NOT_FOUND');

    const closed = await host.room.createRoom({ timeControl: CLOCK, side: 'RED' });
    await host.room.closeRoom(closed.roomId);
    expect(await errorCode(guest.room.joinRoom(closed.code))).toBe('ROOM_EXPIRED');

    const idle = await host.room.createRoom({ timeControl: CLOCK, side: 'RED' });
    world.advance(ROOM_IDLE_TTL_MS + 1);
    expect(await errorCode(guest.room.joinRoom(idle.roomId))).toBe('ROOM_EXPIRED');
  });

  it('has fixed codes for trying each error by hand', async () => {
    const { guest } = await hostAndGuest();
    expect(await errorCode(guest.room.joinRoom(MOCK_ERROR_CODES.expired))).toBe('ROOM_EXPIRED');
    expect(await errorCode(guest.room.joinRoom(MOCK_ERROR_CODES.full))).toBe('ROOM_FULL');
    expect(await errorCode(guest.room.joinRoom(MOCK_ERROR_CODES.network))).toBe('NETWORK_ERROR');
  });

  it('lets only the host close the room', async () => {
    const { host, guest } = await hostAndGuest();
    const room = await host.room.createRoom({ timeControl: CLOCK, side: 'RED' });
    expect(await errorCode(guest.room.closeRoom(room.roomId))).toBe('ACCESS_DENIED');
  });
});
