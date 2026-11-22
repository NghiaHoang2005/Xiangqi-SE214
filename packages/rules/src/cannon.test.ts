import { describe, expect, it } from 'vitest';
import { destinations, movesFor } from './move-test-helpers';

describe.each(['RED', 'BLACK'] as const)('cannon (%s)', (side) => {
  it('moves through empty squares along all four rays', () => {
    const expected = [
      ...Array.from({ length: 9 }, (_, file) => [file, 4] as const).filter(([file]) => file !== 4),
      ...Array.from({ length: 10 }, (_, rank) => [4, rank] as const).filter(
        ([, rank]) => rank !== 4,
      ),
    ];
    expect(movesFor('CANNON', side, [4, 4])).toEqual(destinations(...expected));
  });
  it('cannot capture without a screen or land in empty space beyond it', () => {
    expect(
      movesFor(
        'CANNON',
        side,
        [0, 0],
        [
          [2, 0, 'enemy'],
          [0, 1, 'friend'],
        ],
      ),
    ).toEqual(destinations([1, 0]));
  });
  it.each(['friend', 'enemy'] as const)('uses a %s screen in every direction', (relation) => {
    expect(
      movesFor(
        'CANNON',
        side,
        [4, 4],
        [
          [3, 4, relation],
          [1, 4, 'enemy'],
          [0, 4, 'enemy'],
          [5, 4, relation],
          [7, 4, 'enemy'],
          [8, 4, 'enemy'],
          [4, 3, relation],
          [4, 1, 'enemy'],
          [4, 0, 'enemy'],
          [4, 5, relation],
          [4, 7, 'enemy'],
          [4, 8, 'enemy'],
        ],
      ),
    ).toEqual(destinations([1, 4], [7, 4], [4, 1], [4, 7]));
  });
  it('cannot capture friends or jump a second screen', () => {
    expect(
      movesFor(
        'CANNON',
        side,
        [0, 0],
        [
          [1, 0, 'enemy'],
          [2, 0, 'friend'],
          [3, 0, 'enemy'],
          [0, 1, 'friend'],
        ],
      ),
    ).toEqual([]);
  });
});
