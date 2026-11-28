import { indexToSquare, type Side, type Square } from '@xiangqi/shared';
import { generatePseudoLegalMoves } from './move-generation';
import { getPiece, type Board } from './position';

function findGeneral(board: Board, side: Side): Square {
  const index = board.findIndex((piece) => piece?.type === 'GENERAL' && piece.side === side);
  if (index === -1) throw new Error(`Missing ${side} general`);
  return indexToSquare(index);
}

/** Whether the generals share a file with no intervening piece (BR-03). */
export function areGeneralsFacing(board: Board): boolean {
  const red = findGeneral(board, 'RED');
  const black = findGeneral(board, 'BLACK');
  if (red.file !== black.file) return false;
  const start = Math.min(red.rank, black.rank) + 1;
  const end = Math.max(red.rank, black.rank);
  for (let rank = start; rank < end; rank++) {
    if (getPiece(board, { file: red.file, rank })) return false;
  }
  return true;
}

/**
 * Whether side's general is attacked, including facing generals (BR-03, BR-11).
 * Independent of whose turn it is. Requires both generals on the board.
 * Uses enemy pseudo-legal attacks to avoid recursive legal-move generation.
 */
export function isInCheck(board: Board, side: Side): boolean {
  const general = findGeneral(board, side);
  if (areGeneralsFacing(board)) return true;
  return board.some((piece, index) => {
    if (!piece || piece.side === side) return false;
    return generatePseudoLegalMoves(board, indexToSquare(index)).some(
      (to) => to.file === general.file && to.rank === general.rank,
    );
  });
}
