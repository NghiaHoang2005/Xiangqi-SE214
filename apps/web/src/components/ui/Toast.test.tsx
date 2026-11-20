import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

afterEach(cleanup);

function ShowToastButton({
  message = 'Đã sao chép link',
  variant = 'success',
}: {
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}) {
  const { show } = useToast();
  return <button onClick={() => show({ message, variant })}>Hiện Toast</button>;
}

function setup() {
  render(
    <ToastProvider>
      <ShowToastButton />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  it('shows a toast message when triggered', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện Toast' }));
    expect(screen.getByText('Đã sao chép link')).toBeTruthy();
  });

  it('renders with role=status for non-error variants', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện Toast' }));
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders with role=alert for error variant', () => {
    render(
      <ToastProvider>
        <ShowToastButton message="Lỗi mạng!" variant="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hiện Toast' }));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('dismisses the toast when close button is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện Toast' }));
    expect(screen.getByText('Đã sao chép link')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByText('Đã sao chép link')).toBeNull();
  });

  it('auto-dismisses after the given duration', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ShowToastButton />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hiện Toast' }));
    expect(screen.getByText('Đã sao chép link')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByText('Đã sao chép link')).toBeNull();
    vi.useRealTimers();
  });
});
