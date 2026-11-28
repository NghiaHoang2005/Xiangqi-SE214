import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move.test-utils';

describe.each(['RED', 'BLACK'] as const)('chariot (%s)', (side) => {
  it('slides along all four rays', () => {
    const expected = [
      ...Array.from({ length: 9 }, (_, file) => [file, 4] as const).filter(([file]) => file !== 4),
      ...Array.from({ length: 10 }, (_, rank) => [4, rank] as const).filter(
        ([, rank]) => rank !== 4,
      ),
    ];
    expect(movesFor('CHARIOT', side, [4, 4])).toEqual(destinations(...expected));
  });
  it('stops at friends and captures only the first enemy on each ray', () => {
    expect(
      movesFor(
        'CHARIOT',
        side,
        [4, 4],
        [
          [2, 4, 'friend'],
          [6, 4, 'enemy'],
          [4, 2, 'enemy'],
          [4, 6, 'friend'],
          [7, 4, 'enemy'],
          [4, 1, 'enemy'],
        ],
      ),
    ).toEqual(destinations([3, 4], [5, 4], [6, 4], [4, 3], [4, 2], [4, 5]));
  });
  it('has no moves when surrounded by friends', () => {
    expect(
      movesFor(
        'CHARIOT',
        side,
        [0, 0],
        [
          [1, 0, 'friend'],
          [0, 1, 'friend'],
        ],
      ),
    ).toEqual([]);
  });
});
