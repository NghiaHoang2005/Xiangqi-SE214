import {
  generateLegalMoves,
  getPiece,
  isInCheck,
  InvalidFenError,
  parseFen,
  setPiece,
  stateHash,
  type Board,
  type Position,
} from '@xiangqi/rules';
import type { Piece, Side, Square } from '@xiangqi/shared';

export interface LocalMove {
  from: Square;
  to: Square;
  piece: Piece;
  capture: Piece | null;
  position: Position;
}

const otherSide = (side: Side): Side => (side === 'RED' ? 'BLACK' : 'RED');

/**
 * Plays `from → to` for `mySide` with the shared Rules Engine, the same check the server runs.
 * Returns null for anything the server would reject, so an illegal move is never sent (FR-08).
 */
export function tryLocalMove(
  position: Position,
  mySide: Side,
  from: Square,
  to: Square,
): LocalMove | null {
  if (position.turn !== mySide) return null;
  const piece = getPiece(position.board, from);
  if (!piece || piece.side !== mySide) return null;
  if (
    !generateLegalMoves(position.board, from).some((s) => s.file === to.file && s.rank === to.rank)
  ) {
    return null;
  }

  const capture = getPiece(position.board, to);
  const board = setPiece(setPiece(position.board, from, null), to, piece);
  return { from, to, piece, capture, position: { board, turn: otherSide(mySide) } };
}

export function isSideToMoveInCheck(position: Position): boolean {
  return isInCheck(position.board, position.turn);
}

export type ServerPosition =
  | { position: Position; inSync: boolean }
  /** The server state could not be read; resync from a snapshot instead (NFR-06). */
  | { position: null; inSync: false };

const hasGeneral = (board: Board, side: Side) =>
  board.some((piece) => piece?.type === 'GENERAL' && piece.side === side);

/**
 * Rebuilds the board from a MoveAccepted payload or MatchSnapshot. `inSync` is false when the
 * local hash differs from the server's, i.e. the boards diverged (NFR-06).
 */
export function positionFromServer(state: { fen: string; stateHash: string }): ServerPosition {
  let position: Position;
  try {
    position = parseFen(state.fen);
  } catch (error) {
    if (error instanceof InvalidFenError) return { position: null, inSync: false };
    throw error;
  }
  // The check and move helpers throw on a board without both generals.
  if (!hasGeneral(position.board, 'RED') || !hasGeneral(position.board, 'BLACK')) {
    return { position: null, inSync: false };
  }
  return { position, inSync: stateHash(position) === state.stateHash };
}
