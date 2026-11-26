/**
 * Button component — US-07, SCRUM-129.
 * Variants: primary | secondary | danger | ghost.
 * Sizes: sm | md | lg.
 * Keyboard focus visible (NFR-16).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while true. */
  loading?: boolean;
  /** Icon placed before the label. */
  startIcon?: ReactNode;
  /** Icon placed after the label. */
  endIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  startIcon,
  endIcon,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = ['btn', `btn-${variant}`, `btn-${size}`, loading ? 'btn-loading' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && startIcon}
      {children}
      {!loading && endIcon}
    </button>
  );
}
