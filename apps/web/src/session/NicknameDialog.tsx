import {
  isValidNickname,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  normalizeNickname,
} from '@xiangqi/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, Dialog, Input } from '../components/ui';
import { ApiRequestError } from '../lib/errors';
import { updateNickname } from './bootstrap';

/** Returns the error message, or '' when valid. */
export function validateNickname(raw: string): string {
  const value = normalizeNickname(raw);
  if (value === null) return '';
  if (!isValidNickname(value)) {
    return `Biệt danh dài từ ${NICKNAME_MIN_LENGTH} đến ${NICKNAME_MAX_LENGTH} ký tự.`;
  }
  return '';
}

export interface NicknameDialogProps {
  open: boolean;
  onClose: () => void;
  current: string | null;
}

export function NicknameDialog({ open, onClose, current }: NicknameDialogProps) {
  const [value, setValue] = useState(current ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(current ?? '');
      setError('');
    }
  }, [open, current]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = validateNickname(value);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    try {
      await updateNickname(normalizeNickname(value) ?? '');
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.error.code === 'VALIDATION_FAILED'
          ? `Biệt danh dài từ ${NICKNAME_MIN_LENGTH} đến ${NICKNAME_MAX_LENGTH} ký tự.`
          : 'Không lưu được biệt danh. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Biệt danh của bạn"
      description="Không bắt buộc. Đối thủ sẽ thấy tên này trong ván đấu."
    >
      <form className="nickname-form" onSubmit={handleSubmit} noValidate>
        <Input
          id="nickname-input"
          label="Biệt danh"
          placeholder="VD: KỳThủ88"
          value={value}
          maxLength={NICKNAME_MAX_LENGTH + 8}
          autoComplete="nickname"
          error={error}
          helperText={`${NICKNAME_MIN_LENGTH}–${NICKNAME_MAX_LENGTH} ký tự, để trống để chơi ẩn danh.`}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
        />
        <div className="dialog-footer">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Bỏ qua
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Lưu
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
