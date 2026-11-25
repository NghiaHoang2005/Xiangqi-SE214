import {
  ClientEvent,
  normalizeJoinCode,
  ServerEvent,
  type ClientEventContracts,
  type CreateGuestSessionRequest,
  type GuestSessionView,
  type ServerEventPayloads,
  type UpdateNicknameRequest,
} from '@xiangqi/shared';
import { apiRequest } from '../../lib/api';
import { ApiRequestError } from '../../lib/errors';
import { connectSocket, emitWithAck, getSocket } from '../../lib/socket';
import type { GuestSession, RoomService, Services, SessionService } from '../types';

type ContractEvent = keyof ClientEventContracts;

// Plain Omit would merge JoinRoomRequest's { roomId } | { joinCode } union.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

async function request<E extends ContractEvent>(
  event: E,
  payload: DistributiveOmit<ClientEventContracts[E]['request'], 'requestId'>,
): Promise<ClientEventContracts[E]['ack']> {
  const ack = await emitWithAck<ClientEventContracts[E]['ack']>(event, { ...payload });
  if (ack.ok) return ack.data;
  throw new ApiRequestError(ack.error);
}

function onRoomEvent<E extends keyof ServerEventPayloads>(
  event: E,
  roomId: string,
  listener: (payload: ServerEventPayloads[E]) => void,
): () => void {
  const socket = getSocket();
  const handler = (payload: ServerEventPayloads[E]) => {
    if (payload.roomId === roomId) listener(payload);
  };
  socket.on(event as string, handler);
  return () => {
    socket.off(event as string, handler);
  };
}

async function sessionCall(path: string, method: string, body: unknown): Promise<GuestSession> {
  const { status, data } = await apiRequest<GuestSessionView>(path, {
    method,
    body: JSON.stringify(body),
  });
  return { ...data, isNew: status === 201 };
}

const session: SessionService = {
  bootstrap: () => sessionCall('/guest-session', 'POST', {} satisfies CreateGuestSessionRequest),
  async setNickname(nickname) {
    const body: UpdateNicknameRequest = { nickname };
    return { ...(await sessionCall('/guest-session/me', 'PATCH', body)), isNew: false };
  },
};

const room: RoomService = {
  createRoom: (input) => request(ClientEvent.CreateRoom, input),
  joinRoom: (target) =>
    request(
      ClientEvent.JoinRoom,
      'joinCode' in target ? { joinCode: normalizeJoinCode(target.joinCode) } : target,
    ),
  closeRoom: (roomId) => request(ClientEvent.CloseRoom, { roomId }),
  onRoomUpdated: (roomId, listener) => onRoomEvent(ServerEvent.RoomUpdated, roomId, listener),
  onMatchStarted: (roomId, listener) => onRoomEvent(ServerEvent.MatchStarted, roomId, listener),
};

export function createRealServices(): Services {
  return { kind: 'real', session, room, connect: connectSocket };
}
