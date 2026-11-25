import { isOnBoard, type Piece, type Side, type Square } from '@xiangqi/shared';
import { getPiece, type Board } from '../position';

export type MoveGenerator = (board: Board, from: Square, piece: Piece) => Square[];
type Direction = readonly [number, number];

export const ORTHOGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
export const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

export function destination(from: Square, df: number, dr: number): Square {
  return { file: from.file + df, rank: from.rank + dr };
}

export function inPalace(square: Square, side: Side): boolean {
  return (
    square.file >= 3 && square.file <= 5 && (side === 'RED' ? square.rank <= 2 : square.rank >= 7)
  );
}

export function ownHalf(rank: number, side: Side): boolean {
  return side === 'RED' ? rank <= 4 : rank >= 5;
}

export function add(board: Board, piece: Piece, moves: Square[], to: Square): void {
  if (isOnBoard(to) && getPiece(board, to)?.side !== piece.side) moves.push(to);
}

/** Shared one-step palace movement for generals and advisors. */
export function palaceMoves(
  board: Board,
  from: Square,
  piece: Piece,
  directions: readonly Direction[],
): Square[] {
  const moves: Square[] = [];
  for (const [df, dr] of directions) {
    const to = destination(from, df, dr);
    if (inPalace(to, piece.side)) add(board, piece, moves, to);
  }
  return moves;
}

/** One outward ray at a time, preserving the public move ordering. */
export function* rays(from: Square): Generator<Square[]> {
  for (const [df, dr] of ORTHOGONAL) {
    const ray: Square[] = [];
    for (let distance = 1; ; distance++) {
      const to = destination(from, df * distance, dr * distance);
      if (!isOnBoard(to)) break;
      ray.push(to);
    }
    yield ray;
  }
}

/** Chariots capture at the first obstacle; cannons capture after one screen. */
export function slidingMoves(
  board: Board,
  from: Square,
  piece: Piece,
  captureScreens: 0 | 1,
): Square[] {
  const moves: Square[] = [];
  for (const ray of rays(from)) {
    let screens = 0;
    for (const to of ray) {
      const target = getPiece(board, to);
      if (!target) {
        if (screens === 0) moves.push(to);
      } else if (screens === captureScreens) {
        add(board, piece, moves, to);
        break;
      } else {
        screens++;
      }
    }
  }
  return moves;
}
