import { describe, expect, it } from 'vitest';
import { createInitialPosition, parseFen } from '@xiangqi/rules';
import { getLegalMovesForSelection, resolvePieceSelection } from './selection';

describe('board piece selection & legal moves (SCRUM-157)', () => {
  it('allows selecting only friendly pieces when it is the player turn', () => {
    const { board } = createInitialPosition();

    // Red tries to select Black piece on Red turn -> rejected
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: null,
        clickedSquare: { file: 4, rank: 9 },
      }),
    ).toBeNull();

    // Red tries to select empty square -> null
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: null,
        clickedSquare: { file: 4, rank: 4 },
      }),
    ).toBeNull();

    // Red selects own Cannon at (1, 2) -> selected
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: null,
        clickedSquare: { file: 1, rank: 2 },
      }),
    ).toEqual({ file: 1, rank: 2 });

    // Red tries to select own piece during Black's turn -> rejected
    expect(
      resolvePieceSelection({
        board,
        turn: 'BLACK',
        mySide: 'RED',
        selectedSquare: null,
        clickedSquare: { file: 1, rank: 2 },
      }),
    ).toBeNull();
  });

  it('toggles off on second click, switches between friendly pieces, and clears on empty/enemy click', () => {
    const { board } = createInitialPosition();

    // Toggle off
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: { file: 1, rank: 2 },
        clickedSquare: { file: 1, rank: 2 },
      }),
    ).toBeNull();

    // Switch directly to Horse at (1, 0)
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: { file: 1, rank: 2 },
        clickedSquare: { file: 1, rank: 0 },
      }),
    ).toEqual({ file: 1, rank: 0 });

    // Click empty square while selected -> clears
    expect(
      resolvePieceSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: { file: 1, rank: 2 },
        clickedSquare: { file: 1, rank: 5 },
      }),
    ).toBeNull();
  });

  it('returns legal moves from the shared Rules Engine including check/pin filtering', () => {
    // Red General at (4,0), Red Chariot at (4,1) pinned by Black Chariot at (4,9); Black General at (3,9).
    const { board } = parseFen('3kr4/9/9/9/9/9/9/9/4R4/4K4 w');

    const moves = getLegalMovesForSelection({
      board,
      turn: 'RED',
      mySide: 'RED',
      selectedSquare: { file: 4, rank: 1 },
    });

    // Pinned Red Chariot cannot leave file 4: can only move along rank 2..9 on file 4 (8 squares)
    expect(moves.length).toBe(8);
    expect(moves.every((sq) => sq.file === 4)).toBe(true);
    expect(moves).toContainEqual({ file: 4, rank: 9 }); // capture pinning chariot
  });

  it('returns empty legal moves if not player turn or selected piece is opponent piece', () => {
    const { board } = createInitialPosition();

    expect(
      getLegalMovesForSelection({
        board,
        turn: 'BLACK',
        mySide: 'RED',
        selectedSquare: { file: 1, rank: 2 },
      }),
    ).toEqual([]);

    expect(
      getLegalMovesForSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: { file: 1, rank: 7 }, // Black cannon
      }),
    ).toEqual([]);
  });

  it('computes legal moves well within the 100ms p95 budget (NFR-01)', () => {
    const { board } = createInitialPosition();
    const cannon = { file: 1, rank: 2 };
    const chariot = { file: 0, rank: 0 };

    const durations: number[] = [];
    for (let i = 0; i < 40; i++) {
      const target = i % 2 === 0 ? cannon : chariot;
      const start = performance.now();
      getLegalMovesForSelection({
        board,
        turn: 'RED',
        mySide: 'RED',
        selectedSquare: target,
      });
      durations.push(performance.now() - start);
    }

    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)]!;
    expect(p95).toBeLessThan(100);
  });
});
