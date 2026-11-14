import { useEffect, useState } from 'react';
import { BOARD_FILES, BOARD_RANKS } from '@xiangqi/rules';
import { TIME_CONTROL_PRESETS } from '@xiangqi/shared';

/**
 * Temporary page that checks the web app can reach the backend and use the shared packages.
 * Replaced by the home page in US-12. UI text stays Vietnamese (FR-25).
 */
export function App() {
  const [server, setServer] = useState('đang kiểm tra…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { status: string }) => setServer(d.status))
      .catch(() => setServer('không kết nối được'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Cờ Tướng Trực Tuyến</h1>
      <p>Backend: {server}</p>
      <p>
        Bàn cờ {BOARD_FILES}×{BOARD_RANKS} · {TIME_CONTROL_PRESETS.length} preset đồng hồ
      </p>
    </main>
  );
}
