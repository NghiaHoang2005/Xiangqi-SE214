import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move-test-helpers';

describe.each(['RED', 'BLACK'] as const)('soldier (%s)', (side) => {
  it('moves forward only before the river, including its near bank', () => {
    expect(movesFor('SOLDIER', side, [4, 3])).toEqual(destinations([4, 4]));
    expect(movesFor('SOLDIER', side, [4, 4])).toEqual(destinations([4, 5]));
  });
  it('can move sideways after crossing, but never backward', () => {
    expect(movesFor('SOLDIER', side, [4, 5])).toEqual(destinations([3, 5], [5, 5], [4, 6]));
  });
  it('stays on the board and still moves sideways on the last rank', () => {
    expect(movesFor('SOLDIER', side, [0, 9])).toEqual(destinations([1, 9]));
    expect(movesFor('SOLDIER', side, [8, 9])).toEqual(destinations([7, 9]));
  });
  it('excludes friends and captures enemies', () => {
    expect(
      movesFor(
        'SOLDIER',
        side,
        [4, 5],
        [
          [4, 6, 'friend'],
          [3, 5, 'friend'],
          [5, 5, 'enemy'],
        ],
      ),
    ).toEqual(destinations([5, 5]));
    expect(movesFor('SOLDIER', side, [4, 3], [[4, 4, 'enemy']])).toEqual(destinations([4, 4]));
  });
});
