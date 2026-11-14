import { describe, expect, it } from 'vitest';
import { isOnBoard } from './index';

describe('isOnBoard', () => {
  it('accepts intersections on the 9×10 board', () => {
    expect(isOnBoard({ file: 0, rank: 0 })).toBe(true);
    expect(isOnBoard({ file: 8, rank: 9 })).toBe(true);
  });

  it('rejects intersections off the board', () => {
    expect(isOnBoard({ file: 9, rank: 0 })).toBe(false);
    expect(isOnBoard({ file: 0, rank: 10 })).toBe(false);
    expect(isOnBoard({ file: -1, rank: 3 })).toBe(false);
  });
});
