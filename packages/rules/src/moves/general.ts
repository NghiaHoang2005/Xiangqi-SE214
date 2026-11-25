import { ORTHOGONAL, palaceMoves, type MoveGenerator } from './common';

export const generalMoves: MoveGenerator = (board, from, piece) =>
  palaceMoves(board, from, piece, ORTHOGONAL);
