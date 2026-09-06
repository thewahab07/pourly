/**
 * Pure game rules for Liquid Color Sort.
 *
 * Every function here is side-effect free and never mutates its arguments —
 * in particular it never mutates a `LevelDefinition`, so definitions can be
 * shared safely and restarts always restore a pristine board.
 */
import type {
  Board,
  GameState,
  LevelDefinition,
  LiquidColor,
  Move,
  PourEvaluation,
  Tube,
} from './types';

/** Returns the top (pourable) color of a tube, or `undefined` when it is empty. */
export function topColor(tube: Tube): LiquidColor | undefined {
  return tube.length > 0 ? tube[tube.length - 1] : undefined;
}

/** Number of layers at the top of `tube` sharing the same color. */
export function topRunLength(tube: Tube): number {
  if (tube.length === 0) return 0;
  const color = tube[tube.length - 1];
  let run = 1;
  for (let i = tube.length - 2; i >= 0; i -= 1) {
    if (tube[i] !== color) break;
    run += 1;
  }
  return run;
}

export function isEmpty(tube: Tube): boolean {
  return tube.length === 0;
}

export function isFull(tube: Tube, capacity: number): boolean {
  return tube.length >= capacity;
}

/**
 * A tube is "complete" when it is empty, or entirely filled to capacity with a
 * single color. A tube holding a single color but not yet full is not complete:
 * the remaining layers of that color still live somewhere else.
 */
export function isTubeComplete(tube: Tube, capacity: number): boolean {
  if (tube.length === 0) return true;
  if (tube.length !== capacity) return false;
  const first = tube[0];
  return tube.every((layer) => layer === first);
}

/** The board is solved when every tube is complete. */
export function isSolved(tubes: Board, capacity: number): boolean {
  return tubes.every((tube) => isTubeComplete(tube, capacity));
}

/**
 * Decides whether pouring from `from` into `to` is legal, and how much liquid
 * would move. This is the single source of truth for move legality; the UI must
 * not re-implement any part of it.
 */
export function evaluatePour(
  tubes: Board,
  capacity: number,
  from: number,
  to: number,
): PourEvaluation {
  if (from === to) {
    return { valid: false, reason: 'same-tube' };
  }
  const source = tubes[from];
  const destination = tubes[to];
  if (source === undefined || destination === undefined) {
    return { valid: false, reason: 'out-of-range' };
  }
  const color = topColor(source);
  if (color === undefined) {
    return { valid: false, reason: 'source-empty' };
  }
  const freeSpace = capacity - destination.length;
  if (freeSpace <= 0) {
    return { valid: false, reason: 'destination-full' };
  }
  const destinationTop = topColor(destination);
  if (destinationTop !== undefined && destinationTop !== color) {
    return { valid: false, reason: 'color-mismatch' };
  }
  const amount = Math.min(topRunLength(source), freeSpace);
  return { valid: true, amount, color };
}

export function canPour(tubes: Board, capacity: number, from: number, to: number): boolean {
  return evaluatePour(tubes, capacity, from, to).valid;
}

/**
 * Applies a pour to a board, returning a new board. Returns `null` when the
 * pour is illegal, so callers cannot accidentally corrupt state.
 */
export function applyPour(
  tubes: Board,
  capacity: number,
  from: number,
  to: number,
): { tubes: Board; move: Move } | null {
  const evaluation = evaluatePour(tubes, capacity, from, to);
  if (!evaluation.valid) return null;

  const source = tubes[from];
  const destination = tubes[to];
  /* istanbul ignore next -- guaranteed by evaluatePour returning valid */
  if (source === undefined || destination === undefined) return null;

  const { amount, color } = evaluation;
  const nextTubes = tubes.slice() as Tube[];
  nextTubes[from] = source.slice(0, source.length - amount);
  nextTubes[to] = [...destination, ...Array.from({ length: amount }, () => color)];

  return { tubes: nextTubes, move: { from, to, amount, color } };
}

/** Reverses a move, returning a new board. Returns `null` if the move cannot be undone. */
export function revertPour(tubes: Board, move: Move): Board | null {
  const source = tubes[move.from];
  const destination = tubes[move.to];
  if (source === undefined || destination === undefined) return null;
  if (destination.length < move.amount) return null;

  // The layers about to move back must still be the ones that were poured.
  for (let i = 0; i < move.amount; i += 1) {
    if (destination[destination.length - 1 - i] !== move.color) return null;
  }

  const nextTubes = tubes.slice() as Tube[];
  nextTubes[move.to] = destination.slice(0, destination.length - move.amount);
  nextTubes[move.from] = [
    ...source,
    ...Array.from({ length: move.amount }, () => move.color),
  ];
  return nextTubes;
}

/** Deep-copies a level's tubes so gameplay never aliases the level definition. */
export function cloneBoard(tubes: Board): Board {
  return tubes.map((tube) => tube.slice());
}

/** Builds a fresh game state from a level definition. */
export function createGameState(level: LevelDefinition): GameState {
  const tubes = cloneBoard(level.tubes);
  return {
    levelId: level.id,
    capacity: level.capacity,
    tubes,
    history: [],
    status: isSolved(tubes, level.capacity) ? 'won' : 'playing',
    moveCount: 0,
  };
}

/**
 * Performs a pour against a game state. Returns the unchanged state reference
 * when the move is illegal, so callers can cheaply detect rejection.
 */
export function pour(state: GameState, from: number, to: number): GameState {
  const result = applyPour(state.tubes, state.capacity, from, to);
  if (result === null) return state;

  return {
    ...state,
    tubes: result.tubes,
    history: [...state.history, result.move],
    moveCount: state.moveCount + 1,
    status: isSolved(result.tubes, state.capacity) ? 'won' : 'playing',
  };
}

/** Undoes the most recent move. Returns the same state when there is no history. */
export function undo(state: GameState): GameState {
  const last = state.history[state.history.length - 1];
  if (last === undefined) return state;

  const reverted = revertPour(state.tubes, last);
  if (reverted === null) return state;

  return {
    ...state,
    tubes: reverted,
    history: state.history.slice(0, -1),
    moveCount: Math.max(0, state.moveCount - 1),
    status: 'playing',
  };
}

/** Restores the level's original configuration and clears all history. */
export function restart(level: LevelDefinition): GameState {
  return createGameState(level);
}

export function canUndo(state: GameState): boolean {
  return state.history.length > 0;
}

/** Enumerates every legal pour on the board. Used by the solver and by tests. */
export function legalMoves(tubes: Board, capacity: number): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  for (let from = 0; from < tubes.length; from += 1) {
    const source = tubes[from];
    if (source === undefined || source.length === 0) continue;
    // Pouring a tube that is already uniformly filled to capacity is never useful.
    if (isTubeComplete(source, capacity)) continue;
    for (let to = 0; to < tubes.length; to += 1) {
      if (from === to) continue;
      if (canPour(tubes, capacity, from, to)) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}
