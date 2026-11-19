import { describe, expect, it } from 'vitest';
import { BOARD_SIZE, indexToSquare, isOnBoard, squareToIndex } from './board';

describe('isOnBoard', () => {
  it('accepts the corners of the 9×10 board', () => {
    expect(isOnBoard({ file: 0, rank: 0 })).toBe(true);
    expect(isOnBoard({ file: 8, rank: 9 })).toBe(true);
  });

  it('rejects squares off the board', () => {
    expect(isOnBoard({ file: 9, rank: 0 })).toBe(false);
    expect(isOnBoard({ file: 0, rank: 10 })).toBe(false);
    expect(isOnBoard({ file: -1, rank: 3 })).toBe(false);
  });

  it('rejects non-integer coordinates', () => {
    expect(isOnBoard({ file: 1.5, rank: 3 })).toBe(false);
    expect(isOnBoard({ file: 1, rank: Number.NaN })).toBe(false);
  });
});

describe('squareToIndex / indexToSquare', () => {
  it("counts rank by rank from Red's back rank", () => {
    expect(squareToIndex({ file: 0, rank: 0 })).toBe(0);
    expect(squareToIndex({ file: 8, rank: 0 })).toBe(8);
    expect(squareToIndex({ file: 0, rank: 1 })).toBe(9);
    expect(squareToIndex({ file: 8, rank: 9 })).toBe(BOARD_SIZE - 1);
  });

  it('round-trips every intersection', () => {
    for (let index = 0; index < BOARD_SIZE; index++) {
      expect(squareToIndex(indexToSquare(index))).toBe(index);
    }
  });
});
