import type { PieceType, Square } from '@xiangqi/shared';
import { getPiece, type Board } from './position';
import type { MoveGenerator } from './moves/common';
import { generalMoves } from './moves/general';
import { advisorMoves } from './moves/advisor';
import { elephantMoves } from './moves/elephant';
import { horseMoves } from './moves/horse';
import { chariotMoves } from './moves/chariot';
import { cannonMoves } from './moves/cannon';
import { soldierMoves } from './moves/soldier';

const GENERATORS: Record<PieceType, MoveGenerator> = {
  GENERAL: generalMoves,
  ADVISOR: advisorMoves,
  ELEPHANT: elephantMoves,
  HORSE: horseMoves,
  CHARIOT: chariotMoves,
  CANNON: cannonMoves,
  SOLDIER: soldierMoves,
};

/**
 * Generate destinations using movement, blocking and capture rules only.
 * Does not mutate the board, enforce the turn, or filter self-check / facing generals.
 * An empty source returns []; an off-board source throws like getPiece.
 */
export function generatePseudoLegalMoves(board: Board, from: Square): Square[] {
  const piece = getPiece(board, from);
  return piece ? GENERATORS[piece.type](board, from, piece) : [];
}
