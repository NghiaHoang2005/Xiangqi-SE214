import { type FormEvent, useEffect, useState } from 'react';
import { Button, Dialog, Input } from '../components/ui';
import { ApiRequestError } from '../lib/errors';
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from '../services';
import { updateNickname } from './bootstrap';

/** Client-side check, same bounds the server enforces. Returns an error message or ''. */
export function validateNickname(raw: string): string {
  const value = raw.trim();
  if (value.length === 0) return '';
  if (value.length < NICKNAME_MIN_LENGTH || value.length > NICKNAME_MAX_LENGTH) {
    return `Biệt danh dài từ ${NICKNAME_MIN_LENGTH} đến ${NICKNAME_MAX_LENGTH} ký tự.`;
  }
  return '';
}

export interface NicknameDialogProps {
  open: boolean;
  onClose: () => void;
  current: string | null;
}

/** US-11: optional nickname. Empty means "play as Khách". */
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
      await updateNickname(value.trim() || null);
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
