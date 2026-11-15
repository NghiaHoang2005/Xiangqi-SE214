import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

// Accept a client-supplied id only if it looks like an opaque token, so it is safe to log.
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function resolveRequestId(candidate: unknown): string {
  return typeof candidate === 'string' && SAFE_ID.test(candidate) ? candidate : randomUUID();
}
