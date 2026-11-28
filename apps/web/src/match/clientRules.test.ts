import { createInitialPosition, INITIAL_FEN, parseFen, stateHash } from '@xiangqi/rules';
import { describe, expect, it } from 'vitest';
import { isSideToMoveInCheck, positionFromServer, tryLocalMove } from './clientRules';

describe('tryLocalMove', () => {
  const start = createInitialPosition();

  it('applies a legal move and hands the turn to the opponent', () => {
    const move = tryLocalMove(start, 'RED', { file: 1, rank: 2 }, { file: 4, rank: 2 });

    expect(move).not.toBeNull();
    expect(move!.piece).toEqual({ side: 'RED', type: 'CANNON' });
    expect(move!.capture).toBeNull();
    expect(move!.position.turn).toBe('BLACK');
    expect(move!.position.board).not.toBe(start.board);
    expect(stateHash(move!.position)).toBe(
      stateHash(parseFen('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/4C2C1/9/RNBAKABNR b')),
    );
  });

  it('reports the captured piece', () => {
    const move = tryLocalMove(start, 'RED', { file: 1, rank: 2 }, { file: 1, rank: 9 });

    expect(move!.capture).toEqual({ side: 'BLACK', type: 'HORSE' });
  });

  it('rejects what the server would reject', () => {
    expect(tryLocalMove(start, 'RED', { file: 1, rank: 2 }, { file: 1, rank: 8 })).toBeNull();
    expect(tryLocalMove(start, 'BLACK', { file: 1, rank: 7 }, { file: 4, rank: 7 })).toBeNull();
    expect(tryLocalMove(start, 'RED', { file: 1, rank: 7 }, { file: 4, rank: 7 })).toBeNull();
    expect(tryLocalMove(start, 'RED', { file: 4, rank: 4 }, { file: 4, rank: 5 })).toBeNull();
  });

  it('flags a move that gives check', () => {
    const position = parseFen('3k5/9/9/9/9/9/9/9/9/4KR3 w');

    const move = tryLocalMove(position, 'RED', { file: 5, rank: 0 }, { file: 5, rank: 9 });

    expect(move!.givesCheck).toBe(true);
    expect(isSideToMoveInCheck(move!.position)).toBe(true);
    expect(isSideToMoveInCheck(position)).toBe(false);
  });
});

describe('positionFromServer', () => {
  it('rebuilds the board and confirms the hash matches (NFR-06)', () => {
    const hash = stateHash(createInitialPosition());

    const { position, inSync } = positionFromServer({ fen: INITIAL_FEN, stateHash: hash });

    expect(inSync).toBe(true);
    expect(position).toEqual(createInitialPosition());
  });

  it('reports divergence when the hashes differ', () => {
    expect(positionFromServer({ fen: INITIAL_FEN, stateHash: '0'.repeat(64) }).inSync).toBe(false);
  });
});
