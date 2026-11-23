import { Link } from 'react-router-dom';
import type { Side } from '@xiangqi/shared';
import { paths } from '../../routes';

export interface TurnStatusBarProps {
  matchCode: string;
  modeLabel?: string;
  currentTurn: Side;
  isLive?: boolean;
  onFlipBoard?: () => void;
}

/**
 * Match sub-header (Desktop white card) and compact top bar (Mobile)
 * matching Figma "04. Match" & "Mobile - 04. Match" (v3).
 */
export function TurnStatusBar({
  matchCode,
  modeLabel = 'Đấu Trường Xếp Hạng',
  currentTurn,
  isLive = true,
  onFlipBoard,
}: TurnStatusBarProps) {
  const turnLabel = currentTurn === 'RED' ? 'Phe Đỏ' : 'Phe Đen';

  return (
    <div className="turn-bar">
      <div className="turn-bar-left">
        <Link to={paths.home} className="turn-back-btn" aria-label="Quay lại">
          ←
        </Link>
        <span className="turn-mode-title">
          <span className="turn-mode-dot" aria-hidden="true" />
          {modeLabel}
        </span>
        <span className="turn-bar-sep" aria-hidden="true">
          •
        </span>
        <span className="turn-room-pill">
          <span className="turn-room-prefix">Phòng </span>#{matchCode}
        </span>
      </div>

      <div className="turn-bar-center">
        <span
          className={`turn-status-pill is-${currentTurn.toLowerCase()}`}
          role="status"
          aria-live="polite"
        >
          <span className="turn-status-dot" aria-hidden="true" />
          {isLive && <span className="turn-live-prefix">Đang diễn ra • </span>}
          <span className="turn-desktop-label">
            Lượt đi: <strong>{turnLabel}</strong>
          </span>
          <span className="turn-mobile-label">
            Lượt: <strong>{turnLabel}</strong>
          </span>
        </span>
      </div>

      <div className="turn-bar-right">
        <span className="turn-latency-pill">Độ trễ: 18ms</span>
        <span className="turn-fairplay-text">
          Trọng tài AI: <strong>Hợp lệ (Fair Play)</strong>
        </span>

        {/* Mobile header actions matching Figma Mobile 04. Match */}
        <span className="turn-mob-icon" aria-hidden="true" title="Âm thanh">
          🔊
        </span>
        {onFlipBoard && (
          <button
            type="button"
            className="turn-flip-btn"
            onClick={onFlipBoard}
            title="Đảo góc nhìn bàn cờ"
            aria-label="Đảo góc nhìn bàn cờ"
          >
            ⇅
          </button>
        )}
        <span className="turn-mob-conn-dot" aria-hidden="true" title="Đã kết nối" />
        <span className="turn-mob-avatar" aria-hidden="true">
          👤
        </span>
      </div>
    </div>
  );
}
