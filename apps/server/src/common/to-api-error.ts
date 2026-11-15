import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode, type ApiError } from '@xiangqi/shared';
import { DomainException } from './domain.exception';

const logger = new Logger('Errors');

/** Maps any thrown value to an HTTP status and an ApiError; never leaks internal details. */
export function toApiError(err: unknown, requestId: string): { status: number; body: ApiError } {
  if (err instanceof DomainException) {
    return { status: err.status, body: { code: err.code, message: err.message, requestId } };
  }
  if (err instanceof HttpException) {
    const status = err.getStatus();
    const code =
      status === HttpStatus.NOT_FOUND
        ? ErrorCode.NOT_FOUND
        : status === HttpStatus.TOO_MANY_REQUESTS
          ? ErrorCode.RATE_LIMITED
          : status < 500
            ? ErrorCode.VALIDATION_FAILED
            : ErrorCode.INTERNAL_ERROR;
    return { status, body: { code, message: err.message, requestId } };
  }
  logger.error(
    `requestId=${requestId} unhandled error`,
    err instanceof Error ? err.stack : String(err),
  );
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal error', requestId },
  };
}
