import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../lib/errors';
import { setServicesForTests, type GuestSession, type Services } from '../services';
import { createMemoryStorage, createMockServices } from '../services/mock';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';
import { ensureSession, resetSessionForTests } from './bootstrap';
import { validateNickname } from './NicknameDialog';
import { guestDisplayName, SessionBar } from './SessionBar';

function mockServices(): Services {
  return createMockServices({ latencyMs: 0, sessionStorage: createMemoryStorage() });
}

beforeEach(() => {
  resetSessionForTests();
  useConnectionStore.getState().setStatus('idle');
});

afterEach(() => {
  cleanup();
  setServicesForTests(null);
});

describe('ensureSession', () => {
  it('creates the session, then connects', async () => {
    const services = mockServices();
    const connect = vi.spyOn(services, 'connect');
    setServicesForTests(services);

    await ensureSession();
    expect(useSessionStore.getState()).toMatchObject({ status: 'ready', error: null });
    expect(useSessionStore.getState().session?.isNew).toBe(true);
    expect(connect).toHaveBeenCalledOnce();
  });

  it('shares one request between concurrent calls and skips a ready session', async () => {
    const services = mockServices();
    const bootstrap = vi.spyOn(services.session, 'bootstrap');
    setServicesForTests(services);

    await Promise.all([ensureSession(), ensureSession()]);
    await ensureSession();
    expect(bootstrap).toHaveBeenCalledOnce();
  });

  it('stores the error and does not connect when the server is unreachable', async () => {
    const services = mockServices();
    const connect = vi.spyOn(services, 'connect');
    vi.spyOn(services.session, 'bootstrap').mockRejectedValue(
      new ApiRequestError({ code: 'NETWORK_ERROR', message: 'down' }),
    );
    setServicesForTests(services);

    await ensureSession();
    expect(useSessionStore.getState()).toMatchObject({
      status: 'error',
      error: { code: 'NETWORK_ERROR' },
    });
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('nickname', () => {
  it('validates length after trimming; empty is allowed', () => {
    expect(validateNickname('')).toBe('');
    expect(validateNickname('   ')).toBe('');
    expect(validateNickname('a')).not.toBe('');
    expect(validateNickname(' ab ')).toBe('');
    expect(validateNickname('x'.repeat(33))).not.toBe('');
  });

  it('shows "Khách" + a tag when there is no nickname', () => {
    const s: GuestSession = { guestId: 'ab12cd34-0000', nickname: null, isNew: false };
    expect(guestDisplayName(s)).toBe('Khách AB12');
    expect(guestDisplayName({ ...s, nickname: 'Tướng' })).toBe('Tướng');
  });
});

describe('SessionBar', () => {
  it('offers the nickname on first visit and shows it after saving', async () => {
    setServicesForTests(mockServices());
    render(<SessionBar />);
    await act(() => ensureSession());

    const input = await screen.findByLabelText('Biệt danh');
    fireEvent.change(input, { target: { value: 'KỳThủ88' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /KỳThủ88/ })).toBeTruthy();
  });

  it('keeps the dialog open with a message on an invalid nickname', async () => {
    setServicesForTests(mockServices());
    render(<SessionBar />);
    await act(() => ensureSession());

    fireEvent.change(await screen.findByLabelText('Biệt danh'), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Biệt danh dài từ 2 đến 32 ký tự/)).toBeTruthy();
  });

  it('shows a retry button when the session cannot be created', async () => {
    const services = mockServices();
    const bootstrap = vi
      .spyOn(services.session, 'bootstrap')
      .mockRejectedValueOnce(new ApiRequestError({ code: 'NETWORK_ERROR', message: 'down' }));
    setServicesForTests(services);
    render(<SessionBar />);
    await act(() => ensureSession());

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(useSessionStore.getState().status).toBe('ready'));
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
});
