import { isOnBoard, type Square } from '@xiangqi/shared';
import { getPiece } from '../position';
import { add, destination, DIAGONAL, ownHalf, type MoveGenerator } from './common';

export const elephantMoves: MoveGenerator = (board, from, piece) => {
  const moves: Square[] = [];
  for (const [df, dr] of DIAGONAL) {
    const to = destination(from, 2 * df, 2 * dr);
    if (
      isOnBoard(to) &&
      ownHalf(to.rank, piece.side) &&
      !getPiece(board, destination(from, df, dr))
    ) {
      add(board, piece, moves, to);
    }
  }
  return moves;
};
