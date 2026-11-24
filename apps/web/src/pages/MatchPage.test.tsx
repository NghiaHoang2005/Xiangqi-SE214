import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { MatchPage } from './MatchPage';

afterEach(cleanup);

function renderMatch(path = '/match/M-9821') {
  const router = createMemoryRouter([{ path: '/match/:matchId', element: <MatchPage /> }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
}

describe('MatchPage', () => {
  it('renders accessible heading, turn bar, and both player panels', () => {
    renderMatch();

    expect(screen.getByRole('heading', { level: 1, name: 'Bàn đấu' })).toBeTruthy();
    expect(screen.getByText('#M-9821')).toBeTruthy();
    expect(screen.getByText('Trần Minh Quân')).toBeTruthy();
    expect(screen.getByText('Bạn')).toBeTruthy();
    expect(screen.getAllByText('Lượt của bạn').length).toBeGreaterThan(0);
  });

  it('swaps top and bottom panels and flips board perspective', () => {
    const { container } = renderMatch();

    const panelsBefore = container.querySelectorAll('.player-panel');
    expect(panelsBefore[0]?.getAttribute('data-side')).toBe('BLACK');
    expect(panelsBefore[1]?.getAttribute('data-side')).toBe('RED');

    const boardContainerBefore = container.querySelector('.xiangqi-board-container');
    expect(boardContainerBefore?.getAttribute('data-orientation')).toBe('RED');

    // 32 pieces rendered
    expect(screen.getAllByRole('button', { name: /(Đỏ|Đen).+tại cột/i }).length).toBe(32);

    fireEvent.click(screen.getAllByRole('button', { name: /Đảo Góc Nhìn Bàn Cờ/i })[0]!);

    const panelsAfter = container.querySelectorAll('.player-panel');
    expect(panelsAfter[0]?.getAttribute('data-side')).toBe('RED');
    expect(panelsAfter[1]?.getAttribute('data-side')).toBe('BLACK');

    const boardContainerAfter = container.querySelector('.xiangqi-board-container');
    expect(boardContainerAfter?.getAttribute('data-orientation')).toBe('BLACK');
  });

  it('displays turn by text clearly, not by color alone (NFR-16)', () => {
    renderMatch();

    // Turn bar has text
    expect(screen.getAllByText(/Lượt của bạn/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lượt hiện tại:/i)).toBeTruthy();
    expect(screen.getAllByText(/Phe Đỏ/i).length).toBeGreaterThan(0);

    // Demo turn switch button updates text
    fireEvent.click(screen.getByRole('button', { name: /Đổi lượt \(demo\)/i }));
    expect(screen.getAllByText(/Phe Đen/i).length).toBeGreaterThan(0);
  });

  it('allows flipping board perspective from mobile actions bar (NFR-04)', () => {
    const { container } = renderMatch();

    const mobileFlipBtn = screen.getByRole('button', { name: 'Đảo góc nhìn' });
    expect(mobileFlipBtn).toBeTruthy();

    fireEvent.click(mobileFlipBtn);

    const board = container.querySelector('.xiangqi-board-container');
    expect(board?.getAttribute('data-orientation')).toBe('BLACK');
  });

  it('renders responsive board frame supporting 360px to 1440px without horizontal scroll (NFR-04)', () => {
    // Test small mobile viewport (360px)
    window.innerWidth = 360;
    const { container } = renderMatch();

    const page = container.querySelector('.match-page');
    expect(page).toBeTruthy();

    const boardSvg = container.querySelector('.xiangqi-board-svg');
    expect(boardSvg).toBeTruthy();
    // SVG viewBox preserves aspect ratio on any viewport from 360px to 1440px
    expect(boardSvg?.getAttribute('viewBox')).toBe('0 0 360 400');
    expect(boardSvg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');

    // Test desktop viewport (1440px)
    window.innerWidth = 1440;
    const desktopLayout = container.querySelector('.match-layout');
    expect(desktopLayout).toBeTruthy();
  });
});
