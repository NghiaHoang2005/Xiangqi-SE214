import type { CSSProperties, ReactElement } from 'react';
import {
  BOARD_FILES,
  BOARD_RANKS,
  type Piece,
  type Side,
  type Square,
  squareToIndex,
} from '@xiangqi/shared';
import { createInitialPosition, type Board } from '@xiangqi/rules';
import { PieceToken, PIECE_NAMES_VI } from './PieceToken';

export interface XiangqiBoardProps {
  /** The 90-cell board array. Defaults to initialPosition standard starting position. */
  board?: Board;
  /** Perspective: RED (Red at bottom) or BLACK (Black at bottom). Defaults to RED. */
  orientation?: Side;
  /** Current turn side for accessible announcements */
  turn?: Side;
  /** Currently selected square, if any */
  selectedSquare?: Square | null;
  /** Last executed move to highlight */
  lastMove?: { from: Square; to: Square } | null;
  /** Callback when any intersection square is clicked */
  onSquareClick?: (square: Square) => void;
  /** Callback when a piece is clicked */
  onPieceClick?: (piece: Piece, square: Square) => void;
  /** Custom class name for the wrapper */
  className?: string;
  /** Optional ID for testing or routing */
  id?: string;
}

// Board SVG geometry constants
const CELL_SIZE = 39;
const ORIGIN_X = 24;
const ORIGIN_Y = 24;
const BOARD_WIDTH = 360;
const BOARD_HEIGHT = 400;

/** Convert logical Square (file 0..8, rank 0..9) to SVG screen coordinates */
export function squareToScreen(
  square: Square,
  orientation: Side = 'RED',
): { cx: number; cy: number; screenCol: number; screenRow: number } {
  const screenCol = orientation === 'RED' ? square.file : BOARD_FILES - 1 - square.file;
  const screenRow = orientation === 'RED' ? BOARD_RANKS - 1 - square.rank : square.rank;

  const cx = ORIGIN_X + screenCol * CELL_SIZE;
  const cy = ORIGIN_Y + screenRow * CELL_SIZE;

  return { cx, cy, screenCol, screenRow };
}

/** Convert SVG screen grid indices to logical Square */
export function screenToSquare(
  screenCol: number,
  screenRow: number,
  orientation: Side = 'RED',
): Square {
  const file = orientation === 'RED' ? screenCol : BOARD_FILES - 1 - screenCol;
  const rank = orientation === 'RED' ? BOARD_RANKS - 1 - screenRow : screenRow;

  return { file, rank };
}

/** Check if two squares are identical */
function isSameSquare(a: Square | null | undefined, b: Square | null | undefined): boolean {
  if (!a || !b) return false;
  return a.file === b.file && a.rank === b.rank;
}

/** Generate SVG path for intersection corner marks (L-marks) */
function renderCornerMarkPath(
  cx: number,
  cy: number,
  left: boolean,
  right: boolean,
  top: boolean,
  bottom: boolean,
): string {
  const arm = 4;
  const gap = 3;
  let d = '';

  if (left && top) {
    d += `M ${cx - gap - arm} ${cy - gap} H ${cx - gap} V ${cy - gap - arm} `;
  }
  if (right && top) {
    d += `M ${cx + gap + arm} ${cy - gap} H ${cx + gap} V ${cy - gap - arm} `;
  }
  if (left && bottom) {
    d += `M ${cx - gap - arm} ${cy + gap} H ${cx - gap} V ${cy + gap + arm} `;
  }
  if (right && bottom) {
    d += `M ${cx + gap + arm} ${cy + gap} H ${cx + gap} V ${cy + gap + arm} `;
  }

  return d;
}

/** Standard cannon & soldier intersection positions in logical coordinates */
const CORNER_MARK_POSITIONS: ReadonlyArray<{ file: number; rank: number }> = [
  // Cannons
  { file: 1, rank: 2 },
  { file: 7, rank: 2 },
  { file: 1, rank: 7 },
  { file: 7, rank: 7 },
  // Soldiers
  { file: 0, rank: 3 },
  { file: 2, rank: 3 },
  { file: 4, rank: 3 },
  { file: 6, rank: 3 },
  { file: 8, rank: 3 },
  { file: 0, rank: 6 },
  { file: 2, rank: 6 },
  { file: 4, rank: 6 },
  { file: 6, rank: 6 },
  { file: 8, rank: 6 },
];

/**
 * XiangqiBoard component renders a traditional 9×10 Chinese chess board (FR-07).
 * Supports:
 * - 9 files × 10 ranks with River (Sở Hà - Hán Giới) and Palaces (Cửu cung).
 * - Perspective flipping (orientation: RED | BLACK) without modifying logical coordinates (NFR-04).
 * - Accessible text labels and Vietnamese piece announcements (NFR-16, FR-25).
 * - Responsive 360px - 1440px rendering with zero horizontal overflow (NFR-04).
 */
export function XiangqiBoard({
  board = createInitialPosition().board,
  orientation = 'RED',
  turn,
  selectedSquare,
  lastMove,
  onSquareClick,
  onPieceClick,
  className = '',
  id,
}: XiangqiBoardProps): ReactElement {
  const files = Array.from({ length: BOARD_FILES }, (_, i) => i);
  const ranks = Array.from({ length: BOARD_RANKS }, (_, i) => i);

  const orientationText = orientation === 'RED' ? 'Đỏ' : 'Đen';
  const turnText = turn ? `, lượt: Phe ${turn === 'RED' ? 'Đỏ' : 'Đen'}` : '';
  const accessibleBoardLabel = `Bàn cờ tướng 9×10, góc nhìn phe ${orientationText}${turnText}`;

  // Pre-calculate pieces with screen coordinates
  const pieceNodes: ReactElement[] = [];
  for (let rank = 0; rank < BOARD_RANKS; rank++) {
    for (let file = 0; file < BOARD_FILES; file++) {
      const square: Square = { file, rank };
      const index = squareToIndex(square);
      const piece = board[index];

      if (piece) {
        const { cx, cy } = squareToScreen(square, orientation);
        const isSelected = isSameSquare(selectedSquare, square);
        const isLastMoveSquare =
          isSameSquare(lastMove?.from, square) || isSameSquare(lastMove?.to, square);

        const handlePieceClick = () => {
          if (onPieceClick) onPieceClick(piece, square);
          if (onSquareClick) onSquareClick(square);
        };

        pieceNodes.push(
          <PieceToken
            key={`piece-${file}-${rank}-${piece.side}-${piece.type}`}
            piece={piece}
            cx={cx}
            cy={cy}
            radius={16}
            selected={isSelected}
            isLastMove={isLastMoveSquare}
            onClick={onPieceClick || onSquareClick ? handlePieceClick : undefined}
            ariaLabel={`${PIECE_NAMES_VI[piece.side][piece.type]} tại cột ${
              file + 1
            }, hàng ${rank + 1}`}
          />,
        );
      }
    }
  }

  return (
    <div
      id={id}
      className={`xiangqi-board-container ${className}`.trim()}
      data-orientation={orientation}
      aria-label={accessibleBoardLabel}
      role="region"
    >
      <svg
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="xiangqi-board-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Wood board gradient */}
          <linearGradient id="board-wood-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3ddb6" />
            <stop offset="50%" stopColor="#edd0a4" />
            <stop offset="100%" stopColor="#e2c191" />
          </linearGradient>

          {/* Piece wood gradient */}
          <radialGradient id="piece-wood-gradient" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fbf3df" />
            <stop offset="100%" stopColor="#e8cf9f" />
          </radialGradient>
        </defs>

        {/* Board wooden table background */}
        <rect
          x="0"
          y="0"
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          rx="10"
          fill="url(#board-wood-gradient)"
        />

        {/* Outer board border frame */}
        <rect
          x="14"
          y="14"
          width="332"
          height="372"
          rx="4"
          fill="none"
          stroke="#52391e"
          strokeWidth="2.5"
        />
        <rect
          x="18"
          y="18"
          width="324"
          height="364"
          fill="none"
          stroke="#8c6843"
          strokeWidth="0.8"
        />

        {/* Horizontal rank lines (10 lines) */}
        {ranks.map((r) => {
          const y = ORIGIN_Y + r * CELL_SIZE;
          return (
            <line
              key={`rank-line-${r}`}
              x1={ORIGIN_X}
              y1={y}
              x2={ORIGIN_X + 8 * CELL_SIZE}
              y2={y}
              stroke="#5c4028"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Vertical file lines (9 files, files 1..7 split at the river) */}
        {files.map((f) => {
          const x = ORIGIN_X + f * CELL_SIZE;
          if (f === 0 || f === 8) {
            return (
              <line
                key={`file-line-${f}`}
                x1={x}
                y1={ORIGIN_Y}
                x2={x}
                y2={ORIGIN_Y + 9 * CELL_SIZE}
                stroke="#5c4028"
                strokeWidth="1.2"
              />
            );
          }
          return (
            <g key={`file-line-split-${f}`}>
              {/* Top half */}
              <line
                x1={x}
                y1={ORIGIN_Y}
                x2={x}
                y2={ORIGIN_Y + 4 * CELL_SIZE}
                stroke="#5c4028"
                strokeWidth="1.2"
              />
              {/* Bottom half */}
              <line
                x1={x}
                y1={ORIGIN_Y + 5 * CELL_SIZE}
                x2={x}
                y2={ORIGIN_Y + 9 * CELL_SIZE}
                stroke="#5c4028"
                strokeWidth="1.2"
              />
            </g>
          );
        })}

        {/* Top Palace Diagonals (screen rows 0 to 2, cols 3 to 5) */}
        <line
          x1={ORIGIN_X + 3 * CELL_SIZE}
          y1={ORIGIN_Y}
          x2={ORIGIN_X + 5 * CELL_SIZE}
          y2={ORIGIN_Y + 2 * CELL_SIZE}
          stroke="#5c4028"
          strokeWidth="1.2"
        />
        <line
          x1={ORIGIN_X + 5 * CELL_SIZE}
          y1={ORIGIN_Y}
          x2={ORIGIN_X + 3 * CELL_SIZE}
          y2={ORIGIN_Y + 2 * CELL_SIZE}
          stroke="#5c4028"
          strokeWidth="1.2"
        />

        {/* Bottom Palace Diagonals (screen rows 7 to 9, cols 3 to 5) */}
        <line
          x1={ORIGIN_X + 3 * CELL_SIZE}
          y1={ORIGIN_Y + 7 * CELL_SIZE}
          x2={ORIGIN_X + 5 * CELL_SIZE}
          y2={ORIGIN_Y + 9 * CELL_SIZE}
          stroke="#5c4028"
          strokeWidth="1.2"
        />
        <line
          x1={ORIGIN_X + 5 * CELL_SIZE}
          y1={ORIGIN_Y + 7 * CELL_SIZE}
          x2={ORIGIN_X + 3 * CELL_SIZE}
          y2={ORIGIN_Y + 9 * CELL_SIZE}
          stroke="#5c4028"
          strokeWidth="1.2"
        />

        {/* Intersection corner marks (Cannons and Soldiers) */}
        {CORNER_MARK_POSITIONS.map((pos) => {
          const { cx, cy, screenCol } = squareToScreen(pos, orientation);
          const isLeftEdge = screenCol === 0;
          const isRightEdge = screenCol === 8;
          const path = renderCornerMarkPath(cx, cy, !isLeftEdge, !isRightEdge, true, true);
          return (
            <path
              key={`mark-${pos.file}-${pos.rank}`}
              d={path}
              stroke="#5c4028"
              strokeWidth="1"
              fill="none"
            />
          );
        })}

        {/* River text (Sở Hà - Hán Giới) */}
        <g className="river-text-group" opacity="0.88">
          <text
            x="68"
            y={ORIGIN_Y + 4.58 * CELL_SIZE}
            fill="#5c4028"
            fontSize="15"
            fontWeight="bold"
            fontFamily='"Kaiti", "STKaiti", "Noto Serif SC", serif'
            textAnchor="middle"
            dominantBaseline="middle"
          >
            楚 河
          </text>
          <text
            x="180"
            y={ORIGIN_Y + 4.58 * CELL_SIZE}
            fill="#75512b"
            fontSize="9"
            fontWeight="600"
            letterSpacing="2"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            SỞ HÀ • HÁN GIỚI
          </text>
          <text
            x="292"
            y={ORIGIN_Y + 4.58 * CELL_SIZE}
            fill="#5c4028"
            fontSize="15"
            fontWeight="bold"
            fontFamily='"Kaiti", "STKaiti", "Noto Serif SC", serif'
            textAnchor="middle"
            dominantBaseline="middle"
          >
            漢 界
          </text>
        </g>

        {/* Selected square highlight underneath pieces */}
        {selectedSquare &&
          (() => {
            const { cx, cy } = squareToScreen(selectedSquare, orientation);
            return (
              <circle
                cx={cx}
                cy={cy}
                r={18}
                fill="rgba(37, 99, 235, 0.22)"
                stroke="#2563eb"
                strokeWidth="2"
              />
            );
          })()}

        {/* Clickable intersection targets for all 90 squares */}
        {ranks.map((screenRow) =>
          files.map((screenCol) => {
            const square = screenToSquare(screenCol, screenRow, orientation);
            const { cx, cy } = squareToScreen(square, orientation);
            return (
              <circle
                key={`intersect-hit-${screenCol}-${screenRow}`}
                cx={cx}
                cy={cy}
                r={16}
                fill="transparent"
                style={{ cursor: onSquareClick ? 'pointer' : 'default' } as CSSProperties}
                onClick={() => onSquareClick?.(square)}
                data-testid={`square-${square.file}-${square.rank}`}
              />
            );
          }),
        )}

        {/* 32 Pieces */}
        {pieceNodes}
      </svg>
    </div>
  );
}
