import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConnectionState, Side, Square, TimeControl } from '@xiangqi/shared';
import { XiangqiBoard } from '../components/board';
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

/**
 * Match screen — US-16: turn/opponent panels (SCRUM-152) and the 9×10 board with
 * perspective flip (SCRUM-151).
 */
export function MatchPage() {
  const { matchId = '' } = useParams();
  const [match] = useState(previewMatch);
  const [bottomSide, setBottomSide] = useState<Side>(match.mySide);
  const [currentTurn, setCurrentTurn] = useState<Side>(match.turn);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

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
          <XiangqiBoard
            orientation={bottomSide}
            turn={currentTurn}
            selectedSquare={selectedSquare}
            onSquareClick={(sq) =>
              setSelectedSquare((prev) =>
                prev?.file === sq.file && prev?.rank === sq.rank ? null : sq,
              )
            }
          />
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
