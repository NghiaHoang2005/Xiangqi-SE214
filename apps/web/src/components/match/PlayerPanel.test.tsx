import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerPanel } from './PlayerPanel';

afterEach(cleanup);

describe('PlayerPanel', () => {
  it('renders opponent black panel when waiting for turn', () => {
    render(
      <PlayerPanel
        name="Trần Minh Quân"
        elo={1245}
        side="BLACK"
        isCurrentTurn={false}
        clockText="08:45"
        capturedPieces={[{ label: '兵', side: 'RED' }]}
      />,
    );

    expect(screen.getByText('Trần Minh Quân')).toBeTruthy();
    expect(screen.getByText('(Đối thủ)')).toBeTruthy();
    expect(screen.getByText('Elo 1245')).toBeTruthy();
    expect(screen.getByText('將')).toBeTruthy();
    expect(screen.getByText('08:45')).toBeTruthy();
    expect(screen.getAllByText('兵').length).toBeGreaterThan(0);
    expect(screen.queryByText('Lượt của bạn')).toBeNull();
  });

  it('renders active turn badge and accent state for self when it is your turn', () => {
    const { container } = render(
      <PlayerPanel
        name="Bạn"
        elo={1200}
        side="RED"
        isSelf
        isCurrentTurn
        clockText="09:18"
      />,
    );

    const panel = container.querySelector('.player-panel');
    expect(panel?.getAttribute('data-active')).toBe('true');
    expect(panel?.getAttribute('data-side')).toBe('RED');
    expect(screen.getByText('(Kỳ thủ Đỏ)')).toBeTruthy();
    expect(screen.getAllByText('Lượt của bạn').length).toBeGreaterThan(0);
    expect(screen.getByText('帥')).toBeTruthy();
  });

  it('shows reconnecting and disconnected badges with text (NFR-16)', () => {
    const { rerender } = render(
      <PlayerPanel
        name="Đối thủ"
        side="BLACK"
        isCurrentTurn={false}
        connectionState="RECONNECTING"
        clockText="08:00"
      />,
    );
    expect(screen.getByText('Đang kết nối lại')).toBeTruthy();

    rerender(
      <PlayerPanel
        name="Đối thủ"
        side="BLACK"
        isCurrentTurn={false}
        connectionState="DISCONNECTED"
        clockText="08:00"
      />,
    );
    expect(screen.getByText('Mất kết nối')).toBeTruthy();
  });
});
