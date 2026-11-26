import type {
  CreateRoomRequest,
  GuestSessionView,
  MatchStartedPayload,
  RoomView,
} from '@xiangqi/shared';

// Every method rejects with ApiRequestError on failure, never a bare Error.

export interface GuestSession extends GuestSessionView {
  /** True when this call created the session (HTTP 201), false when it reused one (200). */
  isNew: boolean;
}

export interface SessionService {
  bootstrap(): Promise<GuestSession>;
  /** An empty string clears the nickname. */
  setNickname(nickname: string): Promise<GuestSession>;
}

export type CreateRoomInput = Omit<CreateRoomRequest, 'requestId'>;

export type JoinRoomTarget = { roomId: string } | { joinCode: string };

export interface RoomService {
  createRoom(input: CreateRoomInput): Promise<RoomView>;
  /** Re-joining returns the seat the guest already holds (A1). */
  joinRoom(target: JoinRoomTarget): Promise<RoomView>;
  /** Host only. Afterwards the link and code answer ROOM_EXPIRED. */
  closeRoom(roomId: string): Promise<RoomView>;
  onRoomUpdated(roomId: string, listener: (room: RoomView) => void): () => void;
  onMatchStarted(roomId: string, listener: (event: MatchStartedPayload) => void): () => void;
}

export interface Services {
  readonly kind: 'mock' | 'real';
  session: SessionService;
  room: RoomService;
  /**
   * Call only after the guest session exists: the socket handshake needs its cookie.
   * Resolves true once connected, false on timeout.
   */
  connect(): Promise<boolean>;
}
