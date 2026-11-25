import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routerOptions, routes } from './router';
import { paths } from './routes';
import { setServicesForTests, type Services } from './services';
import { resetSessionForTests } from './session/bootstrap';

// AppLayout creates the guest session on mount; keep it pending so nothing connects.
const pendingServices: Services = {
  kind: 'mock',
  session: { bootstrap: () => new Promise(() => {}), setNickname: () => new Promise(() => {}) },
  room: {} as Services['room'],
  connect: () => Promise.resolve(false),
};

beforeEach(() => {
  resetSessionForTests();
  setServicesForTests(pendingServices);
});

afterEach(() => {
  cleanup();
  setServicesForTests(null);
});

function renderAt(path: string) {
  render(
    <RouterProvider
      router={createMemoryRouter(routes, { ...routerOptions, initialEntries: [path] })}
      future={{ v7_startTransition: true }}
    />,
  );
}

describe('router', () => {
  it.each([
    [paths.home, 'Cờ Tướng Trực Tuyến'],
    [paths.createRoom, 'Tạo phòng'],
    [paths.room('abc'), 'Phòng chờ'],
    [paths.aiSetup, 'Chơi với máy'],
    [paths.match('m1'), 'Bàn đấu'],
    [paths.history, 'Lịch sử ván'],
    [paths.replay('m1'), 'Xem lại ván'],
    [paths.login, 'Đăng nhập'],
    [paths.ranked, 'Đấu xếp hạng'],
    [paths.leaderboard, 'Bảng xếp hạng'],
  ])('renders %s', (path, heading) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy();
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/khong-co');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeTruthy();
  });

  it('shows the connection state as text in the header', () => {
    renderAt(paths.home);
    expect(screen.getByRole('status').textContent).toBe('Chưa kết nối');
  });
});
