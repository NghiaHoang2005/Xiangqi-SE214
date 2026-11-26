import { expect } from 'vitest';
import type { PieceType, Side, Square } from '@xiangqi/shared';
import { EMPTY_BOARD, setPiece } from './position';
import { generatePseudoLegalMoves } from './move-generation';

export type Coordinate = readonly [number, number];
export type Occupant = readonly [number, number, 'friend' | 'enemy'];

/** Fixtures are described from Red's perspective and mirrored for Black. */
export function movesFor(
  type: PieceType,
  side: Side,
  source: Coordinate,
  occupants: Occupant[] = [],
) {
  const square = ([file, rank]: Coordinate): Square => ({
    file,
    rank: side === 'RED' ? rank : 9 - rank,
  });
  let board = setPiece(EMPTY_BOARD, square(source), { type, side });
  for (const [file, rank, relation] of occupants) {
    board = setPiece(board, square([file, rank]), {
      type: 'SOLDIER',
      side: relation === 'friend' ? side : side === 'RED' ? 'BLACK' : 'RED',
    });
  }
  const before = [...board];
  const moves = generatePseudoLegalMoves(board, square(source));
  expect(board).toEqual(before);
  const result = moves.map(({ file, rank }) => `${file},${side === 'RED' ? rank : 9 - rank}`);
  expect(new Set(result).size).toBe(result.length);
  return result.sort();
}

export function destinations(...coordinates: Coordinate[]): string[] {
  return coordinates.map(([file, rank]) => `${file},${rank}`).sort();
}
