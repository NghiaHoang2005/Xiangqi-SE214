import { describe, expect, it } from 'vitest';
import { generatePseudoLegalMoves } from './index';
import { EMPTY_BOARD, setPiece } from './position';

describe('generatePseudoLegalMoves', () => {
  it('returns no moves for an empty source', () => {
    expect(generatePseudoLegalMoves(EMPTY_BOARD, { file: 4, rank: 4 })).toEqual([]);
  });
  it('rejects an off-board source', () => {
    expect(() => generatePseudoLegalMoves(EMPTY_BOARD, { file: -1, rank: 0 })).toThrow(RangeError);
  });
  it('leaves self-check and facing generals to legal-move validation', () => {
    let board = setPiece(EMPTY_BOARD, { file: 4, rank: 0 }, { type: 'GENERAL', side: 'RED' });
    board = setPiece(board, { file: 4, rank: 9 }, { type: 'GENERAL', side: 'BLACK' });
    const before = [...board];
    expect(generatePseudoLegalMoves(board, { file: 4, rank: 0 })).toContainEqual({
      file: 4,
      rank: 1,
    });
    expect(board).toEqual(before);
  });
});
