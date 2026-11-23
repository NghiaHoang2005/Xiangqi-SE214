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

  it('swaps top and bottom panels when flipping board perspective', () => {
    const { container } = renderMatch();

    const panelsBefore = container.querySelectorAll('.player-panel');
    expect(panelsBefore[0]?.getAttribute('data-side')).toBe('BLACK');
    expect(panelsBefore[1]?.getAttribute('data-side')).toBe('RED');

    fireEvent.click(screen.getAllByRole('button', { name: /Đảo Góc Nhìn Bàn Cờ/i })[0]!);

    const panelsAfter = container.querySelectorAll('.player-panel');
    expect(panelsAfter[0]?.getAttribute('data-side')).toBe('RED');
    expect(panelsAfter[1]?.getAttribute('data-side')).toBe('BLACK');
  });
});
