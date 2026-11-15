import type { Ack, RequestEnvelope } from '@xiangqi/shared';
import { resolveRequestId } from '../common/request-id';
import { toApiError } from '../common/to-api-error';

/**
 * Runs a Socket.IO handler and always answers with an Ack, so clients never wait on a
 * timeout: success → { ok: true, data }, any thrown error → { ok: false, error }.
 */
export async function runHandler<T>(
  payload: RequestEnvelope | undefined,
  fn: (requestId: string) => T | Promise<T>,
): Promise<Ack<T>> {
  const requestId = resolveRequestId(payload?.requestId);
  try {
    return { ok: true, requestId, data: await fn(requestId) };
  } catch (err) {
    return { ok: false, requestId, error: toApiError(err, requestId).body };
  }
}
