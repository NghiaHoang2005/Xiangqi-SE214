import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { XiangqiBoard, squareToScreen, screenToSquare } from './XiangqiBoard';

afterEach(cleanup);

describe('XiangqiBoard', () => {
  it('renders a 9×10 board with river and palaces', () => {
    const { container } = render(<XiangqiBoard />);

    // Board container region
    const boardRegion = screen.getByRole('region', { name: /Bàn cờ tướng 9×10/i });
    expect(boardRegion).toBeTruthy();

    // SVG elements
    const svg = container.querySelector('svg.xiangqi-board-svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 360 400');

    // River text
    expect(screen.getByText('楚 河')).toBeTruthy();
    expect(screen.getByText('漢 界')).toBeTruthy();
    expect(screen.getByText(/SỞ HÀ • HÁN GIỚI/i)).toBeTruthy();
  });

  it('renders all 32 pieces in standard starting position', () => {
    render(<XiangqiBoard />);

    const pieces = screen.getAllByRole('button', { name: /(Đỏ|Đen).+tại cột/i });
    expect(pieces.length).toBe(32);

    // 16 Red pieces and 16 Black pieces
    const redPieces = screen.getAllByRole('button', { name: /Đỏ.+tại cột/i });
    const blackPieces = screen.getAllByRole('button', { name: /Đen.+tại cột/i });
    expect(redPieces.length).toBe(16);
    expect(blackPieces.length).toBe(16);
  });

  it('orients Red at bottom when orientation is RED', () => {
    const { container } = render(<XiangqiBoard orientation="RED" />);

    // Red General is at { file: 4, rank: 0 }
    // In RED orientation, rank 0 is at bottom (screenRow 9, cy = 24 + 9 * 39 = 375, cx = 24 + 4 * 39 = 180)
    const redGeneral = container.querySelector(
      '.board-piece-token.is-red[transform="translate(180, 375)"]',
    );
    expect(redGeneral).toBeTruthy();

    // Black General is at { file: 4, rank: 9 }
    // In RED orientation, rank 9 is at top (screenRow 0, cy = 24 + 0 * 39 = 24, cx = 180)
    const blackGeneral = container.querySelector(
      '.board-piece-token.is-black[transform="translate(180, 24)"]',
    );
    expect(blackGeneral).toBeTruthy();
  });

  it('orients Black at bottom when orientation is BLACK (perspective flip)', () => {
    const { container } = render(<XiangqiBoard orientation="BLACK" />);

    // Black General is at { file: 4, rank: 9 }
    // In BLACK orientation, rank 9 is at bottom (screenRow 9, cy = 375, cx = 24 + (8-4)*39 = 180)
    const blackGeneral = container.querySelector(
      '.board-piece-token.is-black[transform="translate(180, 375)"]',
    );
    expect(blackGeneral).toBeTruthy();

    // Red General is at { file: 4, rank: 0 }
    // In BLACK orientation, rank 0 is at top (screenRow 0, cy = 24, cx = 180)
    const redGeneral = container.querySelector(
      '.board-piece-token.is-red[transform="translate(180, 24)"]',
    );
    expect(redGeneral).toBeTruthy();
  });

  it('announces turn in accessible label when provided', () => {
    render(<XiangqiBoard turn="RED" orientation="RED" />);
    expect(
      screen.getByRole('region', {
        name: 'Bàn cờ tướng 9×10, góc nhìn phe Đỏ, lượt: Phe Đỏ',
      }),
    ).toBeTruthy();
  });

  it('calls onPieceClick and onSquareClick when a piece or square is clicked', () => {
    const handlePieceClick = vi.fn();
    const handleSquareClick = vi.fn();

    render(
      <XiangqiBoard
        onPieceClick={handlePieceClick}
        onSquareClick={handleSquareClick}
        orientation="RED"
      />,
    );

    // Click Red General
    const redGeneral = screen.getByRole('button', { name: /Tướng Đỏ tại cột 5, hàng 1/i });
    fireEvent.click(redGeneral);

    expect(handlePieceClick).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GENERAL', side: 'RED' }),
      { file: 4, rank: 0 },
    );
    expect(handleSquareClick).toHaveBeenCalledWith({ file: 4, rank: 0 });
  });

  describe('coordinate mapping utilities', () => {
    it('correctly maps square to screen and back under RED orientation', () => {
      const redCorner = { file: 0, rank: 0 };
      const screenCoords = squareToScreen(redCorner, 'RED');
      expect(screenCoords.screenCol).toBe(0);
      expect(screenCoords.screenRow).toBe(9);
      expect(screenCoords.cx).toBe(24);
      expect(screenCoords.cy).toBe(375);

      const mappedBack = screenToSquare(screenCoords.screenCol, screenCoords.screenRow, 'RED');
      expect(mappedBack).toEqual(redCorner);
    });

    it('correctly maps square to screen and back under BLACK orientation', () => {
      const redCorner = { file: 0, rank: 0 };
      const screenCoords = squareToScreen(redCorner, 'BLACK');
      expect(screenCoords.screenCol).toBe(8);
      expect(screenCoords.screenRow).toBe(0);
      expect(screenCoords.cx).toBe(336);
      expect(screenCoords.cy).toBe(24);

      const mappedBack = screenToSquare(screenCoords.screenCol, screenCoords.screenRow, 'BLACK');
      expect(mappedBack).toEqual(redCorner);
    });
  });
});
