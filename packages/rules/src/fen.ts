/**
 * Position <-> FEN, the format stored in Match.snapshot (US-08).
 *
 * Standard xiangqi FEN, e.g. "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w":
 * - ranks from Black's back rank (rank 9) down to Red's (rank 0), separated by "/",
 * - upper case is Red, lower case is Black, a digit counts empty intersections,
 * - then the side to move: "w" for Red, "b" for Black.
 * Any fields after the side to move (move counters) are ignored.
 */
import {
  BOARD_FILES,
  BOARD_RANKS,
  PIECE_TYPES,
  squareToIndex,
  type Piece,
  type PieceType,
  type Side,
} from '@xiangqi/shared';
import type { Board, Position } from './position';

const LETTER_BY_TYPE: Record<PieceType, string> = {
  GENERAL: 'k',
  ADVISOR: 'a',
  ELEPHANT: 'b',
  HORSE: 'n',
  CHARIOT: 'r',
  CANNON: 'c',
  SOLDIER: 'p',
};
const TYPE_BY_LETTER = new Map(PIECE_TYPES.map((type) => [LETTER_BY_TYPE[type], type]));

const TURN_BY_SIDE: Record<Side, string> = { RED: 'w', BLACK: 'b' };

export class InvalidFenError extends Error {
  constructor(reason: string) {
    super(`Invalid FEN: ${reason}`);
    this.name = 'InvalidFenError';
  }
}

export function toFen({ board, turn }: Position): string {
  const ranks: string[] = [];
  for (let rank = BOARD_RANKS - 1; rank >= 0; rank--) ranks.push(rankToFen(board, rank));
  return `${ranks.join('/')} ${TURN_BY_SIDE[turn]}`;
}

/** Throws InvalidFenError if the board or the side to move is malformed. */
export function parseFen(fen: string): Position {
  const [placement = '', turn = ''] = fen.trim().split(/\s+/);
  const rows = placement.split('/');
  if (rows.length !== BOARD_RANKS) {
    throw new InvalidFenError(`expected ${BOARD_RANKS} ranks, got ${rows.length}`);
  }
  // FEN lists rank 9 first; the board array starts at rank 0.
  const board = rows.reverse().flatMap((row, rank) => parseRank(row, rank));
  return { board, turn: parseTurn(turn) };
}

function rankToFen(board: Board, rank: number): string {
  let fen = '';
  let emptyRun = 0;
  for (let file = 0; file < BOARD_FILES; file++) {
    const piece = board[squareToIndex({ file, rank })];
    if (!piece) {
      emptyRun++;
      continue;
    }
    fen += (emptyRun || '') + pieceToLetter(piece);
    emptyRun = 0;
  }
  return fen + (emptyRun || '');
}

function parseRank(row: string, rank: number): (Piece | null)[] {
  const cells: (Piece | null)[] = [];
  for (const char of row) {
    if (char >= '1' && char <= '9') {
      cells.push(...Array.from({ length: Number(char) }, () => null));
    } else {
      cells.push(letterToPiece(char));
    }
  }
  if (cells.length !== BOARD_FILES) {
    throw new InvalidFenError(`rank ${rank} has ${cells.length} files, expected ${BOARD_FILES}`);
  }
  return cells;
}

function parseTurn(turn: string): Side {
  if (turn === TURN_BY_SIDE.RED) return 'RED';
  if (turn === TURN_BY_SIDE.BLACK) return 'BLACK';
  throw new InvalidFenError(`side to move must be "w" or "b", got "${turn}"`);
}

function pieceToLetter({ type, side }: Piece): string {
  const letter = LETTER_BY_TYPE[type];
  return side === 'RED' ? letter.toUpperCase() : letter;
}

function letterToPiece(letter: string): Piece {
  const type = TYPE_BY_LETTER.get(letter.toLowerCase());
  if (!type) throw new InvalidFenError(`unknown piece "${letter}"`);
  return { type, side: letter === letter.toUpperCase() ? 'RED' : 'BLACK' };
}
