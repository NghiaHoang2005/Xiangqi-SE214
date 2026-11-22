import type { Side, TimeControl } from '@xiangqi/shared';

/*
 * FE-side contract for the backend, drafted before the API is agreed (SCRUM-139).
 *
 * Pages and stores only talk to these interfaces. Two implementations exist:
 *   - services/mock: in-memory + BroadcastChannel, no backend needed (VITE_USE_MOCK=true)
 *   - services/real: REST via apiFetch and Socket.IO via emitWithAck
 * When the backend lands with a different shape, only services/real changes.
 * Once agreed with BE, the DTOs below move to @xiangqi/shared.
 *
 * Every method rejects with ApiRequestError (lib/errors) on failure, never a bare Error.
 */

/* ── Guest session (US-11, UC-01) ─────────────────────────────── */

/** Nickname is optional; when given it is trimmed and must fit these bounds. */
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 32; // guest_session.nickname is VarChar(32)

export interface GuestSession {
  guestId: string;
  nickname: string | null;
  /** True when this call created the session, false when an existing one was reused (A1). */
  isNew: boolean;
}

export interface SessionService {
  /** Reuse the session in the cookie if it is still valid, otherwise create one. */
  bootstrap(): Promise<GuestSession>;
  /** Set or clear (null) the nickname. Rejects VALIDATION_FAILED on bad length. */
  setNickname(nickname: string | null): Promise<GuestSession>;
}

/* ── Rooms (US-13 UC-03, US-14 UC-04) ─────────────────────────── */

export type SideChoice = Side | 'RANDOM';

export interface CreateRoomInput {
  timeControl: TimeControl;
  side: SideChoice;
}

export type RoomStatus = 'WAITING' | 'PLAYING' | 'CLOSED';

export interface SeatInfo {
  guestId: string;
  nickname: string | null;
}

export interface RoomSnapshot {
  /** ≥128-bit random id, used in the share link. */
  roomId: string;
  /** 8-character code typed by hand. */
  code: string;
  hostGuestId: string;
  timeControl: TimeControl;
  seats: Record<Side, SeatInfo | null>;
  status: RoomStatus;
  matchId: string | null;
}

export interface JoinRoomResult {
  room: RoomSnapshot;
  /** The seat this guest holds; the same seat again when re-joining (A1). */
  seat: Side;
}

export interface MatchStartedEvent {
  roomId: string;
  matchId: string;
  version: number;
  red: SeatInfo;
  black: SeatInfo;
}

export interface RoomService {
  /** Rejects VALIDATION_FAILED (E1) with the valid values in the message. */
  createRoom(input: CreateRoomInput): Promise<RoomSnapshot>;
  /** Accepts the roomId from a link or the 8-character code. */
  joinRoom(roomIdOrCode: string): Promise<JoinRoomResult>;
  /** Host only. Afterwards the link and code answer ROOM_EXPIRED. */
  closeRoom(roomId: string): Promise<void>;
  /** Fires once both seats are filled. Returns an unsubscribe function. */
  onMatchStarted(roomId: string, listener: (event: MatchStartedEvent) => void): () => void;
}

/* ── Everything the UI needs ──────────────────────────────────── */

export interface Services {
  readonly kind: 'mock' | 'real';
  session: SessionService;
  room: RoomService;
  /** Open the realtime connection; called after the guest session exists. */
  connect(): void;
}
