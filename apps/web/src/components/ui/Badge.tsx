import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

// NFR-16: state is shown by an icon + text, never by colour alone.
const ICONS: Record<BadgeVariant, string> = {
  neutral: '●',
  success: '✓',
  warning: '⚠',
  danger: '✕',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Overrides the default icon for the variant. */
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({
  variant = 'neutral',
  icon,
  children,
  className = '',
  ...rest
}: BadgeProps) {
  const cls = `badge badge-${variant} ${className}`.trim();

  return (
    <span {...rest} className={cls}>
      <span aria-hidden="true">{icon ?? ICONS[variant]}</span>
      {children}
    </span>
  );
}
