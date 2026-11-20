import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Input } from './Input';

afterEach(cleanup);

describe('Input', () => {
  it('renders with label and links them via id', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('shows required asterisk', () => {
    render(<Input label="Mật khẩu" required />);
    const input = screen.getByLabelText(/Mật khẩu/) as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  it('shows error message and sets aria-invalid', () => {
    render(<Input label="Email" error="Email không hợp lệ" />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Email không hợp lệ');
  });

  it('shows helper text when no error', () => {
    render(<Input label="Mã phòng" helperText="Nhập 8 ký tự" />);
    expect(screen.getByText('Nhập 8 ký tự')).toBeTruthy();
    const input = screen.getByLabelText('Mã phòng');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('links input to description via aria-describedby', () => {
    render(<Input label="Nick" helperText="Tối đa 32 ký tự" />);
    const input = screen.getByLabelText('Nick');
    const descId = input.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)?.textContent).toContain('Tối đa 32 ký tự');
  });
});
