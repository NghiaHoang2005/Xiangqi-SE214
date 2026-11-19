/**
 * Game position and the standard starting position (US-08: BR-02, BR-17).
 */
import {
  BOARD_SIZE,
  isOnBoard,
  squareToIndex,
  type Piece,
  type Side,
  type Square,
} from '@xiangqi/shared';

/** One cell per intersection, indexed with squareToIndex. Never mutated in place. */
export type Board = readonly (Piece | null)[];

export interface Position {
  board: Board;
  /** Side to move. */
  turn: Side;
}

export const EMPTY_BOARD: Board = Array.from({ length: BOARD_SIZE }, () => null);

function assertOnBoard(square: Square): void {
  if (!isOnBoard(square)) throw new RangeError(`Square off board: ${JSON.stringify(square)}`);
}

export function getPiece(board: Board, square: Square): Piece | null {
  assertOnBoard(square);
  return board[squareToIndex(square)];
}

/** Returns a copy of `board` with `piece` (or nothing, for null) on `square`. */
export function setPiece(board: Board, square: Square, piece: Piece | null): Board {
  assertOnBoard(square);
  const next = [...board];
  next[squareToIndex(square)] = piece;
  return next;
}
