import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move.test-utils';

describe.each(['RED', 'BLACK'] as const)('advisor (%s)', (side) => {
  it('moves one diagonal step', () => {
    expect(movesFor('ADVISOR', side, [4, 1])).toEqual(destinations([3, 0], [5, 0], [3, 2], [5, 2]));
  });
  it('stays in the palace', () => {
    for (const source of [
      [3, 0],
      [5, 0],
      [3, 2],
      [5, 2],
    ] as const) {
      expect(movesFor('ADVISOR', side, source)).toEqual(destinations([4, 1]));
    }
  });
  it('excludes friends and captures enemies', () => {
    expect(
      movesFor(
        'ADVISOR',
        side,
        [4, 1],
        [
          [3, 0, 'friend'],
          [5, 0, 'enemy'],
        ],
      ),
    ).toEqual(destinations([5, 0], [3, 2], [5, 2]));
  });
});
