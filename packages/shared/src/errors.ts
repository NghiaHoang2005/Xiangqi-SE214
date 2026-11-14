/** Minimum error codes from SRS section 9.4, plus codes referenced in the use cases. */
export const ErrorCode = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_EXPIRED: 'ROOM_EXPIRED',
  ROOM_FULL: 'ROOM_FULL',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  MOVE_ILLEGAL: 'MOVE_ILLEGAL',
  STALE_STATE: 'STALE_STATE',
  GAME_FINISHED: 'GAME_FINISHED',
  RECONNECT_DENIED: 'RECONNECT_DENIED',
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  QUEUE_ALREADY_ACTIVE: 'QUEUE_ALREADY_ACTIVE',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiError {
  code: ErrorCode;
  message: string;
  requestId?: string;
}
