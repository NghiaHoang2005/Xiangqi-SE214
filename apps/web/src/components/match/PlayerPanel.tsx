import type { ConnectionState, Side } from '@xiangqi/shared';
import { Badge } from '../ui';

export interface CapturedPiece {
  label: string;
  side: Side;
}

export interface PlayerPanelProps {
  name: string;
  elo?: number;
  side: Side;
  isSelf?: boolean;
  isCurrentTurn: boolean;
  connectionState?: ConnectionState;
  clockText: string;
  isLowTime?: boolean;
  capturedPieces?: CapturedPiece[];
  statsText?: string;
}

const SIDE_META: Record<Side, { emblem: string; label: string }> = {
  RED: { emblem: '帥', label: 'Kỳ thủ Đỏ' },
  BLACK: { emblem: '將', label: 'Kỳ thủ Đen' },
};

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  CONNECTED: 'Đã kết nối',
  RECONNECTING: 'Đang kết nối lại',
  DISCONNECTED: 'Mất kết nối',
};

/**
 * Player info & turn card above (opponent) and below (self) the board.
 * Desktop matches Figma "04. Match"; mobile collapses to the compact 2-line layout.
 */
export function PlayerPanel({
  name,
  elo,
  side,
  isSelf = false,
  isCurrentTurn,
  connectionState = 'CONNECTED',
  clockText,
  isLowTime = false,
  capturedPieces = [],
  statsText,
}: PlayerPanelProps) {
  const sideMeta = SIDE_META[side];
  const roleLabel = isSelf ? sideMeta.label : 'Đối thủ';
  const showConnectionBadge = connectionState !== 'CONNECTED';

  return (
    <section
      className={`player-panel ${isCurrentTurn ? 'is-active-turn' : ''}`}
      data-side={side}
      data-active={isCurrentTurn ? 'true' : 'false'}
      aria-label={`${isSelf ? 'Thông tin của bạn' : 'Thông tin đối thủ'}: ${name}`}
    >
      <div className="player-panel-left">
        <div className="player-avatar" aria-hidden="true">
          <span className={`player-avatar-emblem is-${side.toLowerCase()}`}>
            {sideMeta.emblem}
          </span>
          <span
            className={`player-side-dot is-${side.toLowerCase()}`}
            title={sideMeta.label}
          />
        </div>

        <div className="player-meta">
          <div className="player-name-row">
            <span className="player-name">{name}</span>
            <span className="player-role">({roleLabel})</span>
            {elo !== undefined && <span className="player-elo-inline">({elo})</span>}

            {isCurrentTurn && (
              <Badge
                variant={isSelf ? 'danger' : 'neutral'}
                icon="●"
                className="player-turn-badge player-turn-desktop"
              >
                {isSelf ? 'Lượt của bạn' : 'Lượt đối thủ'}
              </Badge>
            )}

            {showConnectionBadge && (
              <Badge
                variant={connectionState === 'RECONNECTING' ? 'warning' : 'danger'}
                className="player-conn-badge"
              >
                {CONNECTION_LABEL[connectionState]}
              </Badge>
            )}
          </div>

          <div className="player-sub-row">
            {elo !== undefined && <span className="player-elo-pill">Elo {elo}</span>}
            {statsText && <span className="player-stats">{statsText}</span>}

            {/* Mobile compact row 2: turn pill + captured chips */}
            {isCurrentTurn && (
              <Badge
                variant={isSelf ? 'success' : 'neutral'}
                icon="●"
                className="player-turn-badge player-turn-mobile"
              >
                {isSelf ? 'Lượt của bạn' : 'Lượt đối thủ'}
              </Badge>
            )}
            {capturedPieces.length > 0 && (
              <ul className="player-captured-list player-captured-mobile" aria-label="Quân đã ăn">
                {capturedPieces.map((piece, idx) => (
                  <li
                    key={`m-${piece.side}-${piece.label}-${idx}`}
                    className={`captured-chip is-${piece.side.toLowerCase()}`}
                  >
                    {piece.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="player-captured" aria-label="Quân đã ăn">
        <span className="player-captured-label">Ăn:</span>
        {capturedPieces.length > 0 ? (
          <ul className="player-captured-list">
            {capturedPieces.map((piece, idx) => (
              <li
                key={`${piece.side}-${piece.label}-${idx}`}
                className={`captured-chip is-${piece.side.toLowerCase()}`}
              >
                {piece.label}
              </li>
            ))}
          </ul>
        ) : (
          <span className="player-captured-empty">—</span>
        )}
      </div>

      <div
        className={`player-clock ${isCurrentTurn ? 'is-running' : ''} ${isLowTime ? 'is-low' : ''}`}
        aria-label={`Đồng hồ ${name}: ${clockText}`}
      >
        <span className="player-clock-icon" aria-hidden="true">
          {isCurrentTurn ? '●' : '◷'}
        </span>
        <span className="player-clock-time">{clockText}</span>
      </div>
    </section>
  );
}
