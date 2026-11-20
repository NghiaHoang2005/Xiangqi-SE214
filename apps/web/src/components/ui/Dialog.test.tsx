import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

afterEach(cleanup);

function renderDialog(props: Partial<React.ComponentProps<typeof Dialog>> = {}) {
  return render(<Dialog open={true} onClose={vi.fn()} title="Xác nhận đầu hàng?" {...props} />);
}

describe('Dialog', () => {
  it('renders title and has role=dialog', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(screen.getByText('Xác nhận đầu hàng?')).toBeTruthy();
  });

  it('is not in the DOM when open=false', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Ẩn" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onClose when Esc is pressed', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const backdrop = document.querySelector('.dialog-backdrop')!;
    fireEvent.keyDown(backdrop, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const backdrop = document.querySelector('.dialog-backdrop')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders description and footer when provided', () => {
    renderDialog({
      description: 'Hành động này không thể hoàn tác.',
      footer: <button>Đầu hàng</button>,
    });
    expect(screen.getByText('Hành động này không thể hoàn tác.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đầu hàng' })).toBeTruthy();
  });

  it('has aria-modal=true', () => {
    renderDialog();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
  });
});
