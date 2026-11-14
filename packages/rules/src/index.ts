/**
 * Rules Engine cờ tướng — SRS chương 7 (BR-01..BR-17).
 * Khung ban đầu: chỉ có kích thước bàn và kiểu tọa độ.
 * Biểu diễn bàn cờ + vị trí ban đầu: US-08. Sinh nước: US-09. Chiếu/bí: US-10, US-17.
 */
import type { Side } from '@xiangqi/shared';

export const BOARD_FILES = 9; // cột
export const BOARD_RANKS = 10; // hàng

/** Giao điểm trên bàn: file 0..8 (trái→phải phía Đỏ), rank 0..9 (từ đáy phía Đỏ). */
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
