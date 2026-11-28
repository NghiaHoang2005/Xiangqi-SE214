import { slidingMoves, type MoveGenerator } from './common';

export const cannonMoves: MoveGenerator = (board, from, piece) =>
  slidingMoves(board, from, piece, 1);
