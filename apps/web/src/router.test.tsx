import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { routerOptions, routes } from './router';
import { paths } from './routes';

afterEach(cleanup);

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
