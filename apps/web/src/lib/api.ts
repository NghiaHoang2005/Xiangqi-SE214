import type { ApiError } from '@xiangqi/shared';
import { ApiRequestError, clientError } from './errors';
import { newRequestId } from './request-id';

const REQUEST_ID_HEADER = 'x-request-id';

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null && 'code' in body && 'message' in body;
}

/**
 * JSON fetch against the backend (`/api/...`, proxied by Vite in dev and nginx in Docker).
 * Sends cookies, tags the request with an x-request-id, and throws ApiRequestError on failure.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestId = newRequestId();
  const headers = new Headers(init.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiRequestError(clientError('NETWORK_ERROR', 'Cannot reach the server', requestId));
  }

  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) {
    const error = isApiError(body)
      ? body
      : { code: 'INTERNAL_ERROR' as const, message: `HTTP ${res.status}`, requestId };
    throw new ApiRequestError(error, res.status);
  }
  return body as T;
}
