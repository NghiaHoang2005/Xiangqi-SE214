import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Bắt đầu</Button>);
    expect(screen.getByRole('button', { name: 'Bắt đầu' })).toBeTruthy();
  });

  it('applies variant and size class', () => {
    render(
      <Button variant="danger" size="lg">
        Đầu hàng
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-danger');
    expect(btn.className).toContain('btn-lg');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Vô hiệu</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows spinner and is disabled when loading', () => {
    render(<Button loading>Đang tải</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Bấm</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Bấm
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
