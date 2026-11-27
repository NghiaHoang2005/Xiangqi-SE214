import type { RoomView } from '@xiangqi/shared';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../lib/errors';
import { setServicesForTests, type Services } from '../services';
import {
  createMemoryBus,
  createMemoryStorage,
  createMockServices,
  type MockEvent,
} from '../services/mock';
import { resetSessionForTests } from '../session/bootstrap';
import { useConnectionStore } from '../stores/connection';
import { useSessionStore } from '../stores/session';
import { RoomPage } from './RoomPage';

let sharedStorage = createMemoryStorage();
let bus = createMemoryBus<MockEvent>();

async function newGuest(): Promise<Services> {
  const services = createMockServices({
    latencyMs: 0,
    sessionStorage: createMemoryStorage(),
    sharedStorage,
    bus,
  });
  await services.session.bootstrap();
  return services;
}

async function hostRoom(): Promise<{ host: Services; room: RoomView }> {
  const host = await newGuest();
  const room = await host.room.createRoom({
    timeControl: { initialMinutes: 10, incrementSeconds: 5 },
    preferredSide: 'RED',
  });
  return { host, room };
}

async function actAs(services: Services) {
  setServicesForTests(services);
  useSessionStore.getState().setSession(await services.session.bootstrap());
}

function MatchStub() {
  return <h1>Trận {useParams().matchId}</h1>;
}

// A data router's navigate() builds a fetch Request, whose AbortSignal jsdom rejects on Node.
function renderRoom(roomId: string, state?: unknown) {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: `/room/${roomId}`, state }]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<h1>Trang chủ</h1>} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/match/:matchId" element={<MatchStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sharedStorage = createMemoryStorage();
  bus = createMemoryBus<MockEvent>();
  useConnectionStore.getState().setStatus('connected');
});

afterEach(() => {
  cleanup();
  setServicesForTests(null);
  resetSessionForTests();
  useConnectionStore.getState().setStatus('idle');
});

describe('RoomPage', () => {
  it('gives the host back their seat when they reopen the link (A1)', async () => {
    const { host, room } = await hostRoom();
    await actAs(host);
    renderRoom(room.roomId);

    expect(await screen.findByText(room.joinCode)).toBeTruthy();
    expect(screen.getByText(/1\/2 người chơi/)).toBeTruthy();
  });

  it('shows the room handed over by the create screen before JoinRoom answers', async () => {
    const { host, room } = await hostRoom();
    await actAs(host);
    useConnectionStore.getState().setStatus('connecting');
    renderRoom(room.roomId, { room });

    expect(screen.getByText(room.joinCode)).toBeTruthy();
  });

  it('takes the second seat and goes straight to the match', async () => {
    const { room } = await hostRoom();
    await actAs(await newGuest());
    renderRoom(room.roomId);

    expect(await screen.findByRole('heading', { name: /^Trận / })).toBeTruthy();
  });

  it('moves the waiting host to the match when the second player joins', async () => {
    const { host, room } = await hostRoom();
    await actAs(host);
    renderRoom(room.roomId);
    await screen.findByText(room.joinCode);

    const guest = await newGuest();
    const joined = await guest.room.joinRoom({ roomId: room.roomId });

    expect(await screen.findByRole('heading', { name: `Trận ${joined.matchId}` })).toBeTruthy();
  });

  it('waits for the connection before joining', async () => {
    const { room } = await hostRoom();
    const guest = await newGuest();
    const join = vi.spyOn(guest.room, 'joinRoom');
    await actAs(guest);
    useConnectionStore.getState().setStatus('connecting');
    renderRoom(room.roomId);

    expect(screen.getByText('Đang kết nối đến máy chủ…')).toBeTruthy();
    expect(join).not.toHaveBeenCalled();
  });

  it('reports an unknown room without a retry, and links home', async () => {
    await actAs(await newGuest());
    renderRoom('khong-co-phong');

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Không tìm thấy phòng. Hãy kiểm tra lại mã hoặc liên kết.',
    );
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Về trang chủ' }));
    expect(await screen.findByRole('heading', { name: 'Trang chủ' })).toBeTruthy();
  });

  it('reports a full room to a third guest', async () => {
    const { room } = await hostRoom();
    await (await newGuest()).room.joinRoom({ roomId: room.roomId });
    await actAs(await newGuest());
    renderRoom(room.roomId);

    expect((await screen.findByRole('alert')).textContent).toBe('Phòng đã đủ hai người chơi.');
  });

  it('shows the room as gone when the host closes it', async () => {
    const { host, room } = await hostRoom();
    await actAs(host);
    renderRoom(room.roomId);
    await screen.findByText(room.joinCode);

    await host.room.closeRoom(room.roomId);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Phòng đã hết hạn hoặc đã bị chủ phòng đóng.',
    );
  });

  it('lets the host close the room from the waiting screen and invalidates later joins', async () => {
    const { host, room } = await hostRoom();
    await actAs(host);
    renderRoom(room.roomId);
    await screen.findByText(room.joinCode);

    fireEvent.click(screen.getByRole('button', { name: 'Đóng phòng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đóng phòng' }));

    expect(await screen.findByRole('heading', { name: 'Trang chủ' })).toBeTruthy();

    cleanup();
    await actAs(await newGuest());
    renderRoom(room.roomId);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Phòng đã hết hạn hoặc đã bị chủ phòng đóng.',
    );
  });

  it('retries after a network error', async () => {
    const { room } = await hostRoom();
    const guest = await newGuest();
    vi.spyOn(guest.room, 'joinRoom').mockRejectedValueOnce(
      new ApiRequestError({ code: 'NETWORK_ERROR', message: 'down' }),
    );
    await actAs(guest);
    renderRoom(room.roomId);

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(guest.room.joinRoom).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('heading', { name: /^Trận / })).toBeTruthy();
  });
});
