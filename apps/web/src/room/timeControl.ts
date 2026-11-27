import type { TimeControl } from '@xiangqi/shared';

export function timeControlKey(tc: TimeControl): string {
  return `${tc.initialMinutes}+${tc.incrementSeconds}`;
}

export const CLOCK_NAMES: Record<string, string> = {
  '5+0': 'Chớp chớp',
  '5+5': 'Chớp tích lũy',
  '10+0': 'Nhanh',
  '10+5': 'Nhanh chuẩn (Khuyên dùng)',
  '15+0': 'Tiêu chuẩn',
  '15+5': 'Tiêu chuẩn tích lũy',
};

export function timeControlLabel(tc: TimeControl): string {
  return `${tc.initialMinutes} phút | +${tc.incrementSeconds}s`;
}

export function formatStartingClock(minutes: number): string {
  return `${String(minutes).padStart(2, '0')}:00`;
}

export function clockHint(tc: TimeControl): string {
  const bonus =
    tc.incrementSeconds > 0
      ? `cộng thêm ${tc.incrementSeconds} giây sau mỗi nước đi hợp lệ`
      : 'không cộng thêm thời gian sau mỗi nước đi';
  return `Mỗi bên có ${tc.initialMinutes} phút suy nghĩ chính, ${bonus}.`;
}
