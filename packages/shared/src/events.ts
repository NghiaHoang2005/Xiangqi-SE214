/**
 * Socket.IO event names from SRS section 9.3.
 * Payload types are added by the stories that implement them (US-03, US-20, US-21, ...).
 */
export const ClientEvent = {
  CreateRoom: 'CreateRoom',
  JoinRoom: 'JoinRoom',
  CreateAIMatch: 'CreateAIMatch',
  SubmitMove: 'SubmitMove',
  DrawOffer: 'DrawOffer',
  DrawResponse: 'DrawResponse',
  Resign: 'Resign',
  JoinRankedQueue: 'JoinRankedQueue',
  CancelRankedQueue: 'CancelRankedQueue',
} as const;

export const ServerEvent = {
  MatchStarted: 'MatchStarted',
  MoveAccepted: 'MoveAccepted',
  MoveRejected: 'MoveRejected',
  AIThinking: 'AIThinking',
  AIError: 'AIError',
  GameEnded: 'GameEnded',
  ConnectionState: 'ConnectionState',
  MatchFound: 'MatchFound',
  RatingUpdated: 'RatingUpdated',
} as const;

export type ClientEvent = (typeof ClientEvent)[keyof typeof ClientEvent];
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];

/** Socket.IO acknowledgement returned by every client → server event handler. */
export type Ack<T> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; error: import('./errors').ApiError };

/** Every client → server payload may carry a requestId so logs and errors can be correlated. */
export interface RequestEnvelope {
  requestId?: string;
}

/** Connectivity check used by the client socket wrapper and tests. */
export const SystemEvent = {
  Ping: 'Ping',
} as const;

export interface PingResult {
  serverTime: number;
}
