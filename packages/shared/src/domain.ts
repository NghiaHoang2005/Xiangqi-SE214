/**
 * Domain value sets shared by the database schema (enum columns) and the web app.
 * Each is a readonly tuple so it can be both iterated and used as a union type.
 */

export const SIDES = ['RED', 'BLACK'] as const;
export const GAME_MODES = ['PVP', 'PVE', 'PVP_RANKED'] as const;
export const AI_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

/** Host's side choice when creating a room (FR-04). */
export const SIDE_PREFERENCES = ['RED', 'BLACK', 'RANDOM'] as const;
export type SidePreference = (typeof SIDE_PREFERENCES)[number];

/** Room lifecycle (UC-03, UC-04, BR-20). */
export const ROOM_STATUSES = ['WAITING', 'STARTED', 'CLOSED', 'EXPIRED'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

/** Per-seat socket state (FR-20). */
export const CONNECTION_STATES = ['CONNECTED', 'RECONNECTING', 'DISCONNECTED'] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

/** Match lifecycle (SRS 3.4). */
export const MATCH_STATUSES = ['IN_PROGRESS', 'FINISHED'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Why a match ended (FR-19, AC-07). */
export const END_REASONS = [
  'CHECKMATE',
  'STALEMATE',
  'RESIGN',
  'DRAW_AGREEMENT',
  'TIMEOUT',
  'DISCONNECT_FORFEIT',
] as const;
export type EndReason = (typeof END_REASONS)[number];

/** Who made a move (BR-25). */
export const ACTOR_TYPES = ['HUMAN', 'AI'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];
