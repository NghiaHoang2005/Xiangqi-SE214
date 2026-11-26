import type { Square } from '@xiangqi/shared';
import { add, destination, ownHalf, type MoveGenerator } from './common';

export const soldierMoves: MoveGenerator = (board, from, piece) => {
  const moves: Square[] = [];
  add(board, piece, moves, destination(from, 0, piece.side === 'RED' ? 1 : -1));
  if (!ownHalf(from.rank, piece.side)) {
    add(board, piece, moves, destination(from, -1, 0));
    add(board, piece, moves, destination(from, 1, 0));
  }
  return moves;
};
