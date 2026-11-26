import type { ApiError } from '@xiangqi/shared';
import { ApiRequestError, clientError } from './errors';
import { newRequestId } from './request-id';

const REQUEST_ID_HEADER = 'x-request-id';

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null && 'code' in body && 'message' in body;
}

/** Throws ApiRequestError on failure. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await apiRequest<T>(path, init)).data;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T }> {
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
  return { status: res.status, data: body as T };
}
