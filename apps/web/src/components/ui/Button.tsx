import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Also disables the button. */
  loading?: boolean;
  startIcon?: ReactNode;
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
