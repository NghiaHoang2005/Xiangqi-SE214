import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge } from './Badge';

afterEach(cleanup);

describe('Badge', () => {
  it('renders text content (not colour alone — NFR-16)', () => {
    render(<Badge variant="success">Thắng</Badge>);
    expect(screen.getByText('Thắng')).toBeTruthy();
  });

  it('renders an icon aria-hidden alongside the label', () => {
    render(<Badge variant="danger">Thua</Badge>);
    expect(screen.getByText('Thua')).toBeTruthy();
    const spans = document.querySelectorAll('[aria-hidden="true"]');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('applies correct variant class', () => {
    render(<Badge variant="warning">Cảnh báo</Badge>);
    const badge = screen.getByText('Cảnh báo').closest('.badge');
    expect(badge?.className).toContain('badge-warning');
  });

  it('defaults to neutral variant', () => {
    render(<Badge>Trung lập</Badge>);
    const badge = screen.getByText('Trung lập').closest('.badge');
    expect(badge?.className).toContain('badge-neutral');
  });
});
