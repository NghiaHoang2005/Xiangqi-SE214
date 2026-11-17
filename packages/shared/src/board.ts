/**
 * Board coordinate system shared by FE and BE (US-08, BR-01).
 *
 * The board has 9 files (columns) and 10 ranks (rows) of intersections, always seen from Red:
 * - file 0..8 runs left to right,
 * - rank 0..9 runs from Red's back rank (rank 0) to Black's back rank (rank 9).
 * The web app flips the drawing when the player is Black; coordinates never flip.
 */
import type { Side } from './constants';

export const BOARD_FILES = 9;
export const BOARD_RANKS = 10;
export const BOARD_SIZE = BOARD_FILES * BOARD_RANKS;

/** Board intersection. Also the shape of Move.from_square / to_square in the database. */
export interface Square {
  file: number;
  rank: number;
}

export const PIECE_TYPES = [
  'GENERAL',
  'ADVISOR',
  'ELEPHANT',
  'HORSE',
  'CHARIOT',
  'CANNON',
  'SOLDIER',
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export interface Piece {
  type: PieceType;
  side: Side;
}

const isIntegerInRange = (value: number, size: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < size;

export function isOnBoard({ file, rank }: Square): boolean {
  return isIntegerInRange(file, BOARD_FILES) && isIntegerInRange(rank, BOARD_RANKS);
}

/** Position of a square in a flat 90-cell board array (rank by rank, from Red's back rank). */
export function squareToIndex({ file, rank }: Square): number {
  return rank * BOARD_FILES + file;
}

export function indexToSquare(index: number): Square {
  return { file: index % BOARD_FILES, rank: Math.floor(index / BOARD_FILES) };
}
