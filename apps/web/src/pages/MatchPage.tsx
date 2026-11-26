import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConnectionState, Side, TimeControl } from '@xiangqi/shared';
import { Button } from '../components/ui';
import { PlayerPanel, type CapturedPiece } from '../components/match/PlayerPanel';
import { TurnStatusBar } from '../components/match/TurnStatusBar';

interface SeatView {
  name: string;
  side: Side;
  connectionState: ConnectionState;
  clockMs: number;
  capturedPieces: CapturedPiece[];
}

interface MatchView {
  /** The side of the guest looking at this screen; decides "you" vs "opponent". */
  mySide: Side;
  timeControl: TimeControl;
  turn: Side;
  seats: Record<Side, SeatView>;
  moveCount: number;
}

/**
 * Start-of-game preview shown until the match state is wired in (MatchStarted / sync).
 * Only values a real match would have at move 0: no Elo, stats or captures yet.
 */
function previewMatch(): MatchView {
  const timeControl: TimeControl = { initialMinutes: 10, incrementSeconds: 5 };
  const clockMs = timeControl.initialMinutes * 60_000;
  const seat = (side: Side, name: string): SeatView => ({
    name,
    side,
    connectionState: 'CONNECTED',
    clockMs,
    capturedPieces: [],
  });
  return {
    mySide: 'RED',
    timeControl,
    turn: 'RED',
    seats: { RED: seat('RED', 'Bạn'), BLACK: seat('BLACK', 'Kỳ thủ Đen') },
    moveCount: 0,
  };
}

const otherSide = (side: Side): Side => (side === 'RED' ? 'BLACK' : 'RED');

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function timeControlText({ initialMinutes, incrementSeconds }: TimeControl): string {
  return incrementSeconds > 0
    ? `${initialMinutes} phút + ${incrementSeconds} giây mỗi nước`
    : `${initialMinutes} phút, không cộng giờ`;
}

/** Static 9×10 board frame placeholder until US-16 board renderer is wired in. */
function BoardFrame({ bottomSide }: { bottomSide: Side }) {
  const files = Array.from({ length: 9 }, (_, i) => i);
  const ranks = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div
      className="match-board-frame"
      role="img"
      aria-label={`Bàn cờ tướng 9×10 (góc nhìn phe ${bottomSide === 'RED' ? 'Đỏ' : 'Đen'})`}
    >
      <svg viewBox="0 0 360 400" className="match-board-svg" aria-hidden="true">
        <rect x="0" y="0" width="360" height="400" rx="8" fill="#e6cfa8" />
        <rect x="16" y="16" width="328" height="368" fill="none" stroke="#5c4028" strokeWidth="2" />

        {/* Horizontal rank lines */}
        {ranks.map((r) => {
          const y = 24 + r * 39;
          return (
            <line key={`r-${r}`} x1="24" y1={y} x2="336" y2={y} stroke="#6b4c30" strokeWidth="1" />
          );
        })}

        {/* Vertical file lines (split at the river between rank 4 and 5) */}
        {files.map((f) => {
          const x = 24 + f * 39;
          if (f === 0 || f === 8) {
            return (
              <line
                key={`f-${f}`}
                x1={x}
                y1="24"
                x2={x}
                y2="375"
                stroke="#6b4c30"
                strokeWidth="1"
              />
            );
          }
          return (
            <g key={`f-${f}`}>
              <line x1={x} y1="24" x2={x} y2="180" stroke="#6b4c30" strokeWidth="1" />
              <line x1={x} y1="219" x2={x} y2="375" stroke="#6b4c30" strokeWidth="1" />
            </g>
          );
        })}

        {/* Palace diagonals */}
        <line x1="141" y1="24" x2="219" y2="102" stroke="#6b4c30" strokeWidth="1" />
        <line x1="219" y1="24" x2="141" y2="102" stroke="#6b4c30" strokeWidth="1" />
        <line x1="141" y1="297" x2="219" y2="375" stroke="#6b4c30" strokeWidth="1" />
        <line x1="219" y1="297" x2="141" y2="375" stroke="#6b4c30" strokeWidth="1" />

        {/* River text */}
        <text x="72" y="205" fill="#6b4c30" fontSize="15" fontFamily="serif">
          楚 河
        </text>
        <text x="148" y="204" fill="#7d6146" fontSize="10" letterSpacing="1">
          SÔNG CHU HÀ
        </text>
        <text x="256" y="205" fill="#6b4c30" fontSize="15" fontFamily="serif">
          漢 界
        </text>
      </svg>
    </div>
  );
}

/**
 * Match screen — US-16 / SCRUM-152 (Panel thông tin lượt/đối thủ).
 */
export function MatchPage() {
  const { matchId = '' } = useParams();
  const [match] = useState(previewMatch);
  const [bottomSide, setBottomSide] = useState<Side>(match.mySide);
  const [currentTurn, setCurrentTurn] = useState<Side>(match.turn);

  const flipBoard = () => setBottomSide(otherSide);
  const renderSeat = (side: Side) => {
    const seat = match.seats[side];
    return (
      <PlayerPanel
        name={seat.name}
        side={seat.side}
        isSelf={seat.side === match.mySide}
        isCurrentTurn={currentTurn === seat.side}
        connectionState={seat.connectionState}
        clockText={formatClock(seat.clockMs)}
        capturedPieces={seat.capturedPieces}
      />
    );
  };

  return (
    <div className="match-page">
      {/* Keep accessible H1 for router.test.tsx and screen readers */}
      <h1 className="sr-only">Bàn đấu</h1>

      <TurnStatusBar
        matchCode={matchId.slice(0, 8)}
        modeLabel="Phòng riêng"
        currentTurn={currentTurn}
        onFlipBoard={flipBoard}
      />

      <div className="match-layout">
        <div className="match-board-card">
          {renderSeat(otherSide(bottomSide))}
          <BoardFrame bottomSide={bottomSide} />
          {renderSeat(bottomSide)}
        </div>

        <aside className="match-sidebar" aria-label="Thông tin ván đấu">
          <section className="match-side-card">
            <div className="match-side-head">
              <span className="match-side-kicker">THÔNG SỐ TRẬN ĐẤU</span>
              <span className="match-side-tag">Bàn cờ 9 × 10</span>
            </div>
            <p className="match-side-desc">Đồng hồ: {timeControlText(match.timeControl)}</p>
            <div className="match-side-meta">
              <span>
                Lượt hiện tại: <strong>{currentTurn === 'RED' ? 'Phe Đỏ' : 'Phe Đen'}</strong>
              </span>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  className="match-demo-turn-btn"
                  onClick={() => setCurrentTurn(otherSide)}
                >
                  Đổi lượt (demo)
                </button>
              )}
            </div>
          </section>

          <section className="match-side-card">
            <div className="match-side-head">
              <h2 className="match-side-title">Biên Bản Ván Đấu</h2>
              <span className="match-side-tag">{match.moveCount} nước đi</span>
            </div>
            {match.moveCount === 0 && (
              <p className="muted match-side-empty">Chưa có nước đi nào.</p>
            )}
          </section>

          {/* Draw offer and resign arrive with US-21/US-22; disabled until then. */}
          <div className="match-actions-row">
            <Button variant="secondary" size="md" className="match-action-btn" disabled>
              Cầu hòa
            </Button>
            <Button variant="danger" size="md" className="match-action-btn" disabled>
              Đầu hàng
            </Button>
          </div>

          <button type="button" className="match-flip-link" onClick={flipBoard}>
            ⇅ Đảo góc nhìn bàn cờ
          </button>
        </aside>
      </div>

      {/* Mobile compact bottom action bar matching Figma Mobile 04. Match */}
      <div className="match-mobile-actions" role="group" aria-label="Thao tác trận đấu">
        <button type="button" className="match-mob-btn" disabled>
          Cầu hòa
        </button>
        <button type="button" className="match-mob-btn is-danger" disabled>
          Đầu hàng
        </button>
        <button type="button" className="match-mob-btn" onClick={flipBoard}>
          Đảo góc nhìn
        </button>
      </div>
    </div>
  );
}
