import { DIAGONAL, palaceMoves, type MoveGenerator } from './common';

export const advisorMoves: MoveGenerator = (board, from, piece) =>
  palaceMoves(board, from, piece, DIAGONAL);
