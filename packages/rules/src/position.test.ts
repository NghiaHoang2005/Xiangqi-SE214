import { describe, expect, it } from 'vitest';
import type { Piece } from '@xiangqi/shared';
import { EMPTY_BOARD, getPiece, setPiece } from './position';

const redSoldier: Piece = { type: 'SOLDIER', side: 'RED' };
const centre = { file: 4, rank: 4 };

describe('getPiece / setPiece', () => {
  it('returns a new board and leaves the original unchanged', () => {
    const next = setPiece(EMPTY_BOARD, centre, redSoldier);
    expect(getPiece(next, centre)).toEqual(redSoldier);
    expect(getPiece(EMPTY_BOARD, centre)).toBeNull();
  });

  it('clears a square when given null', () => {
    const withSoldier = setPiece(EMPTY_BOARD, centre, redSoldier);
    expect(getPiece(setPiece(withSoldier, centre, null), centre)).toBeNull();
  });

  it('rejects squares off the board', () => {
    const offBoard = { file: 0, rank: 10 };
    expect(() => getPiece(EMPTY_BOARD, offBoard)).toThrow(RangeError);
    expect(() => setPiece(EMPTY_BOARD, offBoard, null)).toThrow(RangeError);
  });
});
