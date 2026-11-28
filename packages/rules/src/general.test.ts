import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move.test-utils';

describe.each(['RED', 'BLACK'] as const)('general (%s)', (side) => {
  it('moves orthogonally inside the palace', () => {
    expect(movesFor('GENERAL', side, [4, 1])).toEqual(destinations([3, 1], [5, 1], [4, 0], [4, 2]));
  });
  it('stays within every palace boundary', () => {
    expect(movesFor('GENERAL', side, [3, 0])).toEqual(destinations([4, 0], [3, 1]));
    expect(movesFor('GENERAL', side, [5, 2])).toEqual(destinations([4, 2], [5, 1]));
  });
  it('excludes friends and captures enemies', () => {
    expect(
      movesFor(
        'GENERAL',
        side,
        [4, 1],
        [
          [3, 1, 'friend'],
          [5, 1, 'enemy'],
        ],
      ),
    ).toEqual(destinations([5, 1], [4, 0], [4, 2]));
  });
});
