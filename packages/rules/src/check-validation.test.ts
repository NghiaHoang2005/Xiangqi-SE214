import { describe, expect, it } from 'vitest';
import { indexToSquare, type PieceType, type Side, type Square } from '@xiangqi/shared';
import { areGeneralsFacing, generateLegalMoves, isInCheck } from './index';
import { generatePseudoLegalMoves } from './move-generation';
import { createInitialPosition } from './initial-position';
import { EMPTY_BOARD, getPiece, setPiece, type Board } from './position';

type Placement = readonly [number, number, PieceType, Side];

describe.each(['RED', 'BLACK'] as const)('check validation (%s)', (side) => {
  const opponent = side === 'RED' ? 'BLACK' : 'RED';
  const square = (file: number, rank: number): Square => ({
    file,
    rank: side === 'RED' ? rank : 9 - rank,
  });
  const boardWith = (...placements: Placement[]): Board => {
    let board = setPiece(EMPTY_BOARD, square(4, 0), { type: 'GENERAL', side });
    board = setPiece(board, square(3, 9), { type: 'GENERAL', side: opponent });
    for (const [file, rank, type, owner] of placements) {
      board = setPiece(board, square(file, rank), { type, side: owner });
    }
    return board;
  };

  describe('isInCheck', () => {
    it('reports a safe general and ignores friendly attacks', () => {
      expect(isInCheck(boardWith([4, 3, 'CHARIOT', side]), side)).toBe(false);
    });
    it('detects a chariot attack and respects blockers of either color', () => {
      expect(isInCheck(boardWith([4, 5, 'CHARIOT', opponent]), side)).toBe(true);
      for (const owner of [side, opponent] as const) {
        expect(
          isInCheck(boardWith([4, 5, 'CHARIOT', opponent], [4, 2, 'SOLDIER', owner]), side),
        ).toBe(false);
      }
    });
    it('detects a cannon attack only with exactly one screen', () => {
      for (const owner of [side, opponent] as const) {
        expect(
          isInCheck(boardWith([4, 5, 'CANNON', opponent], [4, 2, 'SOLDIER', owner]), side),
        ).toBe(true);
      }
      expect(isInCheck(boardWith([4, 5, 'CANNON', opponent]), side)).toBe(false);
      expect(
        isInCheck(
          boardWith([4, 5, 'CANNON', opponent], [4, 2, 'SOLDIER', side], [4, 3, 'SOLDIER', side]),
          side,
        ),
      ).toBe(false);
    });
    it('detects a horse attack unless its leg is blocked', () => {
      expect(isInCheck(boardWith([3, 2, 'HORSE', opponent]), side)).toBe(true);
      expect(isInCheck(boardWith([3, 2, 'HORSE', opponent], [3, 1, 'SOLDIER', side]), side)).toBe(
        false,
      );
    });
    it('detects forward and sideways soldier attacks, but not backward attacks', () => {
      expect(isInCheck(boardWith([4, 1, 'SOLDIER', opponent]), side)).toBe(true);
      expect(isInCheck(boardWith([3, 0, 'SOLDIER', opponent]), side)).toBe(true);
      let board = boardWith([4, 0, 'SOLDIER', opponent]);
      board = setPiece(board, square(4, 1), { type: 'GENERAL', side });
      expect(isInCheck(board, side)).toBe(false);
    });
    it('checks the requested side independently of the other side', () => {
      const board = boardWith([3, 5, 'CHARIOT', side]);
      expect(isInCheck(board, side)).toBe(false);
      expect(isInCheck(board, opponent)).toBe(true);
    });
    it('does not mutate the board', () => {
      const board = boardWith([4, 5, 'CHARIOT', opponent]);
      const before = structuredClone(board);
      isInCheck(board, side);
      expect(board).toEqual(before);
    });
  });

  describe('facing generals', () => {
    const facingBoard = (): Board => {
      let board = setPiece(boardWith(), square(3, 9), null);
      board = setPiece(board, square(4, 9), { type: 'GENERAL', side: opponent });
      return board;
    };
    it('detects an open file and marks both sides in check', () => {
      const board = facingBoard();
      expect(areGeneralsFacing(board)).toBe(true);
      expect(isInCheck(board, side)).toBe(true);
      expect(isInCheck(board, opponent)).toBe(true);
    });
    it('accepts a blocker anywhere between the generals', () => {
      for (let rank = 1; rank < 9; rank++) {
        const board = setPiece(facingBoard(), square(4, rank), { type: 'CHARIOT', side });
        expect(areGeneralsFacing(board)).toBe(false);
      }
      expect(areGeneralsFacing(boardWith())).toBe(false);
    });
    it('rejects moving the last blocker sideways but permits moving along the file', () => {
      const board = setPiece(facingBoard(), square(4, 5), { type: 'CHARIOT', side });
      expect(generateLegalMoves(board, square(4, 5)).sort((a, b) => a.rank - b.rank)).toEqual(
        Array.from({ length: 8 }, (_, i) => i + 1)
          .filter((rank) => rank !== 5)
          .map((rank) => square(4, rank))
          .sort((a, b) => a.rank - b.rank),
      );
    });
    it('rejects a general stepping onto the opposing general file', () => {
      let board = setPiece(boardWith(), square(3, 9), null);
      board = setPiece(board, square(5, 9), { type: 'GENERAL', side: opponent });
      expect(generatePseudoLegalMoves(board, square(4, 0))).toContainEqual(square(5, 0));
      expect(generateLegalMoves(board, square(4, 0))).not.toContainEqual(square(5, 0));
    });
  });

  describe('generateLegalMoves', () => {
    it('retains all pseudo-legal moves when the general remains safe', () => {
      const board = boardWith([0, 3, 'SOLDIER', side]);
      expect(generateLegalMoves(board, square(0, 3))).toEqual(
        generatePseudoLegalMoves(board, square(0, 3)),
      );
    });
    it('rejects moving a pinned piece away and permits capturing the attacker', () => {
      const board = boardWith([4, 5, 'CHARIOT', opponent], [4, 2, 'CHARIOT', side]);
      const moves = generateLegalMoves(board, square(4, 2));
      expect(moves).not.toContainEqual(square(5, 2));
      expect(moves).toContainEqual(square(4, 5));
      expect(moves).toContainEqual(square(4, 3));
    });
    it('permits blocking a check and rejects unrelated moves', () => {
      const board = boardWith([4, 5, 'CHARIOT', opponent], [0, 2, 'CHARIOT', side]);
      expect(generateLegalMoves(board, square(0, 2))).toEqual([square(4, 2)]);
    });
    it('rejects a general moving into an attacked square', () => {
      const board = boardWith([5, 5, 'CHARIOT', opponent]);
      expect(generateLegalMoves(board, square(4, 0))).not.toContainEqual(square(5, 0));
      expect(generateLegalMoves(board, square(4, 0))).toContainEqual(square(4, 1));
    });
    it('allows a general to escape check or capture an undefended checking piece', () => {
      const board = boardWith([4, 1, 'CHARIOT', opponent]);
      expect(generateLegalMoves(board, square(4, 0))).toEqual([square(5, 0), square(4, 1)]);
    });
    it('re-evaluates cannon screens after a move removes one of two blockers', () => {
      const board = boardWith(
        [4, 5, 'CANNON', opponent],
        [4, 2, 'CHARIOT', side],
        [4, 3, 'SOLDIER', side],
      );
      expect(isInCheck(board, side)).toBe(false);
      expect(generateLegalMoves(board, square(4, 2))).not.toContainEqual(square(5, 2));
    });
    it('permits removing the sole cannon screen to escape check', () => {
      const board = boardWith([4, 5, 'CANNON', opponent], [4, 2, 'CHARIOT', side]);
      expect(isInCheck(board, side)).toBe(true);
      expect(generateLegalMoves(board, square(4, 2))).toContainEqual(square(5, 2));
    });
    it('rejects a capture that exposes a defended square to the general', () => {
      const board = boardWith([4, 1, 'CHARIOT', opponent], [4, 5, 'CHARIOT', opponent]);
      expect(generateLegalMoves(board, square(4, 0))).not.toContainEqual(square(4, 1));
    });
    it('returns no moves for an empty source and rejects an off-board source', () => {
      expect(generateLegalMoves(boardWith(), square(0, 0))).toEqual([]);
      expect(() => generateLegalMoves(boardWith(), { file: -1, rank: 0 })).toThrow(RangeError);
    });
    it('does not mutate the input board or pieces while simulating captures', () => {
      const board = boardWith([4, 1, 'CHARIOT', opponent]);
      const before = structuredClone(board);
      board.forEach((piece) => {
        if (piece) Object.freeze(piece);
      });
      Object.freeze(board);
      generateLegalMoves(board, square(4, 0));
      expect(board).toEqual(before);
    });
  });
});

describe('check validation preconditions and initial position', () => {
  it('rejects positions missing either general', () => {
    expect(() => isInCheck(EMPTY_BOARD, 'RED')).toThrow('Missing RED general');
    const board = setPiece(EMPTY_BOARD, { file: 4, rank: 0 }, { type: 'GENERAL', side: 'RED' });
    expect(() => isInCheck(board, 'RED')).toThrow('Missing BLACK general');
  });
  it('has no checks and all 44 initial moves per side remain legal', () => {
    const { board } = createInitialPosition();
    for (const side of ['RED', 'BLACK'] as const) {
      expect(isInCheck(board, side)).toBe(false);
      let count = 0;
      board.forEach((piece, index) => {
        if (piece?.side !== side) return;
        const from = indexToSquare(index);
        const moves = generateLegalMoves(board, from);
        expect(moves).toEqual(generatePseudoLegalMoves(board, from));
        for (const to of moves) {
          const next = setPiece(setPiece(board, from, null), to, getPiece(board, from));
          expect(isInCheck(next, side)).toBe(false);
        }
        count += moves.length;
      });
      expect(count).toBe(44);
    }
  });
});
