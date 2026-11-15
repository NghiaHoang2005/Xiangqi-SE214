import type { ApiError, ErrorCode } from '@xiangqi/shared';

/** Codes the client produces itself when the server could not answer. */
export type ClientOnlyCode = 'NETWORK_ERROR' | 'TIMEOUT';

export interface ClientError extends Omit<ApiError, 'code'> {
  code: ErrorCode | ClientOnlyCode;
}

export function clientError(
  code: ClientOnlyCode,
  message: string,
  requestId?: string,
): ClientError {
  return { code, message, requestId };
}

/** Thrown by apiFetch; carries the server's ApiError (or a client-side one). */
export class ApiRequestError extends Error {
  constructor(
    readonly error: ClientError,
    readonly status?: number,
  ) {
    super(error.message);
    this.name = 'ApiRequestError';
  }
}
