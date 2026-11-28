import type { Piece, Square } from './board';
import type { Side } from './constants';
import type { ActorType, MatchStatus } from './domain';
import type { ApiError, ErrorCode } from './errors';
import type { RequestEnvelope } from './events';

export const CHECK_STATES = ['NONE', 'CHECK', 'CHECKMATE', 'STALEMATE'] as const;
export type CheckState = (typeof CHECK_STATES)[number];

export interface ClockState {
  redMs: number;
  blackMs: number;
}

export interface LastMove {
  from: Square;
  to: Square;
}

export interface SubmitMoveRequest extends RequestEnvelope {
  matchId: string;
  moveId: string;
  version: number;
  from: Square;
  to: Square;
}

// ---- Server → client --------------------------------------------------------------------

export interface MoveAcceptedPayload {
  matchId: string;
  moveId: string;
  /** 1 for the first move of the match. */
  ply: number;
  version: number;
  actorType: ActorType;
  side: Side;
  from: Square;
  to: Square;
  capture: Piece | null;
  turn: Side;
  checkState: CheckState;
  fen: string;
  stateHash: string;
  clocks: ClockState;
  committedAt: string;
}

export interface MatchSnapshot {
  matchId: string;
  version: number;
  status: MatchStatus;
  turn: Side;
  fen: string;
  stateHash: string;
  checkState: CheckState;
  lastMove: LastMove | null;
  clocks: ClockState;
  serverTime: string;
}

// ---- Rejection --------------------------------------------------------------------------

export const MOVE_REJECTION_CODES = [
  'MOVE_ILLEGAL',
  'NOT_YOUR_TURN',
  'STALE_STATE',
  'GAME_FINISHED',
] as const satisfies readonly ErrorCode[];
export type MoveRejectionCode = (typeof MOVE_REJECTION_CODES)[number];

export interface MoveRejectedDetails {
  [key: string]: unknown;
  moveId: string;
  snapshot: MatchSnapshot;
}

export interface MoveRejectedError extends ApiError {
  code: MoveRejectionCode;
  details: MoveRejectedDetails;
}

export function isMoveRejection(error: ApiError): error is MoveRejectedError {
  return (
    (MOVE_REJECTION_CODES as readonly string[]).includes(error.code) &&
    typeof error.details?.snapshot === 'object' &&
    error.details.snapshot !== null
  );
}
