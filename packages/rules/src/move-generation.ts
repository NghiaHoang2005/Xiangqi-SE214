import { isOnBoard, type Piece, type Square } from '@xiangqi/shared';
import { getPiece, type Board } from './position';

const ORTHOGONAL = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

function inPalace(square: Square, piece: Piece): boolean {
  return (
    square.file >= 3 &&
    square.file <= 5 &&
    (piece.side === 'RED' ? square.rank <= 2 : square.rank >= 7)
  );
}

/**
 * Generate destinations using movement, blocking and capture rules only.
 * Does not mutate the board, enforce the turn, or filter self-check / facing generals.
 * An empty source returns []; an off-board source throws like getPiece.
 */
export function generatePseudoLegalMoves(board: Board, from: Square): Square[] {
  const piece = getPiece(board, from);
  if (!piece) return [];
  const moves: Square[] = [];
  const forward = piece.side === 'RED' ? 1 : -1;
  const ownHalf = (rank: number): boolean => (piece.side === 'RED' ? rank <= 4 : rank >= 5);
  const destination = (df: number, dr: number): Square => ({
    file: from.file + df,
    rank: from.rank + dr,
  });
  const add = (to: Square): void => {
    if (isOnBoard(to) && getPiece(board, to)?.side !== piece.side) moves.push(to);
  };

  switch (piece.type) {
    case 'GENERAL':
    case 'ADVISOR': {
      const directions = piece.type === 'GENERAL' ? ORTHOGONAL : DIAGONAL;
      for (const [df, dr] of directions) {
        const to = destination(df, dr);
        if (inPalace(to, piece)) add(to);
      }
      break;
    }
    case 'ELEPHANT':
      for (const [df, dr] of DIAGONAL) {
        const to = destination(2 * df, 2 * dr);
        if (isOnBoard(to) && ownHalf(to.rank) && !getPiece(board, destination(df, dr))) {
          add(to);
        }
      }
      break;
    case 'HORSE':
      for (const [df, dr] of ORTHOGONAL) {
        const leg = destination(df, dr);
        if (!isOnBoard(leg) || getPiece(board, leg)) continue;
        for (const offset of [-1, 1]) {
          add(destination(2 * df + (dr ? offset : 0), 2 * dr + (df ? offset : 0)));
        }
      }
      break;
    case 'CHARIOT':
    case 'CANNON':
      for (const [df, dr] of ORTHOGONAL) {
        let screened = false;
        for (let distance = 1; ; distance++) {
          const to = destination(df * distance, dr * distance);
          if (!isOnBoard(to)) break;
          const target = getPiece(board, to);
          if (piece.type === 'CHARIOT') {
            add(to);
            if (target) break;
          } else if (!screened) {
            if (target) screened = true;
            else moves.push(to);
          } else if (target) {
            add(to);
            break;
          }
        }
      }
      break;
    case 'SOLDIER':
      add(destination(0, forward));
      if (!ownHalf(from.rank)) {
        add(destination(-1, 0));
        add(destination(1, 0));
      }
      break;
  }
  return moves;
}
