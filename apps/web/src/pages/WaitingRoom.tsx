import {
  SIDES,
  type ConnectionState,
  type RoomView,
  type SeatView,
  type Side,
} from '@xiangqi/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Dialog, useOptionalToast } from '../components/ui';
import { paths } from '../routes';
import {
  CLOCK_NAMES,
  clockHint,
  formatStartingClock,
  timeControlKey,
  timeControlLabel,
} from '../room/timeControl';
import { guestDisplayName } from '../session/SessionBar';
import { useSessionStore } from '../stores/session';

export interface WaitingRoomProps {
  room: RoomView;
  /** Host-only action to close the room so its link and code stop working (UC-03 A1). */
  onCloseRoom?: () => Promise<void> | void;
  closing?: boolean;
  closeError?: string;
}

type CopyTarget = 'code' | 'link';

const SIDE_META: Record<Side, { name: string; role: string; emblem: string }> = {
  RED: { name: 'Phe Đỏ', role: 'Đi trước', emblem: '帥' },
  BLACK: { name: 'Phe Đen', role: 'Đi sau', emblem: '將' },
};

const SEAT_CONNECTION: Record<
  ConnectionState,
  { label: string; variant: 'success' | 'warning' | 'danger' }
> = {
  CONNECTED: { label: 'Đã kết nối', variant: 'success' },
  RECONNECTING: { label: 'Đang kết nối lại…', variant: 'warning' },
  DISCONNECTED: { label: 'Mất kết nối', variant: 'danger' },
};

const EXPIRY_POLL_MS = 30_000;
const COPY_FEEDBACK_MS = 2500;

function buildInviteUrl(roomId: string): string {
  const path = paths.room(roomId);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

function remainingMinutesUntil(expiresAt: string, nowMs: number): number | null {
  const targetMs = Date.parse(expiresAt);
  if (Number.isNaN(targetMs)) return null;
  return Math.max(0, Math.ceil((targetMs - nowMs) / 60_000));
}

async function writeClipboard(value: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Waiting room screen — US-15 (SCRUM-149).
 * Shows player count, side assignments, invite code/link with copy buttons,
 * idle room expiry notice (BR-20), and pre-match unstarted clock state (FR-06).
 */
export function WaitingRoom({
  room,
  onCloseRoom,
  closing = false,
  closeError = '',
}: WaitingRoomProps) {
  const navigate = useNavigate();
  const toast = useOptionalToast();
  const currentGuestId = useSessionStore((s) => s.session?.guestId ?? null);

  const linkInputId = useId();
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), EXPIRY_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const inviteUrl = buildInviteUrl(room.roomId);
  const seatsBySide = new Map<Side, SeatView>(room.seats.map((seat) => [seat.side, seat]));
  const isHost = currentGuestId !== null && room.hostGuestId === currentGuestId;
  const startingClock = formatStartingClock(room.timeControl.initialMinutes);
  const presetName = CLOCK_NAMES[timeControlKey(room.timeControl)];
  const remainingMinutes = remainingMinutesUntil(room.expiresAt, nowMs);
  const isFull = room.seats.length >= SIDES.length;
  const yourSideMeta = room.yourSide ? SIDE_META[room.yourSide] : null;

  async function handleCopy(target: CopyTarget, text: string) {
    const label = target === 'code' ? 'mã phòng' : 'liên kết phòng';
    const ok = await writeClipboard(text);
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);

    if (ok) {
      const msg = `Đã sao chép ${label}.`;
      setCopied(target);
      setCopyFailed(false);
      setCopyMessage(msg);
      toast?.show({ title: 'Thành công', message: msg, variant: 'success' });
    } else {
      const msg = `Không thể tự động sao chép ${label}. Vui lòng chọn và sao chép thủ công.`;
      setCopied(null);
      setCopyFailed(true);
      setCopyMessage(msg);
      toast?.show({ title: 'Lưu ý', message: msg, variant: 'warning' });
    }

    copyTimer.current = window.setTimeout(() => {
      setCopied(null);
      setCopyFailed(false);
      setCopyMessage('');
    }, COPY_FEEDBACK_MS);
  }

  async function handleConfirmClose() {
    if (!onCloseRoom) return;
    await onCloseRoom();
    setConfirmClose(false);
  }

  return (
    <section className="waiting-room" aria-label="Phòng chờ trận đấu">
      <div className="waiting-room-topbar">
        <button type="button" className="create-room-back" onClick={() => navigate(paths.home)}>
          <img src="/assets/icon-arrow-left.svg" alt="" aria-hidden="true" width="10" height="10" />
          Về trang chủ
        </button>
        <div className="waiting-room-mode">
          <span className="muted">Chế độ:</span>
          <Badge variant="neutral">Giao hữu trực tuyến</Badge>
        </div>
      </div>

      {/* ── Banner: Title, player count, code & share link ── */}
      <header className="waiting-banner">
        <div className="waiting-banner-intro">
          <div className="waiting-title-row">
            <h1 className="waiting-title">Phòng chờ</h1>
            <span className="waiting-hash-tag" aria-hidden="true">
              #{room.joinCode}
            </span>
            <Badge
              variant={isFull ? 'success' : 'warning'}
              icon={isFull ? '✓' : '●'}
              role="status"
              aria-live="polite"
            >
              {isFull
                ? `Đủ kỳ thủ (${room.seats.length}/2 người chơi)`
                : `Đang chờ đối thủ… (${room.seats.length}/2 người chơi)`}
            </Badge>
          </div>
          <p className="waiting-lead">
            Mời đối thủ bằng cách gửi mã phòng 8 ký tự hoặc sao chép liên kết mời trực tiếp bên
            cạnh.
            {yourSideMeta && (
              <>
                {' '}
                Bạn cầm <strong>{yourSideMeta.name}</strong> ({yourSideMeta.role.toLowerCase()}).
              </>
            )}
          </p>
        </div>

        <div className="waiting-share">
          <div className="waiting-code-box">
            <div className="waiting-code-meta">
              <span className="waiting-share-kicker">Mã phòng</span>
              <strong className="waiting-code-value" data-testid="room-join-code">
                {room.joinCode}
              </strong>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void handleCopy('code', room.joinCode)}
            >
              {copied === 'code' ? '✓ Đã sao chép mã' : 'Sao chép mã'}
            </Button>
          </div>

          <div className="waiting-link-box">
            <label htmlFor={linkInputId} className="sr-only">
              Liên kết mời vào phòng
            </label>
            <input
              id={linkInputId}
              type="text"
              className="input-field waiting-link-input"
              value={inviteUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Liên kết mời vào phòng"
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleCopy('link', inviteUrl)}
            >
              {copied === 'link' ? '✓ Đã sao chép liên kết' : 'Sao chép liên kết'}
            </Button>
          </div>

          <div className="waiting-copy-feedback" aria-live="polite">
            {copyMessage && (
              <p className={copyFailed ? 'waiting-copy-warn' : 'waiting-copy-ok'} role="status">
                {copyMessage}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── Main 2-column grid ───────────────────────────── */}
      <div className="waiting-grid">
        {/* Left: Player seats */}
        <section className="waiting-card" aria-label="Kỳ thủ tham gia">
          <div className="waiting-card-head">
            <div>
              <h2 className="waiting-card-title">Kỳ thủ tham gia</h2>
              <p className="waiting-card-desc">
                Ván đấu tự động bắt đầu ngay khi đủ 2 người chơi trong phòng.
              </p>
            </div>
            <span className="waiting-chip-tag">Bàn chuẩn 9×10</span>
          </div>

          <div className="waiting-seats">
            {SIDES.map((side) => {
              const meta = SIDE_META[side];
              const seat = seatsBySide.get(side);
              const isSelfSeat = seat !== undefined && seat.guestId === currentGuestId;
              const isHostSeat = seat !== undefined && seat.guestId === room.hostGuestId;
              const conn = seat ? SEAT_CONNECTION[seat.connectionState] : null;

              return (
                <article
                  key={side}
                  className={`waiting-seat is-${side.toLowerCase()} ${
                    seat ? 'is-occupied' : 'is-empty'
                  }`}
                  data-side={side}
                  aria-label={`${meta.name}: ${seat ? guestDisplayName(seat) : 'Đang chờ đối thủ'}`}
                >
                  <div className="waiting-seat-left">
                    <div
                      className={`waiting-seat-emblem is-${side.toLowerCase()}`}
                      aria-hidden="true"
                    >
                      {meta.emblem}
                    </div>
                    <div className="waiting-seat-meta">
                      <div className="waiting-seat-name-row">
                        <span className="waiting-seat-name">
                          {seat ? guestDisplayName(seat) : 'Đang chờ đối thủ…'}
                        </span>
                        {isSelfSeat && <span className="waiting-seat-tag">(Bạn)</span>}
                        {isHostSeat && <Badge variant="neutral">Chủ phòng</Badge>}
                      </div>
                      <div className="waiting-seat-sub">
                        <span className={`waiting-side-pill is-${side.toLowerCase()}`}>
                          {meta.name} • {meta.role}
                        </span>
                        {conn ? (
                          <Badge variant={conn.variant} className="waiting-seat-conn">
                            {conn.label}
                          </Badge>
                        ) : (
                          <span className="muted">Ghế trống — gửi mã hoặc liên kết để mời</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="waiting-seat-clock"
                    aria-label={`Đồng hồ ${meta.name}: ${startingClock}, chưa chạy`}
                  >
                    <span className="waiting-clock-digits">
                      <span aria-hidden="true">◷</span> {startingClock}
                    </span>
                    <span className="waiting-clock-state">Chưa chạy</span>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="create-room-note">
            <img src="/assets/icon-info.svg" alt="" aria-hidden="true" width="17" height="17" />
            Người cầm quân Đỏ sẽ đi trước theo truyền thống cờ tướng phương Đông.
          </p>
        </section>

        {/* Right: Time control (read-only), clock notice, expiry notice */}
        <section className="waiting-card" aria-label="Thông số phòng và đồng hồ">
          <div className="waiting-card-head">
            <div>
              <h2 className="waiting-card-title">Cấu hình thời gian ván đấu</h2>
              <p className="waiting-card-desc">Thiết lập đã chọn khi tạo phòng (chỉ xem)</p>
            </div>
            <Badge variant="neutral" icon="●">
              Đồng hồ chưa chạy
            </Badge>
          </div>

          <div className="waiting-time-summary">
            <div className="waiting-time-main">
              <img src="/assets/icon-timer.svg" alt="" aria-hidden="true" width="18" height="20" />
              <div>
                <div className="waiting-time-value">{timeControlLabel(room.timeControl)}</div>
                {presetName && <div className="waiting-time-preset">{presetName}</div>}
              </div>
            </div>
            <div className="waiting-clock-preview">
              <span className="muted">Mốc xuất phát mỗi bên</span>
              <strong>{startingClock} (Tạm dừng)</strong>
            </div>
          </div>

          <p className="create-room-note">
            <img src="/assets/icon-timer.svg" alt="" aria-hidden="true" width="14" height="16" />
            {clockHint(room.timeControl)} Đồng hồ thi đấu chỉ bắt đầu tính giờ khi đủ 2 kỳ thủ vào
            trận.
          </p>

          <div className="waiting-expiry-box" role="note">
            <img src="/assets/icon-warning.svg" alt="" aria-hidden="true" width="16" height="16" />
            <div>
              <strong>Hạn phòng chờ: 30 phút</strong>
              <p className="waiting-expiry-desc">
                {remainingMinutes !== null && remainingMinutes > 0
                  ? `Phòng ở trạng thái chờ (WAITING) sẽ tự động đóng sau 30 phút không hoạt động (còn khoảng ${remainingMinutes} phút).`
                  : 'Phòng ở trạng thái chờ (WAITING) đã hết hạn 30 phút không hoạt động.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer actions ───────────────────────────────── */}
      <footer className="waiting-actions">
        <div className="waiting-actions-feedback" aria-live="polite">
          {closeError ? (
            <p className="create-room-error" role="alert">
              {closeError}
            </p>
          ) : (
            <p className="muted">
              Bạn có thể sao chép mã hoặc liên kết phía trên để gửi cho bạn bè. Ván đấu sẽ tự mở khi
              đối thủ vào phòng.
            </p>
          )}
        </div>
        <div className="waiting-actions-buttons">
          <Button type="button" variant="secondary" onClick={() => navigate(paths.home)}>
            Về trang chủ
          </Button>
          {isHost && onCloseRoom && (
            <Button
              type="button"
              variant="danger"
              loading={closing}
              disabled={closing}
              onClick={() => setConfirmClose(true)}
            >
              Đóng phòng
            </Button>
          )}
        </div>
      </footer>

      <Dialog
        open={confirmClose}
        onClose={() => {
          if (!closing) setConfirmClose(false);
        }}
        title="Đóng phòng chờ?"
        description="Sau khi đóng, liên kết mời và mã phòng này sẽ hết hiệu lực ngay lập tức."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={closing}
              onClick={() => setConfirmClose(false)}
            >
              Giữ phòng
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={closing}
              disabled={closing}
              onClick={() => void handleConfirmClose()}
            >
              Xác nhận đóng phòng
            </Button>
          </>
        }
      />
    </section>
  );
}
