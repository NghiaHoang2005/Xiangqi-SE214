import { ErrorCode } from '@xiangqi/shared';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  type GuestSession,
  type SessionService,
} from '../types';
import { delay, fail, readJson, writeJson, type KeyValueStorage } from './util';

export const MOCK_SESSION_KEY = 'xq.mock.session';
/** US-11: a session expires after 30 days without activity. */
export const MOCK_SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredSession {
  guestId: string;
  nickname: string | null;
  lastSeenAt: number;
}

/**
 * Plays the role of the session cookie. Kept per tab (sessionStorage) on purpose,
 * so two tabs are two different guests.
 */
export function createMockSessionService(opts: {
  storage: KeyValueStorage;
  latencyMs: number;
  now?: () => number;
}): SessionService & { current(): StoredSession | null } {
  const now = opts.now ?? Date.now;

  function current(): StoredSession | null {
    return readJson<StoredSession>(opts.storage, MOCK_SESSION_KEY);
  }

  function save(s: StoredSession): void {
    writeJson(opts.storage, MOCK_SESSION_KEY, s);
  }

  return {
    current,

    async bootstrap(): Promise<GuestSession> {
      await delay(opts.latencyMs);
      const existing = current();
      if (existing && now() - existing.lastSeenAt < MOCK_SESSION_IDLE_MS) {
        save({ ...existing, lastSeenAt: now() });
        return { guestId: existing.guestId, nickname: existing.nickname, isNew: false };
      }
      // Random UUID: guest ids are never sequential.
      const created: StoredSession = {
        guestId: crypto.randomUUID(),
        nickname: null,
        lastSeenAt: now(),
      };
      save(created);
      return { guestId: created.guestId, nickname: null, isNew: true };
    },

    async setNickname(nickname: string | null): Promise<GuestSession> {
      await delay(opts.latencyMs);
      const existing = current();
      if (!existing) fail(ErrorCode.ACCESS_DENIED, 'No guest session');
      const value = nickname?.trim() || null;
      if (
        value !== null &&
        (value.length < NICKNAME_MIN_LENGTH || value.length > NICKNAME_MAX_LENGTH)
      ) {
        fail(
          ErrorCode.VALIDATION_FAILED,
          `nickname must be ${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH} characters`,
        );
      }
      save({ ...existing, nickname: value, lastSeenAt: now() });
      return { guestId: existing.guestId, nickname: value, isNew: false };
    },
  };
}
