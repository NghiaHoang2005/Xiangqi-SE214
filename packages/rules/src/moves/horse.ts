import { isOnBoard, type Square } from '@xiangqi/shared';
import { getPiece } from '../position';
import { add, destination, ORTHOGONAL, type MoveGenerator } from './common';

export const horseMoves: MoveGenerator = (board, from, piece) => {
  const moves: Square[] = [];
  for (const [df, dr] of ORTHOGONAL) {
    const leg = destination(from, df, dr);
    if (!isOnBoard(leg) || getPiece(board, leg)) continue;
    for (const offset of [-1, 1]) {
      add(
        board,
        piece,
        moves,
        destination(from, 2 * df + (dr ? offset : 0), 2 * dr + (df ? offset : 0)),
      );
    }
  }
  return moves;
};
