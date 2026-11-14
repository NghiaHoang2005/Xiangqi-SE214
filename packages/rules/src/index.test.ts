import { describe, expect, it } from 'vitest';
import { isOnBoard } from './index';

describe('isOnBoard', () => {
  it('nhận giao điểm trong bàn 9×10', () => {
    expect(isOnBoard({ file: 0, rank: 0 })).toBe(true);
    expect(isOnBoard({ file: 8, rank: 9 })).toBe(true);
  });

  it('loại giao điểm ngoài bàn', () => {
    expect(isOnBoard({ file: 9, rank: 0 })).toBe(false);
    expect(isOnBoard({ file: 0, rank: 10 })).toBe(false);
    expect(isOnBoard({ file: -1, rank: 3 })).toBe(false);
  });
});
