import { TIME_CONTROL_PRESETS, type TimeControl } from '@xiangqi/shared';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { ApiRequestError } from '../lib/errors';
import { paths } from '../routes';
import { getServices, type SideChoice } from '../services';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';

/** Vietnamese label for a preset, e.g. "10 phút + 5 giây". */
export function timeControlLabel(tc: TimeControl): string {
  return `${tc.initialMinutes} phút + ${tc.incrementSeconds} giây`;
}

const timeControlKey = (tc: TimeControl) => `${tc.initialMinutes}+${tc.incrementSeconds}`;

const SIDE_OPTIONS: { value: SideChoice; label: string }[] = [
  { value: 'RED', label: 'Đỏ (đi trước)' },
  { value: 'BLACK', label: 'Đen' },
  { value: 'RANDOM', label: 'Ngẫu nhiên' },
];

const DEFAULT_CLOCK = '10+5';

/** E1: the server rejected the config. List what is allowed, from the same constants it uses. */
const INVALID_CONFIG_MESSAGE =
  `Cấu hình không hợp lệ. Đồng hồ: ${TIME_CONTROL_PRESETS.map(timeControlKey).join(', ')}. ` +
  `Phe: ${SIDE_OPTIONS.map((s) => s.label.replace(/ \(.*\)$/, '')).join(', ')}.`;

function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    switch (err.error.code) {
      case 'VALIDATION_FAILED':
        return INVALID_CONFIG_MESSAGE;
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return 'Không kết nối được máy chủ. Vui lòng thử lại.';
      case 'RATE_LIMITED':
        return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.';
    }
  }
  return 'Không tạo được phòng. Vui lòng thử lại.';
}

/**
 * Create a room to play a friend — US-13, UC-03 (FR-02, FR-05, CFG-05).
 * Host picks one of the six clocks and a side, then lands on the room page to share the link.
 */
export function CreateRoomPage() {
  const navigate = useNavigate();
  const sessionReady = useSessionStore((s) => s.status === 'ready');
  const connected = useConnectionStore((s) => s.status === 'connected');

  const [clock, setClock] = useState(DEFAULT_CLOCK);
  const [side, setSide] = useState<SideChoice>('RED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = sessionReady && connected && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const timeControl = TIME_CONTROL_PRESETS.find((p) => timeControlKey(p) === clock);
    if (!timeControl) {
      setError(INVALID_CONFIG_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const room = await getServices().room.createRoom({ timeControl, side });
      // Hand the snapshot to the room page so it can render before its own JoinRoom answers.
      navigate(paths.room(room.roomId), { state: { room } });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <section className="page create-room">
      <h1>Tạo phòng</h1>
      <p className="muted">Chọn đồng hồ và phe, rồi gửi link hoặc mã phòng cho bạn.</p>

      <form className="create-room-card" onSubmit={handleSubmit} noValidate>
        <fieldset className="choice-group">
          <legend>Đồng hồ</legend>
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
                  <span className="choice-main">{key}</span>
                  <span className="choice-sub">{timeControlLabel(tc)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="choice-group">
          <legend>Phe của bạn</legend>
          <div className="choice-grid choice-grid-3">
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
                <span className="choice-main">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

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

        <div className="create-room-actions">
          <Button type="button" variant="ghost" onClick={() => navigate(paths.home)}>
            Quay lại
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            Tạo phòng
          </Button>
        </div>
      </form>
    </section>
  );
}
