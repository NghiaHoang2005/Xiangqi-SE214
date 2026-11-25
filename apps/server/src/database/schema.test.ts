import { Prisma, type PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MatchRepository } from '../modules/match/match.repository';
import { hasTestDb, resetTestDatabase } from '../test/test-db';

const TC = { initialMinutes: 10, incrementSeconds: 5 };
const CLOCKS = { redMs: 600_000, blackMs: 600_000, turnStartedAt: null };
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);

/** Prisma reports unique violations as P2002 with the offending columns in meta.target. */
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

describe.skipIf(!hasTestDb)('database schema (SRS 8.2)', () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await resetTestDatabase();
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  const guest = () =>
    db.guestSession.create({
      data: {
        reconnectTokenHash: randomBytes(32).toString('hex'),
        lastSeenAt: new Date(),
        expiresAt: inMinutes(30 * 24 * 60),
      },
    });

  const room = (hostGuestId: string) =>
    db.room.create({
      data: {
        roomId: randomBytes(16).toString('base64url'),
        joinCode: randomBytes(4).toString('hex').toUpperCase(),
        timeControl: TC,
        preferredSide: 'RANDOM',
        hostGuestId,
        lastActivityAt: new Date(),
        expiresAt: inMinutes(30),
      },
    });

  async function pvpMatch() {
    const [a, b] = [await guest(), await guest()];
    return db.match.create({
      data: {
        mode: 'PVP',
        redGuestId: a.guestId,
        blackGuestId: b.guestId,
        timeControl: TC,
        snapshot: { board: 'initial' },
        clocks: CLOCKS,
      },
    });
  }

  const move = (matchId: string, ply: number, moveId: string = randomUUID()) =>
    db.move.create({
      data: {
        matchId,
        ply,
        moveId,
        actorType: 'HUMAN',
        fromSquare: { file: 1, rank: 0 },
        toSquare: { file: 2, rank: 2 },
        clockAfter: CLOCKS,
        stateHash: 'a'.repeat(64),
      },
    });

  it('creates a match with defaults: in progress, red to move, version 0', async () => {
    const m = await pvpMatch();
    expect(m).toMatchObject({ status: 'IN_PROGRESS', turn: 'RED', version: 0 });
  });

  it('serializes duplicate and competing submissions against the same version', async () => {
    const match = await pvpMatch();
    const repository = new MatchRepository(db);
    const move = {
      moveId: randomUUID(),
      actorType: 'HUMAN',
      guestId: match.redGuestId,
      fromSquare: { file: 1, rank: 0 },
      toSquare: { file: 2, rank: 2 },
      stateHash: 'a'.repeat(64),
    } as const;
    const advance = () => ({ snapshot: { ply: 1 }, clocks: CLOCKS, turn: 'BLACK' as const });
    const submit = () => repository.commitMove(match.matchId, 0, move, advance);
    const repeated = await Promise.all([submit(), submit()]);
    expect(repeated.map((result) => result.replayed).sort()).toEqual([false, true]);
    expect(repeated[0].move).toEqual(repeated[1].move);
    await expect(
      repository.commitMove(match.matchId, 0, { ...move, moveId: randomUUID() }, advance),
    ).rejects.toMatchObject({ code: 'STALE_STATE' });
    expect(await db.move.count({ where: { matchId: match.matchId } })).toBe(1);
    expect(await db.match.findUnique({ where: { matchId: match.matchId } })).toMatchObject({
      version: 1,
      turn: 'BLACK',
      snapshot: { ply: 1 },
    });
  });

  it('allows at most one seat per side in a room (no third seat, FR-04)', async () => {
    const host = await guest();
    const r = await room(host.guestId);
    await db.roomSeat.create({ data: { roomId: r.roomId, side: 'RED', guestId: host.guestId } });
    const other = await guest();
    const err = await db.roomSeat
      .create({ data: { roomId: r.roomId, side: 'RED', guestId: other.guestId } })
      .catch((e: unknown) => e);
    expect(isUniqueViolation(err)).toBe(true);
  });

  it('stops one guest from taking both seats', async () => {
    const host = await guest();
    const r = await room(host.guestId);
    await db.roomSeat.create({ data: { roomId: r.roomId, side: 'RED', guestId: host.guestId } });
    const err = await db.roomSeat
      .create({ data: { roomId: r.roomId, side: 'BLACK', guestId: host.guestId } })
      .catch((e: unknown) => e);
    expect(isUniqueViolation(err)).toBe(true);
  });

  it('rejects a repeated ply in the same match', async () => {
    const m = await pvpMatch();
    await move(m.matchId, 1);
    expect(isUniqueViolation(await move(m.matchId, 1).catch((e: unknown) => e))).toBe(true);
  });

  it('rejects the same moveId twice in a match (idempotent SubmitMove)', async () => {
    const m = await pvpMatch();
    const moveId = randomUUID();
    await move(m.matchId, 1, moveId);
    expect(isUniqueViolation(await move(m.matchId, 2, moveId).catch((e: unknown) => e))).toBe(true);
  });

  it('requires AI side and difficulty on PVE matches', async () => {
    const g = await guest();
    await expect(
      db.match.create({
        data: { mode: 'PVE', redGuestId: g.guestId, timeControl: TC, snapshot: {}, clocks: CLOCKS },
      }),
    ).rejects.toThrow(/chk_match_pve_has_ai/);
  });

  it('deletes moves with their match (retention job, BR-20)', async () => {
    const m = await pvpMatch();
    await move(m.matchId, 1);
    await db.match.delete({ where: { matchId: m.matchId } });
    expect(await db.move.count({ where: { matchId: m.matchId } })).toBe(0);
  });
});
