import { ErrorCode } from '@xiangqi/shared';
import { ApiRequestError, type ClientError } from '../lib/errors';
import { newRequestId } from '../lib/request-id';
import { getServices } from '../services';
import { useSessionStore } from '../stores/session';

function toClientError(err: unknown): ClientError {
  if (err instanceof ApiRequestError) return err.error;
  return { code: 'INTERNAL_ERROR', message: String(err), requestId: newRequestId() };
}

let inFlight: Promise<boolean> | null = null;
let connection: Promise<boolean> = Promise.resolve(false);

// Resolves true when the server created a new session (the previous one had expired).
function bootstrap(showLoading: boolean): Promise<boolean> {
  if (inFlight) return inFlight;
  if (showLoading) useSessionStore.getState().setLoading();
  const services = getServices();
  inFlight = services.session
    .bootstrap()
    .then((session) => {
      const hadSession = useSessionStore.getState().session !== null;
      useSessionStore.getState().setSession(session);
      if (!hadSession || session.isNew) connection = services.connect();
      return session.isNew;
    })
    .catch((err: unknown) => {
      useSessionStore.getState().setError(toClientError(err));
      return false;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function ensureSession(): Promise<void> {
  if (useSessionStore.getState().status === 'ready') return;
  await bootstrap(true);
}

/** UC-01 re-run after the session expired, without hiding the current screen. */
export async function renewSession(): Promise<boolean> {
  if (!(await bootstrap(false))) return false;
  // The new session reconnects the socket; a socket call retried before that fails at once.
  await connection;
  return true;
}

/**
 * Runs a service call; if the server answers ACCESS_DENIED because the session expired,
 * creates a new session (UC-01) and retries once. A real permission error is rethrown,
 * because the server then reuses the still-valid session.
 */
export async function withSession<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (!(err instanceof ApiRequestError) || err.error.code !== ErrorCode.ACCESS_DENIED) throw err;
    if (!(await renewSession())) throw err;
    return call();
  }
}

/** Retry for "service unavailable": the socket can only connect once a session exists. */
export function retryConnection(): void {
  if (useSessionStore.getState().status === 'ready') connection = getServices().connect();
  else void ensureSession();
}

export async function updateNickname(nickname: string): Promise<void> {
  const session = await withSession(() => getServices().session.setNickname(nickname));
  useSessionStore.getState().setSession(session);
}

export function resetSessionForTests(): void {
  inFlight = null;
  connection = Promise.resolve(false);
  useSessionStore.setState({ status: 'idle', session: null, error: null });
}
