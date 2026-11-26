import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Input } from '../components/ui';
import { paths } from '../routes';
import { retryConnection } from '../session/bootstrap';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';

/**
 * Room code format: 8 uppercase alphanumeric characters.
 * This mirrors the server's joinCode column (Prisma schema).
 */
const ROOM_CODE_RE = /^[A-Z0-9]{8}$/;

/** Normalises user input so we accept lowercase and strips whitespace. */
function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function HomePage() {
  const status = useConnectionStore((s) => s.status);
  const sessionReady = useSessionStore((s) => s.status === 'ready');
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);

  const isConnecting = status === 'connecting' || status === 'idle';
  // UC-01 step 5: modes open only once the guest session is ready.
  const isOffline = status !== 'connected' || !sessionReady;

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
    <div className="home-page">
      {/* ── Decorative watermark background ─────────────── */}
      <img
        src="/assets/watermark-top-right.svg"
        alt=""
        aria-hidden="true"
        className="home-watermark home-watermark-tr"
      />
      <img
        src="/assets/watermark-bottom-left.svg"
        alt=""
        aria-hidden="true"
        className="home-watermark home-watermark-bl"
      />

      {/* ── Hero header ─────────────────────────────────── */}
      <section className="home-hero">
        {/* Badge tag */}
        <div className="home-badge">
          <span className="home-badge-dot" aria-hidden="true" />
          <span>HỆ THỐNG ĐẤU KỲ CHUẨN QUỐC TẾ</span>
        </div>

        {/* H1 — keep lowercase for router.test.tsx; CSS makes it uppercase */}
        <h1 className="home-title">Cờ Tướng Trực Tuyến</h1>
        <div className="home-title-bar" aria-hidden="true" />

        <p className="home-subtitle">
          Đấu trí cùng bạn bè, rèn luyện với AI hoặc tranh tài xếp hạng đỉnh cao trong không gian
          thư họa tinh tế.
        </p>
      </section>

      {/* ── Service-unavailable banner (E2) ─────────────── */}
      <div className="home-banner-region" aria-live="polite">
        {isOffline && (
          <div
            className={`home-banner ${status === 'disconnected' ? 'home-banner-danger' : 'home-banner-warning'}`}
            role="alert"
          >
            <Badge
              variant={isConnecting ? 'warning' : status === 'reconnecting' ? 'warning' : 'danger'}
            >
              {isConnecting
                ? 'Đang kết nối đến máy chủ…'
                : status === 'reconnecting'
                  ? 'Đang kết nối lại…'
                  : 'Mất kết nối đến máy chủ'}
            </Badge>
            <p className="home-banner-text">
              {isConnecting
                ? 'Vui lòng chờ trong giây lát…'
                : 'Dịch vụ hiện không khả dụng. Vui lòng thử lại.'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={isConnecting}
              disabled={isConnecting}
              onClick={retryConnection}
            >
              Thử lại
            </Button>
          </div>
        )}
      </div>

      {/* ── Mode cards ─────────────────────────────────── */}
      <section className="home-modes" aria-label="Chọn chế độ chơi">
        <button
          type="button"
          className="mode-card"
          disabled={isOffline}
          onClick={() => navigate(paths.room('new'))}
        >
          <div className="mode-icon-wrap">
            <img
              src="/assets/icon-friend.svg"
              alt=""
              aria-hidden="true"
              className="mode-icon-img"
              width="28"
              height="28"
            />
          </div>
          <span className="mode-label">Chơi với bạn</span>
          <span className="mode-desc">
            Tạo phòng riêng hoặc chia sẻ liên kết tức thì cho bạn bè khắp mọi nơi.
          </span>
          <span className="mode-btn">Tạo phòng mới</span>
        </button>

        <button
          type="button"
          className="mode-card"
          disabled={isOffline}
          onClick={() => navigate(paths.aiSetup)}
        >
          <div className="mode-icon-wrap">
            <img
              src="/assets/icon-ai.svg"
              alt=""
              aria-hidden="true"
              className="mode-icon-img"
              width="28"
              height="28"
            />
          </div>
          <span className="mode-label">Chơi với máy</span>
          <span className="mode-desc">
            Luyện tập cùng động cơ AI thông minh với 3 cấp độ: Dễ, Vừa, Khó.
          </span>
          <span className="mode-btn">Chơi ngay</span>
        </button>
      </section>

      {/* ── Quick-join ─────────────────────────────────── */}
      <section className="home-join-section">
        <div className="home-join-container">
          <div className="home-join-card">
            <h2 className="home-join-title">Vào phòng bằng mã</h2>
            <form className="home-join" onSubmit={handleJoin} noValidate>
              <div className="home-join-row">
                <Input
                  id="room-code-input"
                  label="Nhập mã 8 ký tự:"
                  aria-label="Vào phòng bằng mã"
                  placeholder="VD: ABCD1234"
                  value={roomCode}
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
              </div>
            </form>
          </div>

          <div className="home-ticker">
            <div className="home-ticker-item">
              <span className="home-ticker-dot" aria-hidden="true" />
              <span>1,482 kỳ thủ đang online</span>
            </div>
            <div className="home-ticker-item">
              <img
                src="/assets/icon-trophy.svg"
                alt=""
                aria-hidden="true"
                className="home-ticker-trophy"
                width="14"
                height="14"
              />
              <span>Mùa giải 12 đang diễn ra</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="home-footer">
        <p>© 2026 Cờ Tướng Online - Đồ án môn học SE214. All rights reserved.</p>
      </footer>
    </div>
  );
}
