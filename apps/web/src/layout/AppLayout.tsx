import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { paths } from '../routes';
import { ensureSession } from '../session/bootstrap';
import { SessionBar } from '../session/SessionBar';
import { ConnectionBadge } from './ConnectionBadge';

const NAV = [
  { to: paths.home, label: 'Trang chủ', end: true },
  { to: paths.aiSetup, label: 'Chơi với máy' },
  { to: paths.ranked, label: 'Xếp hạng' },
  { to: paths.leaderboard, label: 'Bảng xếp hạng' },
  { to: paths.history, label: 'Lịch sử' },
  { to: paths.login, label: 'Đăng nhập' },
];

/** Shell for every screen: header with navigation and connection state, then the page. */
export function AppLayout() {
  // UC-01: every screen needs a guest session; the socket connects once it exists.
  useEffect(() => {
    void ensureSession();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <nav aria-label="Điều hướng chính">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header-end">
          <SessionBar />
          <ConnectionBadge />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
