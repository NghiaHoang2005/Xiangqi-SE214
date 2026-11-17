/**
 * Dialog component — US-07, SCRUM-129.
 * Modal with focus trap, Esc-to-close, backdrop click, and proper ARIA roles.
 * Accessibility: role="dialog", aria-modal, aria-labelledby (NFR-16).
 */
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Action buttons rendered in the footer (e.g. <Button>, <Button variant="danger">). */
  footer?: ReactNode;
  children?: ReactNode;
}

/** All keyboard-focusable elements. */
const FOCUSABLE =
  'a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function Dialog({ open, onClose, title, description, footer, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  /* Focus first focusable element when dialog opens */
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  }, [open]);

  /* Restore focus to the trigger element when dialog closes */
  const triggerRef = useRef<Element | null>(null);
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
    } else {
      (triggerRef.current as HTMLElement | null)?.focus();
    }
  }, [open]);

  /* Focus trap inside the dialog */
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* Close on backdrop click (not on panel click) */
  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-panel"
      >
        <button
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
        >
          ✕
        </button>

        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>

        {description && <p className="dialog-description">{description}</p>}

        {children}

        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
