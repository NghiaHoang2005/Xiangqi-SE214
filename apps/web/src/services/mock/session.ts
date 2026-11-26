import {
  ErrorCode,
  GUEST_SESSION_IDLE_DAYS,
  isValidNickname,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  normalizeNickname,
} from '@xiangqi/shared';
import type { GuestSession, SessionService } from '../types';
import { delay, fail, readJson, writeJson, type KeyValueStorage } from './util';

export const MOCK_SESSION_KEY = 'xq.mock.session';
export const MOCK_SESSION_IDLE_MS = GUEST_SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000;

export interface StoredSession {
  guestId: string;
  nickname: string | null;
  lastSeenAt: number;
}

export function createMockSessionService(opts: {
  storage: KeyValueStorage;
  latencyMs: number;
  now?: () => number;
}): SessionService & { current(): StoredSession | null } {
  const now = opts.now ?? Date.now;

  function current(): StoredSession | null {
    return readJson<StoredSession>(opts.storage, MOCK_SESSION_KEY);
  }

  // CFG-07: every request extends the session, like the server does.
  function touch(s: Omit<StoredSession, 'lastSeenAt'>, isNew: boolean): GuestSession {
    const lastSeenAt = now();
    writeJson(opts.storage, MOCK_SESSION_KEY, { ...s, lastSeenAt });
    return {
      guestId: s.guestId,
      nickname: s.nickname,
      expiresAt: new Date(lastSeenAt + MOCK_SESSION_IDLE_MS).toISOString(),
      isNew,
    };
  }

  return {
    current,

    async bootstrap(): Promise<GuestSession> {
      await delay(opts.latencyMs);
      const existing = current();
      if (existing && now() - existing.lastSeenAt < MOCK_SESSION_IDLE_MS) {
        return touch(existing, false);
      }
      return touch({ guestId: crypto.randomUUID(), nickname: null }, true);
    },

    async setNickname(raw: string): Promise<GuestSession> {
      await delay(opts.latencyMs);
      const existing = current();
      if (!existing || now() - existing.lastSeenAt >= MOCK_SESSION_IDLE_MS) {
        fail(ErrorCode.ACCESS_DENIED, 'No guest session');
      }
      const nickname = normalizeNickname(raw);
      if (nickname !== null && !isValidNickname(nickname)) {
        fail(
          ErrorCode.VALIDATION_FAILED,
          `nickname must be ${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH} characters`,
          { field: 'nickname' },
        );
      }
      return touch({ ...existing, nickname }, false);
    },
  };
}
