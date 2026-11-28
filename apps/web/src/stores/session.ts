import { create } from 'zustand';
import type { ClientError } from '../lib/errors';
import type { GuestSession } from '../services';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SessionState {
  status: SessionStatus;
  session: GuestSession | null;
  error: ClientError | null;
  setLoading: () => void;
  setSession: (session: GuestSession) => void;
  setError: (error: ClientError) => void;
}

/** The current guest (US-11). Written by session/bootstrap.ts, read by the UI. */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'idle',
  session: null,
  error: null,
  setLoading: () => set({ status: 'loading', error: null }),
  setSession: (session) => set({ status: 'ready', session, error: null }),
  setError: (error) => set({ status: 'error', error }),
}));
