/**
 * Badge component — US-07, SCRUM-129.
 * State is never conveyed by colour alone: a dot + text are always rendered (NFR-16).
 * Variants: neutral | success | warning | danger.
 */
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

/** Pre-built icons that satisfy NFR-16 (no colour-only state). */
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
