import { describe, expect, it } from 'vitest';
import type { Piece, PieceType, Side } from '@xiangqi/shared';
import { createInitialPosition } from './initial-position';
import { getPiece } from './position';

const { board, turn } = createInitialPosition();
const at = (file: number, rank: number) => getPiece(board, { file, rank });
const piece = (type: PieceType, side: Side): Piece => ({ type, side });
const piecesOf = (side: Side) => board.filter((p): p is Piece => p?.side === side);

const BACK_RANK: PieceType[] = [
  'CHARIOT',
  'HORSE',
  'ELEPHANT',
  'ADVISOR',
  'GENERAL',
  'ADVISOR',
  'ELEPHANT',
  'HORSE',
  'CHARIOT',
];

describe('createInitialPosition (BR-02, BR-17)', () => {
  it('has 16 pieces per side with the standard counts', () => {
    const expected: Record<PieceType, number> = {
      GENERAL: 1,
      ADVISOR: 2,
      ELEPHANT: 2,
      HORSE: 2,
      CHARIOT: 2,
      CANNON: 2,
      SOLDIER: 5,
    };
    for (const side of ['RED', 'BLACK'] as const) {
      const pieces = piecesOf(side);
      expect(pieces).toHaveLength(16);
      for (const [type, count] of Object.entries(expected)) {
        expect(pieces.filter((p) => p.type === type)).toHaveLength(count);
      }
    }
  });

  it("puts Red's back rank on rank 0 and Black's on rank 9", () => {
    BACK_RANK.forEach((type, file) => {
      expect(at(file, 0)).toEqual(piece(type, 'RED'));
      expect(at(file, 9)).toEqual(piece(type, 'BLACK'));
    });
  });

  it('puts cannons on ranks 2 and 7 and soldiers on ranks 3 and 6', () => {
    for (const file of [1, 7]) {
      expect(at(file, 2)).toEqual(piece('CANNON', 'RED'));
      expect(at(file, 7)).toEqual(piece('CANNON', 'BLACK'));
    }
    for (const file of [0, 2, 4, 6, 8]) {
      expect(at(file, 3)).toEqual(piece('SOLDIER', 'RED'));
      expect(at(file, 6)).toEqual(piece('SOLDIER', 'BLACK'));
    }
  });

  it('lets Red move first', () => {
    expect(turn).toBe('RED');
  });
});
