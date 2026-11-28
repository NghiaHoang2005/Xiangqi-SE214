import { ErrorCode, type RoomView } from '@xiangqi/shared';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, useOptionalToast } from '../components/ui';
import { failureFor, joinFailure, type JoinFailure } from '../room/join';
import { paths } from '../routes';
import { getServices } from '../services';
import { withSession } from '../session/bootstrap';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';
import { WaitingRoom } from './WaitingRoom';

interface JoinState {
  room: RoomView | null;
  failure: JoinFailure | null;
}

function handedOverRoom(state: unknown, roomId: string): RoomView | null {
  const room = (state as { room?: RoomView } | null)?.room;
  return room?.roomId === roomId ? room : null;
}

/** US-14 / UC-04: opening /room/:roomId takes a seat, or gives back the one already held (A1). */
export function RoomPage() {
  const { roomId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useOptionalToast();
  const sessionReady = useSessionStore((s) => s.status === 'ready');
  const connected = useConnectionStore((s) => s.status === 'connected');

  const [state, setState] = useState<JoinState>(() => ({
    room: handedOverRoom(location.state, roomId),
    failure: null,
  }));
  const [attempt, setAttempt] = useState(0);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const closingSelfRef = useRef(false);

  // Re-runs after a reconnect too: JoinRoom is idempotent for a seated guest, and it
  // reattaches the new socket to the room.
  useEffect(() => {
    if (!sessionReady || !connected) return;
    let active = true;
    withSession(() => getServices().room.joinRoom({ roomId }))
      .then((room) => {
        if (!active) return;
        if (room.matchId) navigate(paths.match(room.matchId), { replace: true });
        else setState({ room, failure: null });
      })
      .catch((err: unknown) => {
        if (active) setState({ room: null, failure: joinFailure(err) });
      });
    return () => {
      active = false;
    };
  }, [roomId, sessionReady, connected, attempt, navigate]);

  useEffect(() => {
    const rooms = getServices().room;
    const offUpdated = rooms.onRoomUpdated(roomId, (room) => {
      if (room.status === 'CLOSED' || room.status === 'EXPIRED') {
        if (closingSelfRef.current) return;
        setState({ room: null, failure: failureFor(ErrorCode.ROOM_EXPIRED) });
      } else {
        setState((s) => (s.failure ? s : { room, failure: null }));
      }
    });
    const offStarted = rooms.onMatchStarted(roomId, (event) =>
      navigate(paths.match(event.matchId), { replace: true }),
    );
    return () => {
      offUpdated();
      offStarted();
    };
  }, [roomId, navigate]);

  function retry() {
    setState({ room: null, failure: null });
    setAttempt((n) => n + 1);
  }

  async function handleCloseRoom() {
    if (closing || !state.room) return;
    setClosing(true);
    setCloseError('');
    closingSelfRef.current = true;
    try {
      await withSession(() => getServices().room.closeRoom(state.room!.roomId));
      toast?.show({ title: 'Đã đóng phòng', message: 'Phòng chờ đã được đóng.', variant: 'info' });
      navigate(paths.home, { replace: true });
    } catch (err: unknown) {
      closingSelfRef.current = false;
      setCloseError(joinFailure(err).message);
      setClosing(false);
    }
  }

  if (state.failure) {
    return (
      <section className="page room-join">
        <h1>Không vào được phòng</h1>
        <p role="alert">{state.failure.message}</p>
        <div className="room-join-actions">
          {state.failure.retryable && <Button onClick={retry}>Thử lại</Button>}
          <Button variant="secondary" onClick={() => navigate(paths.home)}>
            Về trang chủ
          </Button>
        </div>
      </section>
    );
  }

  if (state.room) {
    return (
      <WaitingRoom
        room={state.room}
        onCloseRoom={handleCloseRoom}
        closing={closing}
        closeError={closeError}
      />
    );
  }

  return (
    <section className="page room-join" aria-busy="true">
      <h1>Phòng chờ</h1>
      <p className="muted">
        {sessionReady && connected ? 'Đang vào phòng…' : 'Đang kết nối đến máy chủ…'}
      </p>
    </section>
  );
}
