import { slidingMoves, type MoveGenerator } from './common';

export const chariotMoves: MoveGenerator = (board, from, piece) =>
  slidingMoves(board, from, piece, 0);
