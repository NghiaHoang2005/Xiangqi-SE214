import { NavLink, Outlet } from 'react-router-dom';
import { paths } from '../routes';
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
        <ConnectionBadge />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
