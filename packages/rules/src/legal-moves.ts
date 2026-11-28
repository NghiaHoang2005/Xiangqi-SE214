import type { Square } from '@xiangqi/shared';
import { isInCheck } from './check';
import { generatePseudoLegalMoves } from './move-generation';
import { getPiece, setPiece, type Board } from './position';

/**
 * Destinations for the selected piece that leave its general safe (FR-09, FR-14).
 * Independent of turn, like generatePseudoLegalMoves; callers enforce Position.turn.
 * Requires both generals. Empty sources return []; off-board sources throw.
 * Generals are checked rather than captured; mate detection is a separate concern.
 */
export function generateLegalMoves(board: Board, from: Square): Square[] {
  const piece = getPiece(board, from);
  if (!piece) return [];
  return generatePseudoLegalMoves(board, from).filter((to) => {
    if (getPiece(board, to)?.type === 'GENERAL') return false;
    const next = setPiece(setPiece(board, from, null), to, piece);
    return !isInCheck(next, piece.side);
  });
}
