/**
 * Xiangqi Rules Engine — SRS chapter 7 (BR-01..BR-17).
 * Board model + initial position: US-08. Move generation: US-09. Check/mate: US-10, US-17.
 */

// The coordinate system moved to @xiangqi/shared (US-08); re-exported so existing imports keep working.
export {
  BOARD_FILES,
  BOARD_RANKS,
  isOnBoard,
  type Piece,
  type PieceType,
  type Square,
} from '@xiangqi/shared';

export * from './fen';
export * from './initial-position';
export * from './position';
export * from './state-hash';
