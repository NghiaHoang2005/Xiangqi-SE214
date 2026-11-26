/**
 * Guest session contract (US-11 / UC-01, FR-01, NFR-08, NFR-10). See docs/api-contract.md.
 *
 * Transport: REST, because only an HTTP response can set the HttpOnly cookie.
 *   POST  /api/guest-session     body CreateGuestSessionRequest  → 201 new | 200 reused (A1)
 *   GET   /api/guest-session/me                                  → 200 | 401 ACCESS_DENIED
 *   PATCH /api/guest-session/me  body UpdateNicknameRequest       → 200 | 400 VALIDATION_FAILED
 * Every 2xx body is a GuestSessionView. The reconnect token only ever travels in the cookie.
 */

/** HttpOnly; Secure; SameSite=Lax; Path=/ cookie that carries the reconnect token. */
export const GUEST_SESSION_COOKIE = 'xq_rt';

/** Sessions expire after this many days without activity; each request extends them (CFG-07). */
export const GUEST_SESSION_IDLE_DAYS = 30;

/** Nickname length after trimming. The DB column allows 32, the UI shows at most 20. */
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export interface CreateGuestSessionRequest {
  /** Optional; omitted or empty means "no nickname" (the UI shows a generic label). */
  nickname?: string;
}

export interface UpdateNicknameRequest {
  nickname: string;
}

export interface GuestSessionView {
  guestId: string;
  nickname: string | null;
  /** ISO 8601. */
  expiresAt: string;
}

/** Trims and collapses inner whitespace; returns null for an empty nickname. */
export function normalizeNickname(raw: string | null | undefined): string | null {
  const nickname = (raw ?? '').trim().replace(/\s+/g, ' ');
  return nickname === '' ? null : nickname;
}

/** Length check on the normalized nickname, counted in Unicode code points. */
export function isValidNickname(nickname: string): boolean {
  const length = [...nickname].length;
  return length >= NICKNAME_MIN_LENGTH && length <= NICKNAME_MAX_LENGTH;
}
