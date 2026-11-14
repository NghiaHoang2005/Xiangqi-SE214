/** Hằng số baseline theo SRS chương 14 (CFG-xx). Sửa ở đây thì cả FE và BE cùng đổi. */

export type Side = 'RED' | 'BLACK';
export type GameMode = 'PVP' | 'PVE' | 'PVP_RANKED';
export type AiDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** CFG-05: 6 preset 5/10/15 phút, gia số 0 hoặc 5 giây. */
export interface TimeControl {
  initialMinutes: 5 | 10 | 15;
  incrementSeconds: 0 | 5;
}

export const TIME_CONTROL_PRESETS: readonly TimeControl[] = [
  { initialMinutes: 5, incrementSeconds: 0 },
  { initialMinutes: 5, incrementSeconds: 5 },
  { initialMinutes: 10, incrementSeconds: 0 },
  { initialMinutes: 10, incrementSeconds: 5 },
  { initialMinutes: 15, incrementSeconds: 0 },
  { initialMinutes: 15, incrementSeconds: 5 },
];

/** CFG-18: ván ranked dùng 10+5. */
export const RANKED_TIME_CONTROL: TimeControl = { initialMinutes: 10, incrementSeconds: 5 };

export const ROOM_IDLE_TTL_MS = 30 * 60 * 1000; // CFG-06
export const RECONNECT_GRACE_MS = 10 * 60 * 1000; // CFG-08
export const DATA_RETENTION_DAYS = 30; // CFG-07

/** CFG-14: ngân sách tìm kiếm AI. */
export const AI_BUDGET: Record<AiDifficulty, { maxPly: number; maxMs?: number }> = {
  EASY: { maxPly: 1 },
  MEDIUM: { maxPly: 3 },
  HARD: { maxPly: 5, maxMs: 1000 },
};

/** CFG-19, CFG-20: Elo và matchmaking. */
export const ELO_INITIAL = 1200;
export const ELO_K = 32;
export const MATCHMAKING_WINDOW = { initial: 200, stepEvery10s: 50, max: 400 } as const;
