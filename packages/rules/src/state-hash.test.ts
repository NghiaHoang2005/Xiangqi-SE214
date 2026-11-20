import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { INITIAL_FEN, createInitialPosition } from './initial-position';
import { setPiece } from './position';
import { stateHash } from './state-hash';

describe('stateHash', () => {
  const start = createInitialPosition();

  it('is the SHA-256 hex of the FEN (64 chars, fits Move.state_hash)', () => {
    const expected = createHash('sha256').update(INITIAL_FEN).digest('hex');
    expect(stateHash(start)).toBe(expected);
    expect(stateHash(start)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is the same for equal positions', () => {
    expect(stateHash(createInitialPosition())).toBe(stateHash(start));
  });

  it('changes when the side to move changes', () => {
    expect(stateHash({ ...start, turn: 'BLACK' })).not.toBe(stateHash(start));
  });

  it('changes when a piece moves', () => {
    const cannon = { type: 'CANNON', side: 'RED' } as const;
    const board = setPiece(
      setPiece(start.board, { file: 1, rank: 2 }, null),
      { file: 4, rank: 2 },
      cannon,
    );
    expect(stateHash({ ...start, board })).not.toBe(stateHash(start));
  });
});
