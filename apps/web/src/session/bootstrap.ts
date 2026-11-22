import { ApiRequestError, type ClientError } from '../lib/errors';
import { newRequestId } from '../lib/request-id';
import { getServices } from '../services';
import { useSessionStore } from '../stores/session';

function toClientError(err: unknown): ClientError {
  if (err instanceof ApiRequestError) return err.error;
  return { code: 'INTERNAL_ERROR', message: String(err), requestId: newRequestId() };
}

let inFlight: Promise<void> | null = null;

/**
 * UC-01: make sure a guest session exists, then open the realtime connection
 * (the socket handshake needs the session cookie). Safe to call many times:
 * concurrent calls share one request, and a ready session is not fetched again.
 */
export function ensureSession(): Promise<void> {
  const store = useSessionStore.getState();
  if (store.status === 'ready') return Promise.resolve();
  if (inFlight) return inFlight;

  store.setLoading();
  const services = getServices();
  inFlight = services.session
    .bootstrap()
    .then((session) => {
      useSessionStore.getState().setSession(session);
      services.connect();
    })
    .catch((err: unknown) => {
      useSessionStore.getState().setError(toClientError(err));
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Re-run UC-01 after the server reported the session as gone (E1), keeping the user in place. */
export function renewSession(): Promise<void> {
  useSessionStore.setState({ status: 'idle' });
  return ensureSession();
}

/** Set or clear the nickname. Throws ApiRequestError so the form can show the message. */
export async function updateNickname(nickname: string | null): Promise<void> {
  const session = await getServices().session.setNickname(nickname);
  useSessionStore.getState().setSession(session);
}

/** Tests only. */
export function resetSessionForTests(): void {
  inFlight = null;
  useSessionStore.setState({ status: 'idle', session: null, error: null });
}
