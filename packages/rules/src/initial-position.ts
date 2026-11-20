/** Standard starting position: 16 pieces per side (BR-02), Red to move (BR-17). */
import { parseFen } from './fen';
import type { Position } from './position';

export const INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

export function createInitialPosition(): Position {
  return parseFen(INITIAL_FEN);
}
