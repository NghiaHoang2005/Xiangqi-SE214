import { useConnectionStore, type ConnectionStatus } from '../stores/connection';

const LABELS: Record<ConnectionStatus, string> = {
  idle: 'Chưa kết nối',
  connecting: 'Đang kết nối…',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại…',
  disconnected: 'Mất kết nối',
};

/** Connection state as text, not colour alone (NFR-16); announced to screen readers. */
export function ConnectionBadge() {
  const status = useConnectionStore((s) => s.status);
  return (
    <span className={`badge badge-${status}`} role="status" aria-live="polite">
      {LABELS[status]}
    </span>
  );
}
