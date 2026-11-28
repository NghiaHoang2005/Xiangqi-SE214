import type { RoomView } from '@xiangqi/shared';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui';
import { useSessionStore } from '../stores/session';
import { WaitingRoom } from './WaitingRoom';

const HOST_ID = '11111111-1111-4111-8111-111111111111';
const OPPONENT_ID = '22222222-2222-4222-8222-222222222222';

function sampleRoom(overrides: Partial<RoomView> = {}): RoomView {
  return {
    roomId: 'room_token_abc123456789012345678901234567890',
    joinCode: 'ABCD2345',
    status: 'WAITING',
    timeControl: { initialMinutes: 10, incrementSeconds: 5 },
    hostGuestId: HOST_ID,
    hostSide: 'RED',
    yourSide: 'RED',
    seats: [
      {
        side: 'RED',
        guestId: HOST_ID,
        nickname: 'Minh Quân',
        connectionState: 'CONNECTED',
      },
    ],
    matchId: null,
    expiresAt: new Date(Date.now() + 25 * 60_000).toISOString(),
    ...overrides,
  };
}

function renderWaiting(
  room: RoomView,
  props: { onCloseRoom?: () => Promise<void> | void; closing?: boolean; closeError?: string } = {},
) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <WaitingRoom room={room} {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useSessionStore.getState().setSession({
    guestId: HOST_ID,
    nickname: 'Minh Quân',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    isNew: false,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useSessionStore.setState({ status: 'idle', session: null, error: null });
});

describe('WaitingRoom', () => {
  it('renders player count, sides, join code, invite link, expiry notice, and unstarted clocks', () => {
    const room = sampleRoom();
    renderWaiting(room);

    expect(screen.getByRole('heading', { level: 1, name: 'Phòng chờ' })).toBeTruthy();
    expect(screen.getByText(/1\/2 người chơi/)).toBeTruthy();
    expect(screen.getByTestId('room-join-code').textContent).toBe('ABCD2345');

    const linkInput = screen.getByLabelText('Liên kết mời vào phòng') as HTMLInputElement;
    expect(linkInput.value).toBe(`${window.location.origin}/room/${room.roomId}`);
    expect(linkInput.readOnly).toBe(true);

    expect(screen.getByText('Minh Quân')).toBeTruthy();
    expect(screen.getByText('Chủ phòng')).toBeTruthy();
    expect(screen.getByText(/Phe Đỏ • Đi trước/)).toBeTruthy();
    expect(screen.getByText(/Phe Đen • Đi sau/)).toBeTruthy();
    expect(screen.getByText('Đang chờ đối thủ…')).toBeTruthy();

    expect(screen.getByText('10 phút | +5s')).toBeTruthy();
    expect(screen.getByText('Đồng hồ chưa chạy')).toBeTruthy();
    expect(screen.getAllByText('Chưa chạy').length).toBe(2);
    expect(screen.getByText(/Hạn phòng chờ: 30 phút/)).toBeTruthy();
  });

  it('copies the join code and shows confirmation feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const room = sampleRoom();
    renderWaiting(room);

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABCD2345'));
    expect(screen.getByRole('button', { name: /Đã sao chép mã/ })).toBeTruthy();
    expect(screen.getAllByText('Đã sao chép mã phòng.').length).toBeGreaterThan(0);
  });

  it('copies the full invite link and shows confirmation feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const room = sampleRoom();
    renderWaiting(room);

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }));

    const expectedUrl = `${window.location.origin}/room/${room.roomId}`;
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expectedUrl));
    expect(screen.getByRole('button', { name: /Đã sao chép liên kết/ })).toBeTruthy();
    expect(screen.getAllByText('Đã sao chép liên kết phòng.').length).toBeGreaterThan(0);
  });

  it('shows a manual-copy fallback message when clipboard access fails', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderWaiting(sampleRoom());

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }));

    expect(
      (await screen.findAllByText(/Không thể tự động sao chép liên kết phòng/)).length,
    ).toBeGreaterThan(0);
  });

  it('updates seat list and connection text when room updates arrive', () => {
    const initial = sampleRoom({
      hostSide: 'BLACK',
      yourSide: 'BLACK',
      seats: [
        {
          side: 'BLACK',
          guestId: HOST_ID,
          nickname: 'Minh Quân',
          connectionState: 'CONNECTED',
        },
      ],
    });

    const { rerender } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <WaitingRoom room={initial} />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/1\/2 người chơi/)).toBeTruthy();

    const updated = sampleRoom({
      hostSide: 'BLACK',
      yourSide: 'BLACK',
      seats: [
        {
          side: 'RED',
          guestId: OPPONENT_ID,
          nickname: 'Kỳ thủ B',
          connectionState: 'RECONNECTING',
        },
        {
          side: 'BLACK',
          guestId: HOST_ID,
          nickname: 'Minh Quân',
          connectionState: 'CONNECTED',
        },
      ],
    });

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <WaitingRoom room={updated} />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/2\/2 người chơi/)).toBeTruthy();
    expect(screen.getByText('Kỳ thủ B')).toBeTruthy();
    expect(screen.getByText('Đang kết nối lại…')).toBeTruthy();
  });

  it('allows only the host to confirm and close the room', async () => {
    const onCloseRoom = vi.fn().mockResolvedValue(undefined);
    renderWaiting(sampleRoom(), { onCloseRoom });

    fireEvent.click(screen.getByRole('button', { name: 'Đóng phòng' }));
    expect(screen.getByRole('dialog', { name: 'Đóng phòng chờ?' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đóng phòng' }));
    await waitFor(() => expect(onCloseRoom).toHaveBeenCalledTimes(1));

    cleanup();
    useSessionStore.getState().setSession({
      guestId: OPPONENT_ID,
      nickname: 'Khách khác',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      isNew: false,
    });
    renderWaiting(sampleRoom(), { onCloseRoom });
    expect(screen.queryByRole('button', { name: 'Đóng phòng' })).toBeNull();
  });
});
