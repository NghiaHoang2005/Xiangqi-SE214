/**
 * Toast system — US-07, SCRUM-129.
 * Usage:
 *   Wrap your application root with <ToastProvider> (e.g. in main.tsx or AppLayout).
 *   Then in any component:
 *     const { show } = useToast();
 *     show({ title: 'Thành công', message: 'Đã sao chép link phòng.', variant: 'success' });
 *
 * Accessibility (NFR-16):
 *   - The toast region container is persistently mounted in the DOM with aria-live="polite",
 *     establishing the live region before dynamic messages are injected (per MDN Live Regions guidelines).
 *   - Individual toasts use role="status" (or role="alert" for error messages).
 *   - Visible status icons pair with text to avoid relying on color alone.
 */
import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  variant?: ToastVariant;
  title?: string;
  message: string;
  /** Auto-dismiss delay in ms. 0 = never. Default 4000. */
  duration?: number;
}

type ShowOptions = Omit<ToastItem, 'id'>;

interface ToastContextValue {
  show: (opts: ShowOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Wrap your app in this provider (or add <ToastRegion /> anywhere below it). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (opts: ShowOptions): string => {
      const id = crypto.randomUUID();
      const duration = opts.duration ?? 4000;

      setToasts((prev) => [...prev, { ...opts, id }]);

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Variant of useToast that returns null when rendered outside <ToastProvider>. */
export function useOptionalToast(): ToastContextValue | null {
  return useContext(ToastContext);
}

/* ── Icons — text, not colour alone (NFR-16) ── */
const ICONS: Record<ToastVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const variant = toast.variant ?? 'info';
  return (
    <div
      className={`toast toast-${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        type="button"
        className="toast-dismiss"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(toast.id)}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * ToastRegion container.
 * Review fix (SCRUM-129): Always mount the region container in the DOM with aria-live="polite"
 * so that screen readers register the live region prior to dynamic toast insertions (MDN guidelines).
 */
export function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-region" aria-label="Thông báo" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
