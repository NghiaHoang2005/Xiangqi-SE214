import { generateLegalMoves, getPiece, type Board } from '@xiangqi/rules';
import type { Side, Square } from '@xiangqi/shared';

export function isSameSquare(a: Square | null | undefined, b: Square | null | undefined): boolean {
  if (!a || !b) return false;
  return a.file === b.file && a.rank === b.rank;
}

export function squareKey(square: Square): string {
  return `${square.file}-${square.rank}`;
}

/**
 * Resolves the next selected square when the user clicks a board square (US-19 / SCRUM-157).
 * Enforces FR-08: only the current player's own pieces can be selected, and only on their turn.
 * Clicking the selected piece again deselects it; clicking another friendly piece switches selection;
 * clicking an empty square or opponent piece clears the selection.
 */
export function resolvePieceSelection(params: {
  board: Board;
  turn: Side;
  mySide: Side;
  selectedSquare: Square | null;
  clickedSquare: Square;
}): Square | null {
  const { board, turn, mySide, selectedSquare, clickedSquare } = params;
  if (turn !== mySide) return null;

  if (isSameSquare(selectedSquare, clickedSquare)) {
    return null;
  }

  const piece = getPiece(board, clickedSquare);
  if (piece && piece.side === mySide) {
    return clickedSquare;
  }

  return null;
}

/**
 * Computes legal destinations from the shared @xiangqi/rules engine (FR-08, NFR-01).
 * Re-checks turn and piece ownership because generateLegalMoves itself is turn-agnostic.
 */
export function getLegalMovesForSelection(params: {
  board: Board;
  turn: Side;
  mySide: Side;
  selectedSquare: Square | null;
}): Square[] {
  const { board, turn, mySide, selectedSquare } = params;
  if (!selectedSquare || turn !== mySide) return [];

  const piece = getPiece(board, selectedSquare);
  if (!piece || piece.side !== mySide) return [];

  return generateLegalMoves(board, selectedSquare);
}
