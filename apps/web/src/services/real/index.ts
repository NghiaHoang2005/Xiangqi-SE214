import { ClientEvent, ServerEvent } from '@xiangqi/shared';
import { apiFetch } from '../../lib/api';
import { ApiRequestError } from '../../lib/errors';
import { connectSocket, emitWithAck, getSocket, type ClientAck } from '../../lib/socket';
import type {
  CreateRoomInput,
  GuestSession,
  JoinRoomResult,
  MatchStartedEvent,
  RoomService,
  RoomSnapshot,
  Services,
  SessionService,
} from '../types';

/*
 * Real backend. Endpoint and event names are the FE's draft (see services/types.ts);
 * adjust them here, and only here, once SCRUM-138 / 143 / 146 are merged.
 */

function unwrap<T>(ack: ClientAck<T>): T {
  if (ack.ok) return ack.data;
  throw new ApiRequestError(ack.error);
}

const session: SessionService = {
  bootstrap: () => apiFetch<GuestSession>('/guest-sessions', { method: 'POST', body: '{}' }),
  setNickname: (nickname) =>
    apiFetch<GuestSession>('/guest-sessions/me', {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    }),
};

const room: RoomService = {
  async createRoom(input: CreateRoomInput) {
    return unwrap(await emitWithAck<RoomSnapshot>(ClientEvent.CreateRoom, { ...input }));
  },
  async joinRoom(roomIdOrCode: string) {
    return unwrap(await emitWithAck<JoinRoomResult>(ClientEvent.JoinRoom, { roomIdOrCode }));
  },
  async closeRoom(roomId: string) {
    // Not in SRS 9.3 yet: needed for US-13 A1 (host closes the room).
    unwrap(await emitWithAck<null>('CloseRoom', { roomId }));
  },
  onMatchStarted(roomId, listener) {
    const socket = getSocket();
    const handler = (event: MatchStartedEvent) => {
      if (event.roomId === roomId) listener(event);
    };
    socket.on(ServerEvent.MatchStarted, handler);
    return () => {
      socket.off(ServerEvent.MatchStarted, handler);
    };
  },
};

export function createRealServices(): Services {
  return { kind: 'real', session, room, connect: connectSocket };
}
