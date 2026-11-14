/**
 * Tên sự kiện Socket.IO theo SRS mục 9.3.
 * Payload chi tiết sẽ bổ sung dần trong các story (US-03, US-20, US-21...).
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
