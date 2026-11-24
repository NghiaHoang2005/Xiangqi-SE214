import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConnectionState, Side, Square } from '@xiangqi/shared';
import { Button } from '../components/ui';
import { PlayerPanel, type CapturedPiece } from '../components/match/PlayerPanel';
import { TurnStatusBar } from '../components/match/TurnStatusBar';
import { XiangqiBoard } from '../components/board';

interface SeatInfo {
  name: string;
  elo: number;
  side: Side;
  connectionState: ConnectionState;
  clockText: string;
  statsText: string;
  capturedPieces: CapturedPiece[];
}

const DEFAULT_RED: SeatInfo = {
  name: 'Bạn',
  elo: 1200,
  side: 'RED',
  connectionState: 'CONNECTED',
  clockText: '09:18',
  statsText: 'Thắng 74% • Cấp 3',
  capturedPieces: [
    { label: '馬', side: 'BLACK' },
    { label: '卒', side: 'BLACK' },
  ],
};

const DEFAULT_BLACK: SeatInfo = {
  name: 'Trần Minh Quân',
  elo: 1245,
  side: 'BLACK',
  connectionState: 'CONNECTED',
  clockText: '08:45',
  statsText: 'Thắng 68% • Cấp 4',
  capturedPieces: [
    { label: '兵', side: 'RED' },
    { label: '兵', side: 'RED' },
    { label: '傌', side: 'RED' },
  ],
};

/**
 * Match screen — SCRUM-151: Render 9×10 Xiangqi board & perspective flip.
 * Integrates PlayerPanel, TurnStatusBar, and XiangqiBoard.
 */
export function MatchPage() {
  const { matchId = 'M-9821' } = useParams();
  const [bottomSide, setBottomSide] = useState<Side>('RED');
  const [currentTurn, setCurrentTurn] = useState<Side>('RED');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  const topSeat = bottomSide === 'RED' ? DEFAULT_BLACK : DEFAULT_RED;
  const bottomSeat = bottomSide === 'RED' ? DEFAULT_RED : DEFAULT_BLACK;

  const isTopSelf = topSeat.side === 'RED';
  const isBottomSelf = bottomSeat.side === 'RED';

  return (
    <div className="match-page">
      {/* Keep accessible H1 for router.test.tsx and screen readers */}
      <h1 className="sr-only">Bàn đấu</h1>

      <TurnStatusBar
        matchCode={matchId}
        currentTurn={currentTurn}
        onFlipBoard={() => setBottomSide((s) => (s === 'RED' ? 'BLACK' : 'RED'))}
      />

      <div className="match-layout">
        <div className="match-board-card">
          <PlayerPanel
            name={topSeat.name}
            elo={topSeat.elo}
            side={topSeat.side}
            isSelf={isTopSelf}
            isCurrentTurn={currentTurn === topSeat.side}
            connectionState={topSeat.connectionState}
            clockText={topSeat.clockText}
            statsText={topSeat.statsText}
            capturedPieces={topSeat.capturedPieces}
          />

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

          <PlayerPanel
            name={bottomSeat.name}
            elo={bottomSeat.elo}
            side={bottomSeat.side}
            isSelf={isBottomSelf}
            isCurrentTurn={currentTurn === bottomSeat.side}
            connectionState={bottomSeat.connectionState}
            clockText={bottomSeat.clockText}
            statsText={bottomSeat.statsText}
            capturedPieces={bottomSeat.capturedPieces}
          />
        </div>

        <aside className="match-sidebar" aria-label="Thông tin ván đấu">
          <section className="match-side-card">
            <div className="match-side-head">
              <span className="match-side-kicker">THÔNG SỐ TRẬN ĐẤU</span>
              <span className="match-side-tag">Bàn cờ 9 × 10</span>
            </div>
            <p className="match-side-desc">Cờ chớp: 10 phút + 5 giây (Fischer)</p>
            <div className="match-side-meta">
              <span>
                Lượt hiện tại: <strong>{currentTurn === 'RED' ? 'Phe Đỏ' : 'Phe Đen'}</strong>
              </span>
              <button
                type="button"
                className="match-demo-turn-btn"
                onClick={() => setCurrentTurn((t) => (t === 'RED' ? 'BLACK' : 'RED'))}
              >
                Đổi lượt (demo)
              </button>
            </div>
          </section>

          <section className="match-side-card">
            <div className="match-side-head">
              <h2 className="match-side-title">Biên Bản Ván Đấu</h2>
              <span className="match-side-tag">3 Nước Đi</span>
            </div>
            <p className="muted match-side-empty">Chưa có nước đi mới trong phiên này.</p>
          </section>

          <div className="match-actions-row">
            <Button variant="secondary" size="md" className="match-action-btn">
              Cầu Hòa
            </Button>
            <Button variant="danger" size="md" className="match-action-btn">
              Đầu Hàng
            </Button>
          </div>

          <button
            type="button"
            className="match-flip-link"
            onClick={() => setBottomSide((s) => (s === 'RED' ? 'BLACK' : 'RED'))}
          >
            ⇅ Đảo Góc Nhìn Bàn Cờ
          </button>
        </aside>
      </div>

      {/* Mobile compact bottom action bar matching Figma Mobile 04. Match */}
      <div className="match-mobile-actions" aria-label="Thao tác trận đấu">
        <button type="button" className="match-mob-btn">
          Cầu hòa
        </button>
        <button type="button" className="match-mob-btn is-danger">
          Xin thua
        </button>
        <button type="button" className="match-mob-btn">
          Trò chuyện
        </button>
        <button
          type="button"
          className="match-mob-btn"
          onClick={() => setBottomSide((s) => (s === 'RED' ? 'BLACK' : 'RED'))}
        >
          Đảo góc nhìn
        </button>
      </div>
    </div>
  );
}
