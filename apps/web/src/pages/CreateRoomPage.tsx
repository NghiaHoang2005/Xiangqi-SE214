import { ErrorCode, TIME_CONTROL_PRESETS, type SidePreference } from '@xiangqi/shared';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { ApiRequestError } from '../lib/errors';
import { paths } from '../routes';
import { CLOCK_NAMES, clockHint, timeControlKey } from '../room/timeControl';
import { getServices } from '../services';
import { withSession } from '../session/bootstrap';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';

const SIDE_OPTIONS: { value: SidePreference; label: string; hint: string }[] = [
  { value: 'RED', label: 'Đỏ', hint: 'Đi trước' },
  { value: 'BLACK', label: 'Đen', hint: 'Đi sau' },
  { value: 'RANDOM', label: 'Ngẫu nhiên', hint: 'Bốc thăm khi tạo phòng' },
];

const DEFAULT_CLOCK = '10+5';

/** E1: the server rejected the config. List what is allowed, from the same constants it uses. */
const INVALID_CONFIG_MESSAGE =
  `Cấu hình không hợp lệ. Đồng hồ: ${TIME_CONTROL_PRESETS.map(timeControlKey).join(', ')}. ` +
  `Phe: ${SIDE_OPTIONS.map((s) => s.label).join(', ')}.`;

function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    switch (err.error.code) {
      case ErrorCode.VALIDATION_FAILED:
        return INVALID_CONFIG_MESSAGE;
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return 'Không kết nối được máy chủ. Vui lòng thử lại.';
      case ErrorCode.RATE_LIMITED:
        return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.';
    }
  }
  return 'Không tạo được phòng. Vui lòng thử lại.';
}

/** US-13 / UC-03 (FR-02, FR-05, CFG-05): the host picks a clock and a side before the room exists. */
export function CreateRoomPage() {
  const navigate = useNavigate();
  const sessionReady = useSessionStore((s) => s.status === 'ready');
  const connected = useConnectionStore((s) => s.status === 'connected');

  const [clock, setClock] = useState(DEFAULT_CLOCK);
  const [side, setSide] = useState<SidePreference>('RED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = sessionReady && connected && !submitting;
  const selectedClock = TIME_CONTROL_PRESETS.find((p) => timeControlKey(p) === clock);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!selectedClock) {
      setError(INVALID_CONFIG_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const room = await withSession(() =>
        getServices().room.createRoom({ timeControl: selectedClock, preferredSide: side }),
      );
      // Hand the snapshot to the room page so it can render before its own JoinRoom answers.
      navigate(paths.room(room.roomId), { state: { room } });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <section className="create-room">
      <button type="button" className="create-room-back" onClick={() => navigate(paths.home)}>
        <img src="/assets/icon-arrow-left.svg" alt="" aria-hidden="true" width="10" height="10" />
        Về trang chủ
      </button>

      <header className="create-room-header">
        <h1 className="create-room-title">Tạo phòng chơi với bạn</h1>
        <p className="create-room-lead">
          Chọn đồng hồ và phe cầm quân, rồi gửi mã phòng hoặc liên kết cho bạn bè.
        </p>
      </header>

      <form className="create-room-form" onSubmit={handleSubmit} noValidate>
        <div className="create-room-grid">
          <fieldset className="create-room-card">
            <legend className="create-room-card-title">Cấu hình thời gian ván đấu</legend>
            <p className="create-room-card-desc">
              Lựa chọn chế độ suy nghĩ phù hợp với cả hai kỳ thủ
            </p>
            <div className="choice-grid">
              {TIME_CONTROL_PRESETS.map((tc) => {
                const key = timeControlKey(tc);
                return (
                  <label key={key} className="choice">
                    <input
                      type="radio"
                      name="clock"
                      value={key}
                      checked={clock === key}
                      onChange={() => setClock(key)}
                      disabled={submitting}
                    />
                    <span className="choice-text">
                      <span className="choice-main">
                        {tc.initialMinutes} phút | +{tc.incrementSeconds}s
                      </span>
                      <span className="choice-sub">{CLOCK_NAMES[key]}</span>
                    </span>
                    <img
                      className="choice-check"
                      src="/assets/icon-check-circle.svg"
                      alt=""
                      aria-hidden="true"
                      width="17"
                      height="17"
                    />
                  </label>
                );
              })}
            </div>
            {selectedClock && (
              <p className="create-room-note">
                <img
                  src="/assets/icon-timer.svg"
                  alt=""
                  aria-hidden="true"
                  width="14"
                  height="16"
                />
                {clockHint(selectedClock)}
              </p>
            )}
          </fieldset>

          <fieldset className="create-room-card">
            <legend className="create-room-card-title">Phe cầm quân</legend>
            <p className="create-room-card-desc">Phe của bạn khi đối thủ vào phòng</p>
            <div className="choice-list">
              {SIDE_OPTIONS.map((opt) => (
                <label key={opt.value} className="choice">
                  <input
                    type="radio"
                    name="side"
                    value={opt.value}
                    checked={side === opt.value}
                    onChange={() => setSide(opt.value)}
                    disabled={submitting}
                  />
                  <span
                    className={`side-dot side-dot-${opt.value.toLowerCase()}`}
                    aria-hidden="true"
                  />
                  <span className="choice-text">
                    <span className="choice-main">{opt.label}</span>
                    <span className="choice-sub">{opt.hint}</span>
                  </span>
                  <img
                    className="choice-check"
                    src="/assets/icon-check-circle.svg"
                    alt=""
                    aria-hidden="true"
                    width="17"
                    height="17"
                  />
                </label>
              ))}
            </div>
            <p className="create-room-note">
              <img src="/assets/icon-info.svg" alt="" aria-hidden="true" width="17" height="17" />
              Người cầm quân Đỏ sẽ đi trước theo truyền thống cờ tướng phương Đông.
            </p>
          </fieldset>
        </div>

        <div className="create-room-actions">
          <div className="create-room-feedback" aria-live="polite">
            {error && (
              <p className="create-room-error" role="alert">
                {error}
              </p>
            )}
            {!error && !(sessionReady && connected) && (
              <p className="muted">Đang kết nối đến máy chủ…</p>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!canSubmit}
          >
            Tạo phòng
          </Button>
        </div>
      </form>
    </section>
  );
}
