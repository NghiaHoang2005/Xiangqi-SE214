import type { CSSProperties, ReactElement } from 'react';
import type { Piece, PieceType, Side } from '@xiangqi/shared';

export interface PieceTokenProps {
  piece: Piece;
  cx: number;
  cy: number;
  radius?: number;
  selected?: boolean;
  isLastMove?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** id of the board's piece gradient; unique per board (see XiangqiBoard). */
  gradientId?: string;
}

/** Traditional Xiangqi characters for Red and Black pieces */
export const PIECE_CHARACTERS: Record<Side, Record<PieceType, string>> = {
  RED: {
    GENERAL: '帥',
    ADVISOR: '仕',
    ELEPHANT: '相',
    HORSE: '傌',
    CHARIOT: '俥',
    CANNON: '炮',
    SOLDIER: '兵',
  },
  BLACK: {
    GENERAL: '將',
    ADVISOR: '士',
    ELEPHANT: '象',
    HORSE: '馬',
    CHARIOT: '車',
    CANNON: '砲',
    SOLDIER: '卒',
  },
};

/** Vietnamese names for accessibility (FR-25, NFR-16) */
export const PIECE_NAMES_VI: Record<Side, Record<PieceType, string>> = {
  RED: {
    GENERAL: 'Tướng Đỏ',
    ADVISOR: 'Sĩ Đỏ',
    ELEPHANT: 'Tượng Đỏ',
    HORSE: 'Mã Đỏ',
    CHARIOT: 'Xe Đỏ',
    CANNON: 'Pháo Đỏ',
    SOLDIER: 'Binh Đỏ',
  },
  BLACK: {
    GENERAL: 'Tướng Đen',
    ADVISOR: 'Sĩ Đen',
    ELEPHANT: 'Tượng Đen',
    HORSE: 'Mã Đen',
    CHARIOT: 'Xe Đen',
    CANNON: 'Pháo Đen',
    SOLDIER: 'Tốt Đen',
  },
};

/**
 * PieceToken renders a single circular Chinese chess piece token inside an SVG board.
 * Supports authentic Chinese glyphs, wood-toned token styling, and selection states.
 */
export function PieceToken({
  piece,
  cx,
  cy,
  radius = 16,
  selected = false,
  isLastMove = false,
  onClick,
  ariaLabel,
  gradientId = 'piece-wood-gradient',
}: PieceTokenProps): ReactElement {
  const isRed = piece.side === 'RED';
  const char = PIECE_CHARACTERS[piece.side][piece.type];
  const nameVi = PIECE_NAMES_VI[piece.side][piece.type];
  const label = ariaLabel || `${nameVi}`;

  // Styling colors
  const strokeColor = isRed ? '#a82020' : '#262626';
  const textColor = isRed ? '#ba1a1a' : '#171717';
  const innerRingColor = isRed ? '#e0a0a0' : '#8c8c8c';

  return (
    <g
      className={`board-piece-token ${isRed ? 'is-red' : 'is-black'} ${selected ? 'is-selected' : ''} ${
        isLastMove ? 'is-last-move' : ''
      }`}
      transform={`translate(${cx}, ${cy})`}
      // Only a clickable piece is a button; otherwise it is a labelled image.
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{ cursor: onClick ? 'pointer' : 'default' } as CSSProperties}
    >
      {/* Outer subtle shadow */}
      <circle cx="0.5" cy="1.5" r={radius} fill="rgba(0, 0, 0, 0.28)" />

      {/* Piece wooden/ivory body */}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill={`url(#${gradientId})`}
        stroke={strokeColor}
        strokeWidth="1.6"
      />

      {/* Inner engraved ring */}
      <circle
        cx="0"
        cy="0"
        r={radius - 2.5}
        fill="none"
        stroke={innerRingColor}
        strokeWidth="0.8"
        strokeDasharray={selected ? '2 1' : undefined}
      />

      {/* Selection highlight halo */}
      {selected && (
        <circle
          cx="0"
          cy="0"
          r={radius + 2.5}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.2"
          className="piece-selection-halo"
        />
      )}

      {/* Last move indicator ring */}
      {isLastMove && !selected && (
        <circle
          cx="0"
          cy="0"
          r={radius + 2}
          fill="none"
          stroke="#eab308"
          strokeWidth="1.8"
          strokeDasharray="3 1.5"
        />
      )}

      {/* Traditional Chinese Character */}
      <text
        x="0"
        y="0"
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={radius * 1.15}
        fontWeight="bold"
        fontFamily='"Kaiti", "STKaiti", "Noto Serif SC", "SimSun", "Songti SC", "serif"'
        className="piece-character"
      >
        {char}
      </text>
    </g>
  );
}
