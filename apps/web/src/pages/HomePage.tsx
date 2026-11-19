import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Input } from '../components/ui';
import { useConnectionStore } from '../stores/connection';
import { connectSocket } from '../lib/socket';
import { paths } from '../routes';

/**
 * Room code format: 8 uppercase alphanumeric characters.
 * This mirrors the server's joinCode column (Prisma schema).
 */
const ROOM_CODE_RE = /^[A-Z0-9]{8}$/;

/** Normalises user input so we accept lowercase too. */
function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * Home page — UC-02 (FR-27, SRS 9.1).
 *
 * Two clear mode choices + room-code quick-join.
 * Shows a service-unavailable banner when the socket is down (E2),
 * and will redirect to UC-01 on session expiry (E1) once the auth
 * module is implemented on the server.
 */
export function HomePage() {
  const status = useConnectionStore((s) => s.status);
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);

  const isConnecting = status === 'connecting';
  const isOffline = status === 'disconnected' || status === 'reconnecting' || isConnecting;

  /* ── Room-code form ────────────────────────────────────── */
  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const code = normaliseCode(roomCode);

    if (code.length === 0) {
      setCodeError('Vui lòng nhập mã phòng.');
      return;
    }
    if (!ROOM_CODE_RE.test(code)) {
      setCodeError('Mã phòng gồm 8 ký tự chữ hoặc số.');
      return;
    }

    setCodeError('');
    setJoining(true);
    // Navigate straight to the room page; RoomPage will emit JoinRoom.
    navigate(paths.room(code));
  }

  return (
    <section className="home-page">
      <h1 className="home-title">Cờ Tướng Trực Tuyến</h1>
      <p className="home-subtitle">Chơi cờ tướng trực tuyến với bạn bè hoặc đấu với máy.</p>

      {/* ── Service-unavailable banner (E2) ─────────────── */}
      {isOffline && status !== 'connected' && (
        <div className="home-banner" role="alert">
          <Badge variant={status === 'connecting' ? 'warning' : 'danger'}>
            {status === 'connecting'
              ? 'Đang kết nối đến máy chủ…'
              : status === 'reconnecting'
                ? 'Đang kết nối lại…'
                : 'Mất kết nối đến máy chủ'}
          </Badge>
          <p className="home-banner-text">
            {status === 'connecting'
              ? 'Vui lòng chờ trong giây lát…'
              : 'Dịch vụ hiện không khả dụng. Vui lòng thử lại.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            loading={isConnecting}
            disabled={isConnecting}
            onClick={() => connectSocket()}
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* ── Mode cards ─────────────────────────────────── */}
      <div className="home-modes">
        <button
          type="button"
          className="mode-card"
          disabled={isOffline}
          onClick={() => navigate(paths.room('new'))}
        >
          <span className="mode-icon" aria-hidden="true">
            👥
          </span>
          <span className="mode-label">Chơi với bạn</span>
          <span className="mode-desc">Tạo phòng và mời bạn bè bằng mã phòng.</span>
        </button>

        <button
          type="button"
          className="mode-card"
          disabled={isOffline}
          onClick={() => navigate(paths.aiSetup)}
        >
          <span className="mode-icon" aria-hidden="true">
            🤖
          </span>
          <span className="mode-label">Chơi với máy</span>
          <span className="mode-desc">Chọn độ khó và luyện tập kỹ năng cờ tướng.</span>
        </button>
      </div>

      {/* ── Quick-join ─────────────────────────────────── */}
      <form className="home-join" onSubmit={handleJoin} noValidate>
        <Input
          label="Vào phòng bằng mã"
          placeholder="VD: ABCD1234"
          value={roomCode}
          maxLength={8}
          autoComplete="off"
          error={codeError}
          onChange={(e) => {
            setRoomCode(e.target.value);
            if (codeError) setCodeError('');
          }}
        />
        <Button type="submit" variant="primary" loading={joining} disabled={isOffline}>
          Vào phòng
        </Button>
      </form>
    </section>
  );
}
