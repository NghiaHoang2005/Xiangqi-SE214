import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasTestDb, resetTestDatabase } from '../test/test-db';
import { GuestSession, Match, Move, Room, RoomSeat } from './entities';

const TC = { initialMinutes: 10, incrementSeconds: 5 } as const;
const CLOCKS = { redMs: 600_000, blackMs: 600_000, turnStartedAt: null };
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

describe.skipIf(!hasTestDb)('database schema (SRS 8.2)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = await resetTestDatabase();
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  async function guest(): Promise<GuestSession> {
    return ds.getRepository(GuestSession).save({
      nickname: null,
      reconnectTokenHash: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      lastSeenAt: new Date(),
      expiresAt: inDays(30),
    });
  }

  async function room(hostGuestId: string): Promise<Room> {
    return ds.getRepository(Room).save({
      roomId: randomUUID().replace(/-/g, ''),
      joinCode: Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, 'X'),
      timeControl: TC,
      preferredSide: 'RANDOM',
      hostGuestId,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
  }

  async function pvpMatch(): Promise<Match> {
    const [a, b] = [await guest(), await guest()];
    return ds.getRepository(Match).save({
      mode: 'PVP',
      redGuestId: a.guestId,
      blackGuestId: b.guestId,
      timeControl: TC,
      snapshot: { board: 'initial' },
      clocks: CLOCKS,
    });
  }

  function move(matchId: string, ply: number, moveId = randomUUID()): Partial<Move> {
    return {
      matchId,
      ply,
      moveId,
      actorType: 'HUMAN',
      guestId: null,
      from: { file: 1, rank: 0 },
      to: { file: 2, rank: 2 },
      capture: null,
      clockAfter: CLOCKS,
      stateHash: 'a'.repeat(64),
    };
  }

  it('creates a match with defaults: in progress, red to move, version 0', async () => {
    const m = await pvpMatch();
    const loaded = await ds.getRepository(Match).findOneByOrFail({ matchId: m.matchId });
    expect(loaded).toMatchObject({ status: 'IN_PROGRESS', turn: 'RED', version: 0 });
  });

  it('allows at most one seat per side in a room (no third seat, FR-04)', async () => {
    const host = await guest();
    const r = await room(host.guestId);
    const seats = ds.getRepository(RoomSeat);
    await seats.insert({ roomId: r.roomId, side: 'RED', guestId: host.guestId });
    const other = await guest();
    await expect(
      seats.insert({ roomId: r.roomId, side: 'RED', guestId: other.guestId }),
    ).rejects.toThrow(/duplicate key/);
  });

  it('stops one guest from taking both seats', async () => {
    const host = await guest();
    const r = await room(host.guestId);
    const seats = ds.getRepository(RoomSeat);
    await seats.insert({ roomId: r.roomId, side: 'RED', guestId: host.guestId });
    await expect(
      seats.insert({ roomId: r.roomId, side: 'BLACK', guestId: host.guestId }),
    ).rejects.toThrow(/uq_room_seat_guest/);
  });

  it('rejects a repeated ply in the same match', async () => {
    const m = await pvpMatch();
    const moves = ds.getRepository(Move);
    await moves.insert(move(m.matchId, 1));
    await expect(moves.insert(move(m.matchId, 1))).rejects.toThrow(/duplicate key/);
  });

  it('rejects the same moveId twice in a match (idempotent SubmitMove)', async () => {
    const m = await pvpMatch();
    const moves = ds.getRepository(Move);
    const moveId = randomUUID();
    await moves.insert(move(m.matchId, 1, moveId));
    await expect(moves.insert(move(m.matchId, 2, moveId))).rejects.toThrow(/uq_move_match_move_id/);
  });

  it('requires AI side and difficulty on PVE matches', async () => {
    const g = await guest();
    await expect(
      ds.getRepository(Match).insert({
        mode: 'PVE',
        redGuestId: g.guestId,
        timeControl: TC,
        snapshot: {},
        clocks: CLOCKS,
      }),
    ).rejects.toThrow(/chk_match_pve_has_ai/);
  });

  it('deletes moves with their match (retention job, BR-20)', async () => {
    const m = await pvpMatch();
    await ds.getRepository(Move).insert(move(m.matchId, 1));
    await ds.getRepository(Match).delete({ matchId: m.matchId });
    expect(await ds.getRepository(Move).countBy({ matchId: m.matchId })).toBe(0);
  });
});
