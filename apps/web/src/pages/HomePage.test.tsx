import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnectionStore } from '../stores/connection';
import { HomePage } from './HomePage';

/* ── Mocks ──────────────────────────────────────────────── */

// Mock socket module so we can spy on connectSocket
vi.mock('../lib/socket', () => ({
  connectSocket: vi.fn(),
  getSocket: vi.fn(() => ({ connected: false })),
}));

// Mock useNavigate to avoid AbortSignal issues in jsdom + Node 26
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { connectSocket } from '../lib/socket';

afterEach(cleanup);

/** Render HomePage inside a memory router (for context providers). */
function renderHome() {
  const router = createMemoryRouter([{ path: '/', element: <HomePage /> }], {
    initialEntries: ['/'],
  });
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
  return router;
}

/** Set connection status in the store. */
function setStatus(status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting') {
  useConnectionStore.getState().setStatus(status);
}

describe('HomePage', () => {
  beforeEach(() => {
    // Start each test with a connected state (default happy path)
    setStatus('connected');
    vi.clearAllMocks();
  });

  /* ── Basic rendering ───────────────────────────────── */

  it('renders the main heading (router.test.tsx depends on this)', () => {
    renderHome();
    const h1 = screen.getByRole('heading', { level: 1, name: 'Cờ Tướng Trực Tuyến' });
    expect(h1).toBeTruthy();
  });

  it('renders two mode choices', () => {
    renderHome();
    expect(screen.getByText('Chơi với bạn')).toBeTruthy();
    expect(screen.getByText('Chơi với máy')).toBeTruthy();
  });

  it('renders the room code input', () => {
    renderHome();
    expect(screen.getByLabelText('Vào phòng bằng mã')).toBeTruthy();
  });

  /* ── Navigation ────────────────────────────────────── */

  it('navigates to /room/new when "Chơi với bạn" is clicked', () => {
    renderHome();
    fireEvent.click(screen.getByText('Chơi với bạn'));
    expect(mockNavigate).toHaveBeenCalledWith('/room/new');
  });

  it('navigates to /play/ai when "Chơi với máy" is clicked', () => {
    renderHome();
    fireEvent.click(screen.getByText('Chơi với máy'));
    expect(mockNavigate).toHaveBeenCalledWith('/play/ai');
  });

  /* ── Room code validation ──────────────────────────── */

  it('shows error when submitting empty room code', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    expect(screen.getByText('Vui lòng nhập mã phòng.')).toBeTruthy();
  });

  it('shows error for invalid room code (too short)', () => {
    renderHome();
    const input = screen.getByLabelText('Vào phòng bằng mã') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ABC' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    expect(screen.getByText('Mã phòng gồm 8 ký tự chữ hoặc số.')).toBeTruthy();
  });

  it('shows error for room code with special chars', () => {
    renderHome();
    const input = screen.getByLabelText('Vào phòng bằng mã') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'AB@D1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    expect(screen.getByText('Mã phòng gồm 8 ký tự chữ hoặc số.')).toBeTruthy();
  });

  it('navigates to /room/:code for a valid 8-char code', () => {
    renderHome();
    const input = screen.getByLabelText('Vào phòng bằng mã') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcd1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    // Input is normalised to uppercase
    expect(mockNavigate).toHaveBeenCalledWith('/room/ABCD1234');
  });

  it('normalises pasted room code with leading and trailing whitespace', () => {
    renderHome();
    const input = screen.getByLabelText('Vào phòng bằng mã') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   abcd1234   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    expect(mockNavigate).toHaveBeenCalledWith('/room/ABCD1234');
  });

  it('clears the error when the user starts typing again', () => {
    renderHome();
    // Trigger an error first
    fireEvent.click(screen.getByRole('button', { name: 'Vào phòng' }));
    expect(screen.getByText('Vui lòng nhập mã phòng.')).toBeTruthy();
    // Start typing → error should clear
    const input = screen.getByLabelText('Vào phòng bằng mã') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'A' } });
    expect(screen.queryByText('Vui lòng nhập mã phòng.')).toBeNull();
  });

  /* ── Offline / service-unavailable (E2) ────────────── */

  it('shows service-unavailable banner when disconnected', () => {
    setStatus('disconnected');
    renderHome();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Mất kết nối đến máy chủ')).toBeTruthy();
    expect(screen.getByText('Thử lại')).toBeTruthy();
  });

  it('shows reconnecting text with warning badge when reconnecting', () => {
    setStatus('reconnecting');
    renderHome();
    const badgeText = screen.getByText('Đang kết nối lại…');
    expect(badgeText).toBeTruthy();
    const badgeEl = badgeText.closest('.badge');
    expect(badgeEl?.className).toContain('badge-warning');
  });

  it('shows connecting state and loading spinner on retry button when connecting', () => {
    setStatus('connecting');
    renderHome();
    expect(screen.getByText('Đang kết nối đến máy chủ…')).toBeTruthy();
    expect(screen.getByText('Vui lòng chờ trong giây lát…')).toBeTruthy();
    const retryBtn = screen.getByText('Thử lại').closest('button') as HTMLButtonElement;
    expect(retryBtn.disabled).toBe(true);
    expect(retryBtn.className).toContain('btn-loading');
  });

  it('disables mode cards when offline', () => {
    setStatus('disconnected');
    renderHome();
    const friendBtn = screen.getByText('Chơi với bạn').closest('button') as HTMLButtonElement;
    const aiBtn = screen.getByText('Chơi với máy').closest('button') as HTMLButtonElement;
    expect(friendBtn.disabled).toBe(true);
    expect(aiBtn.disabled).toBe(true);
  });

  it('calls connectSocket when retry button is clicked', () => {
    setStatus('disconnected');
    renderHome();
    fireEvent.click(screen.getByText('Thử lại'));
    expect(connectSocket).toHaveBeenCalledTimes(1);
  });

  it('does not show banner when connected', () => {
    setStatus('connected');
    renderHome();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
