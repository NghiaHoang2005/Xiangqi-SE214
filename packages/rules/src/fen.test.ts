import { describe, expect, it } from 'vitest';
import { InvalidFenError, parseFen, toFen } from './fen';
import { INITIAL_FEN, createInitialPosition } from './initial-position';

describe('toFen / parseFen', () => {
  it('serializes the initial position to the standard FEN', () => {
    expect(toFen(createInitialPosition())).toBe(INITIAL_FEN);
  });

  it('round-trips a middlegame position with Black to move', () => {
    const fen = '2bakab2/9/2n1c1n2/p3p3p/2p6/6P2/P3P3P/1CN1B1N2/4A4/2BAK4 b';
    expect(toFen(parseFen(fen))).toBe(fen);
  });

  it('ignores move counters after the side to move', () => {
    expect(toFen(parseFen(`${INITIAL_FEN} - - 0 1`))).toBe(INITIAL_FEN);
  });

  it.each([
    ['an empty string', ''],
    ['a missing side to move', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'],
    ['an unknown side to move', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR x'],
    ['too few ranks', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/RNBAKABNR w'],
    ['a rank that is too long', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNRR w'],
    ['a rank that is too short', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABN w'],
    ['an unknown piece', 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNX w'],
  ])('rejects %s', (_, fen) => {
    expect(() => parseFen(fen)).toThrow(InvalidFenError);
  });
});
