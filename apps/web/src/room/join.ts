import { ErrorCode, type RoomView } from '@xiangqi/shared';
import { ApiRequestError, type ClientError } from '../lib/errors';
import { paths } from '../routes';

export interface JoinFailure {
  message: string;
  /** False when trying again cannot help: the room is gone or full. */
  retryable: boolean;
}

export function joinFailure(err: unknown): JoinFailure {
  return failureFor(err instanceof ApiRequestError ? err.error.code : null);
}

export function failureFor(code: ClientError['code'] | null): JoinFailure {
  switch (code) {
    case ErrorCode.ROOM_NOT_FOUND:
      return {
        message: 'Không tìm thấy phòng. Hãy kiểm tra lại mã hoặc liên kết.',
        retryable: false,
      };
    case ErrorCode.ROOM_EXPIRED:
      return { message: 'Phòng đã hết hạn hoặc đã bị chủ phòng đóng.', retryable: false };
    case ErrorCode.ROOM_FULL:
      return { message: 'Phòng đã đủ hai người chơi.', retryable: false };
    case ErrorCode.VALIDATION_FAILED:
      return { message: 'Mã phòng hoặc liên kết không hợp lệ.', retryable: false };
    case ErrorCode.RATE_LIMITED:
      return {
        message: 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',
        retryable: true,
      };
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return { message: 'Không kết nối được máy chủ. Vui lòng thử lại.', retryable: true };
    default:
      return { message: 'Không vào được phòng. Vui lòng thử lại.', retryable: true };
  }
}

/** The second seat starts the match at once (AC-01), so a join can land straight in it. */
export function pathAfterJoin(room: RoomView): string {
  return room.matchId ? paths.match(room.matchId) : paths.room(room.roomId);
}
