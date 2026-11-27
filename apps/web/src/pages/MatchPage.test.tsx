import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useConnectionStore } from '../stores/connection';
import { MatchPage } from './MatchPage';

afterEach(() => {
  cleanup();
  useConnectionStore.setState({ status: 'idle' });
});

const MATCH_ID = 'eedb11a5-a275-4fff-87b0-2ee5934477d7';

function renderMatch(path = `/match/${MATCH_ID}`) {
  const router = createMemoryRouter([{ path: '/match/:matchId', element: <MatchPage /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
}

function panels(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('.player-panel')];
}

describe('MatchPage', () => {
  it('renders accessible heading, turn bar, and both player panels', () => {
    renderMatch();

    expect(screen.getByRole('heading', { level: 1, name: 'Bàn đấu' })).toBeTruthy();
    expect(screen.getByText(`#${MATCH_ID.slice(0, 8)}`)).toBeTruthy();
    expect(screen.getByText('Bạn')).toBeTruthy();
    expect(screen.getByText('Kỳ thủ Đen')).toBeTruthy();
    expect(screen.getAllByText('Lượt của bạn').length).toBeGreaterThan(0);
  });

  it('shows only start-of-game values, not invented stats', () => {
    const { container } = renderMatch();

    expect(screen.getAllByText('10:00')).toHaveLength(2);
    expect(screen.getByText('Đồng hồ: 10 phút + 5 giây mỗi nước')).toBeTruthy();
    expect(screen.getByText('0 nước đi')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Elo|Độ trễ|Fair Play|Xếp Hạng|Thắng \d+%/);
  });

  it('keeps "you" on your own side when the board is flipped', () => {
    const { container } = renderMatch();

    const [topBefore, bottomBefore] = panels(container);
    expect(bottomBefore!.dataset.side).toBe('RED');
    expect(within(bottomBefore!).getByText('(Kỳ thủ Đỏ)')).toBeTruthy();
    expect(within(topBefore!).getByText('(Đối thủ)')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Đảo góc nhìn bàn cờ/ })[0]!);

    const [topAfter, bottomAfter] = panels(container);
    expect(topAfter!.dataset.side).toBe('RED');
    expect(within(topAfter!).getByText('(Kỳ thủ Đỏ)')).toBeTruthy();
    expect(within(bottomAfter!).getByText('(Đối thủ)')).toBeTruthy();
  });

  it('marks the opponent turn after the turn changes', () => {
    const { container } = renderMatch();

    fireEvent.click(screen.getByRole('button', { name: 'Đổi lượt (demo)' }));

    const [top, bottom] = panels(container);
    expect(top!.dataset.active).toBe('true');
    expect(within(top!).getAllByText('Lượt đối thủ').length).toBeGreaterThan(0);
    expect(bottom!.dataset.active).toBe('false');
  });

  it('disables draw and resign until those features exist', () => {
    renderMatch();

    for (const name of ['Cầu hòa', 'Đầu hàng']) {
      for (const button of screen.getAllByRole('button', { name })) {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      }
    }
    expect(screen.queryByRole('button', { name: /Xin thua|Trò chuyện/ })).toBeNull();
  });

  it('reports the real socket state instead of a fixed "connected"', () => {
    useConnectionStore.setState({ status: 'reconnecting' });
    renderMatch();

    expect(screen.getByRole('img', { name: 'Đang kết nối lại' })).toBeTruthy();
  });

  it('renders the starting position and flips the board with the panels', () => {
    const { container } = renderMatch();

    const board = () => container.querySelector('.xiangqi-board-container');
    expect(board()?.getAttribute('data-orientation')).toBe('RED');
    expect(screen.getAllByRole('button', { name: /(Đỏ|Đen).+tại cột/ })).toHaveLength(32);

    fireEvent.click(screen.getAllByRole('button', { name: /Đảo góc nhìn bàn cờ/ })[0]!);
    expect(board()?.getAttribute('data-orientation')).toBe('BLACK');

    fireEvent.click(screen.getByRole('button', { name: 'Đảo góc nhìn' }));
    expect(board()?.getAttribute('data-orientation')).toBe('RED');
  });

  it('scales the board SVG instead of overflowing on narrow screens (NFR-04)', () => {
    const { container } = renderMatch();

    const svg = container.querySelector('.xiangqi-board-svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 360 400');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('selects own piece on own turn, shows Rules Engine legal moves, and forbids enemy/off-turn selection (FR-08)', () => {
    const { container } = renderMatch();
    const boardContainer = () => container.querySelector('.xiangqi-board-container');

    // 1. Clicking Black General on Red turn does nothing
    fireEvent.click(screen.getByRole('button', { name: /Tướng Đen tại cột 5, hàng 10/ }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('0');
    expect(container.querySelector('.board-piece-token.is-selected')).toBeNull();

    // 2. Clicking Red Cannon at (1, 2) selects it and highlights 12 legal moves (11 quiet + 1 capture)
    const redCannon = screen.getByRole('button', { name: /Pháo Đỏ tại cột 2, hàng 3/ });
    fireEvent.click(redCannon);

    expect(redCannon.getAttribute('aria-pressed')).toBe('true');
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('12');
    expect(container.querySelectorAll('.legal-move-indicator')).toHaveLength(11);
    expect(container.querySelectorAll('.legal-capture-ring')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /Mã Đen tại cột 2, hàng 10, có thể ăn/ }),
    ).toBeTruthy();

    // 3. Clicking another Red piece switches selection to Horse at (1, 0) -> 2 legal moves
    fireEvent.click(screen.getByRole('button', { name: /Mã Đỏ tại cột 2, hàng 1/ }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('2');
    expect(screen.getByTestId('square-0-2').getAttribute('data-legal-move')).toBe('move');
    expect(screen.getByTestId('square-2-2').getAttribute('data-legal-move')).toBe('move');

    // 4. Clicking selected Horse again deselects it
    fireEvent.click(screen.getByRole('button', { name: /Mã Đỏ tại cột 2, hàng 1/ }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('0');

    // 5. Re-select Red piece, then switch turn to Black -> selection clears and Red piece cannot be selected
    fireEvent.click(screen.getByRole('button', { name: /Mã Đỏ tại cột 2, hàng 1/ }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Đổi lượt (demo)' }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: /Mã Đỏ tại cột 2, hàng 1/ }));
    expect(boardContainer()?.getAttribute('data-legal-count')).toBe('0');
    expect(container.querySelector('.board-piece-token.is-selected')).toBeNull();
  });
});
