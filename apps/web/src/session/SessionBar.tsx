import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui';
import type { GuestSession } from '../services';
import { useSessionStore } from '../stores/session';
import { ensureSession } from './bootstrap';
import { NicknameDialog } from './NicknameDialog';

/** Name shown for a guest: the nickname, or "Khách" + a short, non-identifying tag. */
export function guestDisplayName(session: Pick<GuestSession, 'guestId' | 'nickname'>): string {
  return session.nickname ?? `Khách ${session.guestId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

/** Header item for the guest session: loading, error + retry, or the name (click to edit). */
export function SessionBar() {
  const { status, session } = useSessionStore();
  const [editing, setEditing] = useState(false);
  const prompted = useRef(false);

  // First visit: offer the nickname once. It stays optional.
  useEffect(() => {
    if (session?.isNew && !prompted.current) {
      prompted.current = true;
      setEditing(true);
    }
  }, [session]);

  if (status === 'idle' || status === 'loading') {
    return <span className="session-bar muted">Đang tạo phiên khách…</span>;
  }

  if (status === 'error' || !session) {
    return (
      <span className="session-bar">
        <span className="session-bar-error">Không tạo được phiên khách</span>
        <Button variant="secondary" size="sm" onClick={() => void ensureSession()}>
          Thử lại
        </Button>
      </span>
    );
  }

  return (
    <span className="session-bar">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditing(true)}
        aria-label={`Đổi biệt danh, hiện tại: ${guestDisplayName(session)}`}
      >
        {guestDisplayName(session)}
      </Button>
      <NicknameDialog open={editing} onClose={() => setEditing(false)} current={session.nickname} />
    </span>
  );
}
