import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../lib/errors';
import { setServicesForTests, type Services } from '../services';
import { createMemoryStorage, createMockServices } from '../services/mock';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';
import { CreateRoomPage } from './CreateRoomPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let services: Services;

beforeEach(async () => {
  services = createMockServices({
    latencyMs: 0,
    sessionStorage: createMemoryStorage(),
    sharedStorage: createMemoryStorage(),
  });
  setServicesForTests(services);
  useSessionStore.getState().setSession(await services.session.bootstrap());
  useConnectionStore.getState().setStatus('connected');
});

afterEach(() => {
  cleanup();
  mockNavigate.mockReset();
  setServicesForTests(null);
  useSessionStore.setState({ status: 'idle', session: null, error: null });
  useConnectionStore.getState().setStatus('idle');
});

function renderPage() {
  const router = createMemoryRouter([{ path: '/room/new', element: <CreateRoomPage /> }], {
    initialEntries: ['/room/new'],
  });
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
}

describe('CreateRoomPage', () => {
  it('offers the six clock presets and three sides, with 10+5 and Red preselected', () => {
    renderPage();
    const clocks = screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'clock');
    expect(clocks.map((r) => (r as HTMLInputElement).value)).toEqual([
      '5+0',
      '5+5',
      '10+0',
      '10+5',
      '15+0',
      '15+5',
    ]);
    expect(
      (screen.getByRole('radio', { name: /10 phút \| \+5s/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect((screen.getByRole('radio', { name: /^Đỏ/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('radio', { name: /^Đen/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /^Ngẫu nhiên/ })).toBeTruthy();
  });

  it('describes the chosen clock below the options', () => {
    renderPage();
    expect(screen.getByText(/10 phút suy nghĩ chính, cộng thêm 5 giây/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /^5 phút \| \+0s/ }));
    expect(
      screen.getByText(/Mỗi bên có 5 phút suy nghĩ chính, không cộng thêm thời gian/),
    ).toBeTruthy();
  });

  it('creates the room with the chosen config and opens the room page', async () => {
    const create = vi.spyOn(services.room, 'createRoom');
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /15 phút \| \+0s/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Ngẫu nhiên/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith({
      timeControl: { initialMinutes: 15, incrementSeconds: 0 },
      preferredSide: 'RANDOM',
    });
    const room = await create.mock.results[0].value;
    expect(mockNavigate).toHaveBeenCalledWith(`/room/${room.roomId}`, { state: { room } });
  });

  it('lists the valid values when the server rejects the config (E1)', async () => {
    vi.spyOn(services.room, 'createRoom').mockRejectedValue(
      new ApiRequestError({ code: 'VALIDATION_FAILED', message: 'bad' }),
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('5+0, 5+5, 10+0, 10+5, 15+0, 15+5');
    expect(alert.textContent).toContain('Đỏ, Đen, Ngẫu nhiên');
    expect(mockNavigate).not.toHaveBeenCalled();
    // The form stays usable so the host can fix it and retry.
    expect((screen.getByRole('button', { name: 'Tạo phòng' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('shows a connection message on network errors', async () => {
    vi.spyOn(services.room, 'createRoom').mockRejectedValue(
      new ApiRequestError({ code: 'TIMEOUT', message: 'slow' }),
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phòng' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không kết nối được máy chủ/);
  });

  it('keeps the submit button disabled until the session and socket are ready', () => {
    useConnectionStore.getState().setStatus('connecting');
    renderPage();
    const submit = screen.getByRole('button', { name: 'Tạo phòng' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText('Đang kết nối đến máy chủ…')).toBeTruthy();
  });

  it('sends one request even if the button is clicked twice', async () => {
    const create = vi.spyOn(services.room, 'createRoom');
    renderPage();
    const submit = screen.getByRole('button', { name: 'Tạo phòng' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(create).toHaveBeenCalledOnce();
  });
});
