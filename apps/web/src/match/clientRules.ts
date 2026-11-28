import {
  generateLegalMoves,
  getPiece,
  isInCheck,
  parseFen,
  setPiece,
  stateHash,
  type Position,
} from '@xiangqi/rules';
import type { Piece, Side, Square } from '@xiangqi/shared';

export interface LocalMove {
  from: Square;
  to: Square;
  piece: Piece;
  capture: Piece | null;
  position: Position;
  /** Whether the side now to move is in check. */
  givesCheck: boolean;
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
  const turn = otherSide(mySide);
  return {
    from,
    to,
    piece,
    capture,
    position: { board, turn },
    givesCheck: isInCheck(board, turn),
  };
}

export function isSideToMoveInCheck(position: Position): boolean {
  return isInCheck(position.board, position.turn);
}

export interface ServerPosition {
  position: Position;
  /** False when the local hash of `fen` differs from the server's, i.e. the boards diverged (NFR-06). */
  inSync: boolean;
}

/** Rebuilds the board from a MoveAccepted payload or MatchSnapshot. */
export function positionFromServer(state: { fen: string; stateHash: string }): ServerPosition {
  const position = parseFen(state.fen);
  return { position, inSync: stateHash(position) === state.stateHash };
}
