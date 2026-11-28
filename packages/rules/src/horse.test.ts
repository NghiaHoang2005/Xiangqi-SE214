import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move.test-utils';

describe.each(['RED', 'BLACK'] as const)('horse (%s)', (side) => {
  const all = destinations([2, 3], [2, 5], [6, 3], [6, 5], [3, 2], [5, 2], [3, 6], [5, 6]);
  it('generates all eight L-shaped moves', () => {
    expect(movesFor('HORSE', side, [4, 4])).toEqual(all);
  });
  it.each(['friend', 'enemy'] as const)('blocks each leg with a %s piece', (relation) => {
    for (const [file, rank, blocked] of [
      [3, 4, ['2,3', '2,5']],
      [5, 4, ['6,3', '6,5']],
      [4, 3, ['3,2', '5,2']],
      [4, 5, ['3,6', '5,6']],
    ] as const) {
      expect(movesFor('HORSE', side, [4, 4], [[file, rank, relation]])).toEqual(
        all.filter((move) => !(blocked as readonly string[]).includes(move)),
      );
    }
  });
  it('stays on the board', () => {
    expect(movesFor('HORSE', side, [0, 0])).toEqual(destinations([1, 2], [2, 1]));
  });
  it('excludes friends and captures enemies', () => {
    expect(
      movesFor(
        'HORSE',
        side,
        [4, 4],
        [
          [2, 3, 'friend'],
          [2, 5, 'enemy'],
        ],
      ),
    ).toEqual(all.filter((move) => move !== '2,3'));
  });
});
