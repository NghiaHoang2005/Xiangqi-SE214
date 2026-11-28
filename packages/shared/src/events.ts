/**
 * Socket.IO event names from SRS section 9.3.
 * Payload types are added by the stories that implement them (US-03, US-20, US-21, ...).
 */
export const ClientEvent = {
  CreateRoom: 'CreateRoom',
  JoinRoom: 'JoinRoom',
  CloseRoom: 'CloseRoom',
  CreateAIMatch: 'CreateAIMatch',
  SubmitMove: 'SubmitMove',
  DrawOffer: 'DrawOffer',
  DrawResponse: 'DrawResponse',
  Resign: 'Resign',
  JoinRankedQueue: 'JoinRankedQueue',
  CancelRankedQueue: 'CancelRankedQueue',
} as const;

export const ServerEvent = {
  RoomUpdated: 'RoomUpdated',
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

/**
 * Request and Ack data per client event, for the events whose contract is agreed.
 * Both the gateway handlers and the web socket wrapper type against this map.
 */
export interface ClientEventContracts {
  CreateRoom: { request: import('./room').CreateRoomRequest; ack: import('./room').RoomView };
  JoinRoom: { request: import('./room').JoinRoomRequest; ack: import('./room').RoomView };
  CloseRoom: { request: import('./room').CloseRoomRequest; ack: import('./room').RoomView };
  SubmitMove: {
    request: import('./match').SubmitMoveRequest;
    ack: import('./match').MoveAcceptedPayload;
  };
}

/** Payload per server → client event, for the events whose contract is agreed. */
export interface ServerEventPayloads {
  RoomUpdated: import('./room').RoomUpdatedPayload;
  MatchStarted: import('./room').MatchStartedPayload;
  MoveAccepted: import('./match').MoveAcceptedPayload;
}

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
