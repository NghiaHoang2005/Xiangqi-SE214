/**
 * Private room and match-start contract (US-13 / UC-03, US-14 / UC-04). See docs/api-contract.md.
 * Transport: Socket.IO. Every client event answers with Ack<T> (events.ts).
 */
import { TIME_CONTROL_PRESETS, type Side, type TimeControl } from './constants';
import type { ConnectionState, RoomStatus, SidePreference } from './domain';
import type { RequestEnvelope } from './events';

/** CFG-06: the code players type. Crockford-style alphabet without 0/O/1/I/L/U. */
export const JOIN_CODE_LENGTH = 8;
export const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Uppercases and strips spaces/dashes so "abcd-efgh" and "ABCD EFGH" both work. */
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidJoinCode(code: string): boolean {
  return (
    code.length === JOIN_CODE_LENGTH && [...code].every((ch) => JOIN_CODE_ALPHABET.includes(ch))
  );
}

export function isTimeControlPreset(value: unknown): value is TimeControl {
  if (typeof value !== 'object' || value === null) return false;
  const { initialMinutes, incrementSeconds } = value as Record<string, unknown>;
  return TIME_CONTROL_PRESETS.some(
    (p) => p.initialMinutes === initialMinutes && p.incrementSeconds === incrementSeconds,
  );
}

// ---- CreateRoom -------------------------------------------------------------------------

export interface CreateRoomRequest extends RequestEnvelope {
  timeControl: TimeControl;
  preferredSide: SidePreference;
}

// ---- JoinRoom ---------------------------------------------------------------------------

/**
 * Exactly one of roomId (from the invite link) or joinCode (typed) must be set.
 * A guest that already holds a seat gets that seat back instead of an error (A1),
 * which is also how the host reattaches after a reload.
 * Errors: ROOM_NOT_FOUND, ROOM_EXPIRED, ROOM_FULL, VALIDATION_FAILED.
 */
export type JoinRoomRequest = RequestEnvelope &
  ({ roomId: string; joinCode?: never } | { joinCode: string; roomId?: never });

// ---- CloseRoom --------------------------------------------------------------------------

/** Host only (ACCESS_DENIED otherwise); the link and code stop working (UC-03 A1). */
export interface CloseRoomRequest extends RequestEnvelope {
  roomId: string;
}

// ---- Shared view ------------------------------------------------------------------------

export interface SeatView {
  side: Side;
  guestId: string;
  nickname: string | null;
  connectionState: ConnectionState;
}

/** Ack data of CreateRoom / JoinRoom / CloseRoom, and the RoomUpdated payload. */
export interface RoomView {
  /** base64url, ≥128 bits of entropy (NFR-10); used in the invite link /room/:roomId. */
  roomId: string;
  joinCode: string;
  status: RoomStatus;
  timeControl: TimeControl;
  hostGuestId: string;
  /** RANDOM is resolved when the room is created, so the host's seat always has a side. */
  hostSide: Side;
  /** The side of the guest receiving this view; null if they hold no seat. */
  yourSide: Side | null;
  /** 1 or 2 entries, ordered RED then BLACK. */
  seats: SeatView[];
  /** Present once the room has started a match. */
  matchId: string | null;
  /** ISO 8601; idle expiry (CFG-06), pushed back on activity. */
  expiresAt: string;
}

// ---- Server → client --------------------------------------------------------------------

/** Sent to everyone in the room when a seat, connection state or status changes. */
export type RoomUpdatedPayload = RoomView;

export interface MatchPlayer {
  guestId: string;
  nickname: string | null;
}

/**
 * Sent to both seats when the second seat is taken (UC-04, AC-01). Red moves first.
 * The client compares its own guestId against players to pick its side and board orientation.
 */
export interface MatchStartedPayload {
  matchId: string;
  roomId: string;
  mode: 'PVP';
  /** 0 at start; every committed change increments it. */
  version: number;
  timeControl: TimeControl;
  turn: Side;
  /** Board + turn in the FEN format of @xiangqi/rules (toFen / parseFen). */
  fen: string;
  clocks: { redMs: number; blackMs: number };
  players: Record<Side, MatchPlayer>;
}
