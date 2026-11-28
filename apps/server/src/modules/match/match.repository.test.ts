import type { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasTestDb, resetTestDatabase } from '../../test/test-db';
import { MatchRepository, type AcceptedMove, type MoveSubmission } from './match.repository';

const TC = { initialMinutes: 10, incrementSeconds: 5 };
const CLOCKS = { redMs: 600_000, blackMs: 600_000, turnStartedAt: null };
const AFTER = { redMs: 599_000, blackMs: 600_000, turnStartedAt: null };

const accept = (overrides: Partial<AcceptedMove> = {}): AcceptedMove => ({
  kind: 'accept',
  capture: null,
  snapshot: { ply: 1 },
  fen: 'fen-after',
  stateHash: 'b'.repeat(64),
  checkState: 'NONE',
  clocks: AFTER,
  turn: 'BLACK',
  ...overrides,
});

describe.skipIf(!hasTestDb)('MatchRepository.commitMove (SRS 3.3)', () => {
  let db: PrismaClient;
  let repository: MatchRepository;

  beforeAll(async () => {
    db = await resetTestDatabase();
    repository = new MatchRepository(db);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  const guest = () =>
    db.guestSession.create({
      data: {
        reconnectTokenHash: randomBytes(32).toString('hex'),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

  async function pvpMatch() {
    const [red, black] = [await guest(), await guest()];
    return db.match.create({
      data: {
        mode: 'PVP',
        redGuestId: red.guestId,
        blackGuestId: black.guestId,
        timeControl: TC,
        snapshot: { ply: 0 },
        clocks: CLOCKS,
      },
    });
  }

  const submission = (guestId: string | null): MoveSubmission => ({
    moveId: randomUUID(),
    actorType: 'HUMAN',
    guestId,
    from: { file: 1, rank: 0 },
    to: { file: 2, rank: 2 },
  });

  const moves = (matchId: string) => db.move.count({ where: { matchId } });

  it('commits the move with the Ack fields and bumps the match version', async () => {
    const match = await pvpMatch();
    const capture = { type: 'SOLDIER', side: 'BLACK' } as const;
    const result = await repository.commitMove(match.matchId, 0, submission(match.redGuestId), () =>
      accept({ capture, checkState: 'CHECK' }),
    );

    expect(result).toMatchObject({ status: 'accepted', replayed: false });
    if (result.status !== 'accepted') return;
    expect(result.move).toMatchObject({
      ply: 1,
      version: 1,
      fen: 'fen-after',
      checkState: 'CHECK',
      capture,
      clockAfter: AFTER,
    });
    expect(result.match).toMatchObject({
      version: 1,
      turn: 'BLACK',
      snapshot: { ply: 1 },
      clocks: AFTER,
      status: 'IN_PROGRESS',
    });
  });

  it('serializes duplicate and competing submissions against the same version', async () => {
    const match = await pvpMatch();
    const move = submission(match.redGuestId);
    const submit = () => repository.commitMove(match.matchId, 0, move, () => accept());

    const repeated = await Promise.all([submit(), submit()]);
    expect(repeated.map((r) => r.status)).toEqual(['accepted', 'accepted']);
    expect(repeated.map((r) => r.status === 'accepted' && r.replayed).sort()).toEqual([
      false,
      true,
    ]);

    const competing = await repository.commitMove(
      match.matchId,
      0,
      submission(match.redGuestId),
      () => accept(),
    );
    expect(competing).toMatchObject({
      status: 'rejected',
      code: 'STALE_STATE',
      match: { version: 1 },
    });
    expect(await moves(match.matchId)).toBe(1);
  });

  it('rejects a reused moveId that carries another move', async () => {
    const match = await pvpMatch();
    const move = submission(match.redGuestId);
    await repository.commitMove(match.matchId, 0, move, () => accept());

    await expect(
      repository.commitMove(match.matchId, 1, { ...move, to: { file: 0, rank: 2 } }, () =>
        accept(),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', details: { field: 'moveId' } });
    expect(await moves(match.matchId)).toBe(1);
  });

  it('returns a reducer refusal with the unchanged match and stores nothing', async () => {
    const match = await pvpMatch();
    const result = await repository.commitMove(
      match.matchId,
      0,
      submission(match.redGuestId),
      () => ({ kind: 'reject', code: 'MOVE_ILLEGAL' }),
    );

    expect(result).toMatchObject({
      status: 'rejected',
      code: 'MOVE_ILLEGAL',
      match: { version: 0, status: 'IN_PROGRESS' },
    });
    expect(await moves(match.matchId)).toBe(0);
  });

  it('stores a timeout found while refusing a late move (FR-18)', async () => {
    const match = await pvpMatch();
    const flagged = { redMs: 0, blackMs: 600_000, turnStartedAt: null };
    const result = await repository.commitMove(
      match.matchId,
      0,
      submission(match.redGuestId),
      () => ({
        kind: 'reject',
        code: 'GAME_FINISHED',
        end: { winner: 'BLACK', endReason: 'TIMEOUT', clocks: flagged },
      }),
    );

    expect(result).toMatchObject({
      status: 'rejected',
      code: 'GAME_FINISHED',
      match: { status: 'FINISHED', winner: 'BLACK', endReason: 'TIMEOUT', version: 1 },
    });
    const stored = await db.match.findUniqueOrThrow({ where: { matchId: match.matchId } });
    expect(stored).toMatchObject({ status: 'FINISHED', endReason: 'TIMEOUT', clocks: flagged });
    expect(stored.endedAt).toBeInstanceOf(Date);
    expect(await moves(match.matchId)).toBe(0);
  });

  it('finishes the match on a game-ending move and refuses later moves, but still replays', async () => {
    const match = await pvpMatch();
    const mate = submission(match.redGuestId);
    const result = await repository.commitMove(match.matchId, 0, mate, () =>
      accept({ checkState: 'CHECKMATE', end: { winner: 'RED', endReason: 'CHECKMATE' } }),
    );
    expect(result).toMatchObject({
      status: 'accepted',
      match: { status: 'FINISHED', winner: 'RED', endReason: 'CHECKMATE', version: 1 },
    });

    let decided = false;
    const late = await repository.commitMove(
      match.matchId,
      1,
      submission(match.blackGuestId),
      () => {
        decided = true;
        return accept();
      },
    );
    expect(late).toMatchObject({ status: 'rejected', code: 'GAME_FINISHED' });
    expect(decided).toBe(false);

    const retry = await repository.commitMove(match.matchId, 0, mate, () => accept());
    expect(retry).toMatchObject({ status: 'accepted', replayed: true, move: { version: 1 } });
  });

  it('answers NOT_FOUND for a malformed or unknown match id', async () => {
    const move = submission(null);
    await expect(repository.commitMove('nope', 0, move, () => accept())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      repository.commitMove(randomUUID(), 0, move, () => accept()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
