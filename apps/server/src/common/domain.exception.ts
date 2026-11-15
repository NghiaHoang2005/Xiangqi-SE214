import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@xiangqi/shared';

const DEFAULT_STATUS: Partial<Record<ErrorCode, HttpStatus>> = {
  ROOM_NOT_FOUND: HttpStatus.NOT_FOUND,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  ROOM_EXPIRED: HttpStatus.GONE,
  ROOM_FULL: HttpStatus.CONFLICT,
  QUEUE_ALREADY_ACTIVE: HttpStatus.CONFLICT,
  STALE_STATE: HttpStatus.CONFLICT,
  GAME_FINISHED: HttpStatus.CONFLICT,
  ACCESS_DENIED: HttpStatus.FORBIDDEN,
  RECONNECT_DENIED: HttpStatus.FORBIDDEN,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  AI_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * A business-rule failure with one of the shared error codes (SRS 9.4).
 * Throw it from services; the HTTP filter and the Socket.IO gateway turn it into an ApiError.
 */
export class DomainException extends Error {
  readonly status: HttpStatus;

  constructor(
    readonly code: ErrorCode,
    message: string = code,
    status?: HttpStatus,
  ) {
    super(message);
    this.name = 'DomainException';
    this.status = status ?? DEFAULT_STATUS[code] ?? HttpStatus.BAD_REQUEST;
  }
}
