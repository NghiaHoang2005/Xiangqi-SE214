/**
 * Xiangqi Rules Engine — SRS chapter 7 (BR-01..BR-17).
 * Initial skeleton: board size and coordinate types only.
 * Board model + initial position: US-08. Move generation: US-09. Check/mate: US-10, US-17.
 */
import type { Side } from '@xiangqi/shared';

export const BOARD_FILES = 9; // columns
export const BOARD_RANKS = 10; // rows

/** Board intersection: file 0..8 (left to right from Red's side), rank 0..9 (from Red's back rank). */
export interface Square {
  file: number;
  rank: number;
}

export type PieceType =
  | 'GENERAL'
  | 'ADVISOR'
  | 'ELEPHANT'
  | 'HORSE'
  | 'CHARIOT'
  | 'CANNON'
  | 'SOLDIER';

export interface Piece {
  type: PieceType;
  side: Side;
}

export function isOnBoard({ file, rank }: Square): boolean {
  return file >= 0 && file < BOARD_FILES && rank >= 0 && rank < BOARD_RANKS;
}
