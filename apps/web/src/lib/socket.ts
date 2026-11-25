import type { Ack, RequestEnvelope } from '@xiangqi/shared';
import { io, type Socket } from 'socket.io-client';
import { useConnectionStore } from '../stores/connection';
import { clientError, type ClientError } from './errors';
import { newRequestId } from './request-id';

const ACK_TIMEOUT_MS = 5000;

/** Ack as seen by the client: the server's Ack, or a timeout / not-connected error. */
export type ClientAck<T> = Ack<T> | { ok: false; requestId: string; error: ClientError };

let socket: Socket | null = null;

/**
 * The single Socket.IO connection to the backend. Reconnects on its own; the connection
 * state is mirrored in useConnectionStore so any component can show it (FR-20).
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ autoConnect: false, withCredentials: true, transports: ['websocket', 'polling'] });
  const setStatus = useConnectionStore.getState().setStatus;

  socket.on('connect', () => setStatus('connected'));
  socket.on('disconnect', (reason) => {
    // Only an explicit client disconnect is final; everything else is retried automatically.
    setStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
  });
  socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
  socket.io.on('reconnect_failed', () => setStatus('disconnected'));
  socket.on('connect_error', () => {
    if (!socket?.active) setStatus('disconnected');
  });
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  // The handshake authenticates from the cookie, so a renewed session needs a new handshake.
  if (s.connected) s.disconnect();
  useConnectionStore.getState().setStatus('connecting');
  s.connect();
}

/**
 * Emits a client → server event and waits for the server's Ack.
 * Adds a requestId, and turns "no answer in time" into a TIMEOUT error instead of hanging.
 */
export async function emitWithAck<T>(
  event: string,
  payload: RequestEnvelope & Record<string, unknown> = {},
  timeoutMs = ACK_TIMEOUT_MS,
): Promise<ClientAck<T>> {
  const requestId = payload.requestId ?? newRequestId();
  const s = getSocket();
  if (!s.connected) {
    return {
      ok: false,
      requestId,
      error: clientError('NETWORK_ERROR', 'Not connected', requestId),
    };
  }
  try {
    return await s.timeout(timeoutMs).emitWithAck(event, { ...payload, requestId });
  } catch {
    return {
      ok: false,
      requestId,
      error: clientError('TIMEOUT', 'Server did not answer', requestId),
    };
  }
}

/** Test helper: forget the current socket so the next getSocket() creates a new one. */
export function resetSocketForTests(): void {
  socket?.removeAllListeners();
  socket?.close();
  socket = null;
}
