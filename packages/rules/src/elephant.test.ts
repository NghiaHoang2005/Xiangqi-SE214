import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move-test-helpers';

describe.each(['RED', 'BLACK'] as const)('elephant (%s)', (side) => {
  it('moves two diagonal steps', () => {
    expect(movesFor('ELEPHANT', side, [4, 2])).toEqual(
      destinations([2, 0], [6, 0], [2, 4], [6, 4]),
    );
  });
  it.each(['friend', 'enemy'] as const)('blocks each eye with a %s piece', (relation) => {
    for (const [df, dr] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const expected = [
        [2, 0],
        [6, 0],
        [2, 4],
        [6, 4],
      ]
        .filter(([file, rank]) => file !== 4 + 2 * df || rank !== 2 + 2 * dr)
        .map(([file, rank]) => [file, rank] as const);
      expect(movesFor('ELEPHANT', side, [4, 2], [[4 + df, 2 + dr, relation]])).toEqual(
        destinations(...expected),
      );
    }
  });
  it('never crosses the river or leaves the board', () => {
    expect(movesFor('ELEPHANT', side, [2, 4])).toEqual(destinations([0, 2], [4, 2]));
    expect(movesFor('ELEPHANT', side, [0, 2])).toEqual(destinations([2, 0], [2, 4]));
  });
  it('excludes friends and captures enemies', () => {
    expect(
      movesFor(
        'ELEPHANT',
        side,
        [4, 2],
        [
          [2, 0, 'friend'],
          [6, 0, 'enemy'],
        ],
      ),
    ).toEqual(destinations([6, 0], [2, 4], [6, 4]));
  });
});
