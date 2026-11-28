import { describe, expect, it } from 'vitest';
import { TIME_CONTROL_PRESETS } from './constants';
import { ClientEvent, ServerEvent } from './events';
import { isValidNickname, normalizeNickname, NICKNAME_MAX_LENGTH } from './guest-session';
import {
  isTimeControlPreset,
  isValidJoinCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  normalizeJoinCode,
} from './room';
import { isMoveRejection, MOVE_REJECTION_CODES, type MatchSnapshot } from './match';

describe('nickname', () => {
  it('trims, collapses whitespace and treats empty as no nickname', () => {
    expect(normalizeNickname('  Kỳ   thủ  ')).toBe('Kỳ thủ');
    expect(normalizeNickname('   ')).toBeNull();
    expect(normalizeNickname(undefined)).toBeNull();
  });

  it('checks length in code points so Vietnamese diacritics count once', () => {
    expect(isValidNickname('A')).toBe(false);
    expect(isValidNickname('Nghĩa')).toBe(true);
    expect(isValidNickname('ệ'.repeat(NICKNAME_MAX_LENGTH))).toBe(true);
    expect(isValidNickname('a'.repeat(NICKNAME_MAX_LENGTH + 1))).toBe(false);
  });
});

describe('join code', () => {
  it('normalizes what people type', () => {
    expect(normalizeJoinCode('abcd-efgh')).toBe('ABCDEFGH');
    expect(normalizeJoinCode(' ab cd ef gh ')).toBe('ABCDEFGH');
  });

  it('accepts 8 characters from the alphabet only', () => {
    expect(isValidJoinCode('ABCD2345')).toBe(true);
    expect(isValidJoinCode('ABCD234')).toBe(false);
    expect(isValidJoinCode('ABCD234O')).toBe(false); // O is excluded
    expect(isValidJoinCode('ABCD2341')).toBe(false); // 1 is excluded
  });

  it('excludes look-alike characters', () => {
    for (const ch of '01ILOU') expect(JOIN_CODE_ALPHABET).not.toContain(ch);
    expect(new Set(JOIN_CODE_ALPHABET).size).toBe(JOIN_CODE_ALPHABET.length);
    expect(JOIN_CODE_LENGTH).toBe(8);
  });
});

describe('isTimeControlPreset', () => {
  it('accepts exactly the six CFG-05 presets', () => {
    for (const preset of TIME_CONTROL_PRESETS)
      expect(isTimeControlPreset({ ...preset })).toBe(true);
    expect(isTimeControlPreset({ initialMinutes: 3, incrementSeconds: 0 })).toBe(false);
    expect(isTimeControlPreset({ initialMinutes: 10, incrementSeconds: 2 })).toBe(false);
    expect(isTimeControlPreset({ initialMinutes: '10', incrementSeconds: 5 })).toBe(false);
    expect(isTimeControlPreset(null)).toBe(false);
  });
});

describe('event names', () => {
  it('include the room lifecycle events', () => {
    expect(ClientEvent.CloseRoom).toBe('CloseRoom');
    expect(ServerEvent.RoomUpdated).toBe('RoomUpdated');
  });
});

describe('isMoveRejection', () => {
  const snapshot: MatchSnapshot = {
    matchId: 'm',
    version: 3,
    status: 'IN_PROGRESS',
    turn: 'BLACK',
    fen: 'fen',
    stateHash: 'hash',
    checkState: 'NONE',
    lastMove: null,
    clocks: { redMs: 1, blackMs: 2 },
    serverTime: '2026-11-28T00:00:00.000Z',
  };

  it('accepts a rejection code that carries a snapshot', () => {
    for (const code of MOVE_REJECTION_CODES)
      expect(isMoveRejection({ code, message: '', details: { moveId: 'x', snapshot } })).toBe(true);
  });

  it('rejects other codes and rejections without a snapshot', () => {
    expect(isMoveRejection({ code: 'ACCESS_DENIED', message: '', details: { snapshot } })).toBe(
      false,
    );
    expect(isMoveRejection({ code: 'STALE_STATE', message: '' })).toBe(false);
  });
});
