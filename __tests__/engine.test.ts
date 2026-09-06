import {
  applyPour,
  canPour,
  canUndo,
  cloneBoard,
  createGameState,
  evaluatePour,
  isFull,
  isEmpty,
  isSolved,
  isTubeComplete,
  legalMoves,
  pour,
  restart,
  revertPour,
  topColor,
  topRunLength,
  undo,
} from '@/engine/engine';
import type { Board, LevelDefinition } from '@/engine/types';

const CAPACITY = 4;

const level: LevelDefinition = {
  id: 99,
  name: 'Test Level',
  difficulty: 'tutorial',
  capacity: CAPACITY,
  tubes: [
    ['red', 'blue', 'red', 'red'],
    ['blue', 'red', 'blue', 'blue'],
    [],
  ],
};

describe('tube inspection', () => {
  it('reads the top color of a tube', () => {
    expect(topColor(['red', 'blue'])).toBe('blue');
    expect(topColor([])).toBeUndefined();
  });

  it('measures the contiguous top run', () => {
    expect(topRunLength([])).toBe(0);
    expect(topRunLength(['red'])).toBe(1);
    expect(topRunLength(['blue', 'red', 'red'])).toBe(2);
    expect(topRunLength(['red', 'red', 'red', 'red'])).toBe(4);
    expect(topRunLength(['red', 'red', 'blue'])).toBe(1);
  });

  it('reports empty and full tubes', () => {
    expect(isEmpty([])).toBe(true);
    expect(isEmpty(['red'])).toBe(false);
    expect(isFull(['red', 'red', 'red', 'red'], CAPACITY)).toBe(true);
    expect(isFull(['red', 'red'], CAPACITY)).toBe(false);
  });

  it('treats a tube as complete only when empty or uniformly full', () => {
    expect(isTubeComplete([], CAPACITY)).toBe(true);
    expect(isTubeComplete(['red', 'red', 'red', 'red'], CAPACITY)).toBe(true);
    // A single color that has not filled the tube is not complete: the rest of
    // that color is still elsewhere on the board.
    expect(isTubeComplete(['red', 'red'], CAPACITY)).toBe(false);
    expect(isTubeComplete(['red', 'red', 'red', 'blue'], CAPACITY)).toBe(false);
  });
});

describe('evaluatePour', () => {
  it('accepts a pour onto a matching color', () => {
    const board: Board = [['red', 'red'], ['red']];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: true, amount: 2, color: 'red' });
  });

  it('accepts a pour into an empty tube', () => {
    const board: Board = [['blue', 'red'], []];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: true, amount: 1, color: 'red' });
  });

  it('rejects pouring a tube into itself', () => {
    const board: Board = [['red']];
    expect(evaluatePour(board, CAPACITY, 0, 0)).toEqual({ valid: false, reason: 'same-tube' });
  });

  it('rejects pouring from an empty tube', () => {
    const board: Board = [[], ['red']];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: false, reason: 'source-empty' });
  });

  it('rejects pouring into a full tube', () => {
    const board: Board = [['red'], ['red', 'red', 'red', 'red']];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: false, reason: 'destination-full' });
  });

  it('rejects a color mismatch', () => {
    const board: Board = [['red'], ['blue']];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: false, reason: 'color-mismatch' });
  });

  it('rejects indices outside the board', () => {
    const board: Board = [['red']];
    expect(evaluatePour(board, CAPACITY, 0, 5)).toEqual({ valid: false, reason: 'out-of-range' });
    expect(evaluatePour(board, CAPACITY, 7, 0)).toEqual({ valid: false, reason: 'out-of-range' });
  });

  it('pours only the contiguous top group, not every layer of that color', () => {
    const board: Board = [['red', 'blue', 'red', 'red'], []];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: true, amount: 2, color: 'red' });
  });

  it('clamps a pour to the destination capacity (partial pour)', () => {
    const board: Board = [['red', 'red', 'red'], ['blue', 'blue', 'red']];
    expect(evaluatePour(board, CAPACITY, 0, 1)).toEqual({ valid: true, amount: 1, color: 'red' });
  });

  it('exposes canPour as a boolean shorthand', () => {
    const board: Board = [['red'], ['blue']];
    expect(canPour(board, CAPACITY, 0, 1)).toBe(false);
    expect(canPour(board, CAPACITY, 1, 0)).toBe(false);
  });
});

describe('applyPour', () => {
  it('moves the full top run when there is room', () => {
    const board: Board = [['blue', 'red', 'red'], ['red']];
    const result = applyPour(board, CAPACITY, 0, 1);
    expect(result).not.toBeNull();
    expect(result?.tubes[0]).toEqual(['blue']);
    expect(result?.tubes[1]).toEqual(['red', 'red', 'red']);
    expect(result?.move).toEqual({ from: 0, to: 1, amount: 2, color: 'red' });
  });

  it('performs a partial pour when the destination fills up', () => {
    const board: Board = [['red', 'red', 'red'], ['blue', 'blue', 'red']];
    const result = applyPour(board, CAPACITY, 0, 1);
    expect(result?.tubes[0]).toEqual(['red', 'red']);
    expect(result?.tubes[1]).toEqual(['blue', 'blue', 'red', 'red']);
    expect(result?.move.amount).toBe(1);
  });

  it('empties the source on a full pour', () => {
    const board: Board = [['red', 'red'], []];
    const result = applyPour(board, CAPACITY, 0, 1);
    expect(result?.tubes[0]).toEqual([]);
    expect(result?.tubes[1]).toEqual(['red', 'red']);
  });

  it('returns null for an illegal pour', () => {
    const board: Board = [['red'], ['blue']];
    expect(applyPour(board, CAPACITY, 0, 1)).toBeNull();
  });

  it('never mutates the board it was given', () => {
    const board: Board = [['red', 'red'], []];
    const snapshot = JSON.stringify(board);
    applyPour(board, CAPACITY, 0, 1);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe('revertPour', () => {
  it('restores the exact previous board', () => {
    const board: Board = [['blue', 'red', 'red'], ['red']];
    const applied = applyPour(board, CAPACITY, 0, 1);
    expect(applied).not.toBeNull();
    if (applied === null) return;
    const reverted = revertPour(applied.tubes, applied.move);
    expect(reverted).toEqual(board);
  });

  it('refuses to revert when the destination no longer holds the poured color', () => {
    const move = { from: 0, to: 1, amount: 2, color: 'red' } as const;
    expect(revertPour([['blue'], ['blue', 'blue']], move)).toBeNull();
  });

  it('refuses to revert when the destination lost layers', () => {
    const move = { from: 0, to: 1, amount: 3, color: 'red' } as const;
    expect(revertPour([[], ['red']], move)).toBeNull();
  });
});

describe('win detection', () => {
  it('recognises a solved board', () => {
    expect(
      isSolved([['red', 'red', 'red', 'red'], ['blue', 'blue', 'blue', 'blue'], []], CAPACITY),
    ).toBe(true);
  });

  it('rejects a board with a partially filled single-color tube', () => {
    expect(isSolved([['red', 'red', 'red'], ['red'], []], CAPACITY)).toBe(false);
  });

  it('rejects a mixed board', () => {
    expect(isSolved([['red', 'blue', 'red', 'blue']], CAPACITY)).toBe(false);
  });
});

describe('game state', () => {
  it('creates state from a level without aliasing the definition', () => {
    const state = createGameState(level);
    expect(state.levelId).toBe(99);
    expect(state.status).toBe('playing');
    expect(state.moveCount).toBe(0);
    expect(state.history).toHaveLength(0);
    expect(state.tubes).toEqual(level.tubes);
    expect(state.tubes[0]).not.toBe(level.tubes[0]);
  });

  it('records history and move count on a valid pour', () => {
    const state = createGameState(level);
    const next = pour(state, 0, 2);
    expect(next).not.toBe(state);
    expect(next.moveCount).toBe(1);
    expect(next.history).toHaveLength(1);
    expect(next.tubes[0]).toEqual(['red', 'blue']);
    expect(next.tubes[2]).toEqual(['red', 'red']);
  });

  it('returns the identical state object when a pour is illegal', () => {
    const state = createGameState(level);
    // Tube 0 tops with red, tube 1 tops with blue.
    expect(pour(state, 0, 1)).toBe(state);
  });

  it('flags a win when the last pour sorts the board', () => {
    const almost: LevelDefinition = {
      id: 98,
      name: 'Almost',
      difficulty: 'tutorial',
      capacity: CAPACITY,
      tubes: [['red', 'red', 'red'], ['red'], ['blue', 'blue', 'blue', 'blue']],
    };
    const state = createGameState(almost);
    const next = pour(state, 1, 0);
    expect(next.status).toBe('won');
  });

  it('never mutates the level definition across a full playthrough', () => {
    const snapshot = JSON.stringify(level.tubes);
    let state = createGameState(level);
    state = pour(state, 0, 2);
    state = pour(state, 1, 0);
    state = undo(state);
    state = restart(level);
    expect(JSON.stringify(level.tubes)).toBe(snapshot);
    expect(state.tubes).toEqual(level.tubes);
  });
});

describe('undo', () => {
  it('reverses the most recent move exactly', () => {
    const state = createGameState(level);
    const moved = pour(state, 0, 2);
    const back = undo(moved);
    expect(back.tubes).toEqual(state.tubes);
    expect(back.history).toHaveLength(0);
    expect(back.moveCount).toBe(0);
  });

  it('supports several consecutive undos', () => {
    let state = createGameState(level);
    const original = state;
    // Tube 0 tops with two reds onto the spare, then tube 1's blues stack onto tube 0.
    state = pour(state, 0, 2);
    state = pour(state, 1, 0);
    expect(state.moveCount).toBe(2);
    state = undo(state);
    state = undo(state);
    expect(state.tubes).toEqual(original.tubes);
    expect(state.moveCount).toBe(0);
  });

  it('does nothing when there is no history', () => {
    const state = createGameState(level);
    expect(undo(state)).toBe(state);
    expect(canUndo(state)).toBe(false);
  });

  it('clears a win when undone', () => {
    const almost: LevelDefinition = {
      id: 97,
      name: 'Almost',
      difficulty: 'tutorial',
      capacity: CAPACITY,
      tubes: [['red', 'red', 'red'], ['red'], ['blue', 'blue', 'blue', 'blue']],
    };
    const won = pour(createGameState(almost), 1, 0);
    expect(won.status).toBe('won');
    expect(undo(won).status).toBe('playing');
  });
});

describe('restart', () => {
  it('restores the original configuration and clears history', () => {
    let state = createGameState(level);
    state = pour(state, 0, 2);
    state = pour(state, 1, 0);
    const fresh = restart(level);
    expect(fresh.tubes).toEqual(level.tubes);
    expect(fresh.history).toHaveLength(0);
    expect(fresh.moveCount).toBe(0);
    expect(fresh.status).toBe('playing');
  });
});

describe('legalMoves', () => {
  it('lists every valid pour and skips finished tubes', () => {
    const board: Board = [['red', 'red', 'red', 'red'], ['blue', 'red'], []];
    const moves = legalMoves(board, CAPACITY);
    // Tube 0 is already complete and must not be offered as a source.
    expect(moves.every((move) => move.from !== 0)).toBe(true);
    expect(moves).toContainEqual({ from: 1, to: 2 });
  });

  it('returns nothing for a solved board', () => {
    expect(legalMoves([['red', 'red', 'red', 'red'], []], CAPACITY)).toHaveLength(0);
  });
});

describe('cloneBoard', () => {
  it('produces an independent copy', () => {
    const board: Board = [['red'], []];
    const copy = cloneBoard(board);
    expect(copy).toEqual(board);
    expect(copy[0]).not.toBe(board[0]);
  });
});
