/**
 * Level validation solver.
 *
 * This exists to guarantee every shipped level is actually solvable. It is a
 * development/test utility — the game itself never calls it, so there is no
 * hint or auto-solve feature reachable from the UI.
 *
 * Strategy: iterative-deepening DFS over pour states with
 *   - canonical hashing that ignores tube order (tubes are interchangeable), and
 *   - a transposition table keyed by that hash, and
 *   - an admissible lower bound used to prune branches that cannot finish in
 *     the remaining depth.
 *
 * This solves every level in this game comfortably; boards here are small
 * (<= 14 tubes, capacity 4).
 */
import { applyPour, isSolved, legalMoves, topRunLength } from './engine';
import type { Board, LiquidColor } from './types';

export interface SolveResult {
  readonly solved: boolean;
  /** The move sequence that solves the board, when one was found. */
  readonly moves: readonly { from: number; to: number }[];
  /** Number of search nodes expanded — useful as a rough difficulty signal. */
  readonly nodesExplored: number;
}

export interface SolveOptions {
  /** Maximum solution length to search for. */
  readonly maxDepth?: number;
  /** Hard cap on expanded nodes, so a pathological board cannot hang a test run. */
  readonly maxNodes?: number;
}

/**
 * Canonical key for a board. Tubes are interchangeable, so sorting their string
 * forms collapses permutations onto one key and shrinks the search space a lot.
 */
function boardKey(tubes: Board): string {
  const parts = tubes.map((tube) => tube.join(','));
  parts.sort();
  return parts.join('|');
}

/**
 * Admissible lower bound on the remaining number of pours.
 *
 * Each color needs at least (number of distinct tubes containing it - 1) pours
 * to be gathered into a single tube. Summing over colors never overestimates,
 * because one pour can reduce that count by at most one for exactly one color.
 */
function remainingMoveLowerBound(tubes: Board): number {
  const tubesPerColor = new Map<LiquidColor, number>();
  for (const tube of tubes) {
    const seen = new Set<LiquidColor>();
    for (const layer of tube) {
      seen.add(layer);
    }
    for (const color of seen) {
      tubesPerColor.set(color, (tubesPerColor.get(color) ?? 0) + 1);
    }
  }

  let bound = 0;
  for (const count of tubesPerColor.values()) {
    bound += count - 1;
  }
  return bound;
}

/**
 * Orders candidate moves so promising ones are tried first. This does not
 * affect correctness, only how quickly a solution is found.
 */
function scoreMove(tubes: Board, capacity: number, from: number, to: number): number {
  const source = tubes[from];
  const destination = tubes[to];
  if (source === undefined || destination === undefined) return -1000;

  const color = source[source.length - 1];
  const run = topRunLength(source);
  let score = 0;

  // Emptying a tube completely is usually excellent.
  if (run === source.length) score += 40;
  // Pouring onto the same color consolidates; pouring into an empty tube spreads.
  if (destination.length > 0) score += 25;
  else score -= 10;
  // Prefer pours that fill the destination exactly.
  if (destination.length + run === capacity) score += 30;
  // Prefer moving larger runs.
  score += run * 3;
  // Slight preference for destinations that are already uniform in this color.
  if (destination.length > 0 && destination.every((layer) => layer === color)) score += 12;

  return score;
}

/** Quick structural check: a board can only be solvable if color counts divide evenly. */
export function hasValidColorCounts(tubes: Board, capacity: number): boolean {
  const counts = new Map<LiquidColor, number>();
  for (const tube of tubes) {
    if (tube.length > capacity) return false;
    for (const layer of tube) {
      counts.set(layer, (counts.get(layer) ?? 0) + 1);
    }
  }
  for (const count of counts.values()) {
    if (count !== capacity) return false;
  }
  // There must be at least as many tubes as colors, otherwise nothing fits.
  return tubes.length >= counts.size;
}

/**
 * Attempts to solve a board. Returns the move sequence when solvable.
 */
export function solve(tubes: Board, capacity: number, options: SolveOptions = {}): SolveResult {
  const maxDepth = options.maxDepth ?? 90;
  const maxNodes = options.maxNodes ?? 4_000_000;

  if (isSolved(tubes, capacity)) {
    return { solved: true, moves: [], nodesExplored: 0 };
  }

  let nodesExplored = 0;
  let exhausted = false;

  for (let depthLimit = remainingMoveLowerBound(tubes); depthLimit <= maxDepth; depthLimit += 1) {
    // `visited` maps a canonical board key to the deepest remaining budget it
    // has already been searched with. Re-visiting with a smaller budget is
    // pointless, so this prunes aggressively without losing completeness.
    const visited = new Map<string, number>();
    const path: { from: number; to: number }[] = [];

    const search = (board: Board, remaining: number): boolean => {
      if (nodesExplored >= maxNodes) {
        exhausted = true;
        return false;
      }
      if (isSolved(board, capacity)) return true;
      if (remaining === 0) return false;
      if (remainingMoveLowerBound(board) > remaining) return false;

      const key = boardKey(board);
      const seenWith = visited.get(key);
      if (seenWith !== undefined && seenWith >= remaining) return false;
      visited.set(key, remaining);

      nodesExplored += 1;

      const candidates = legalMoves(board, capacity)
        .map((move) => ({ move, score: scoreMove(board, capacity, move.from, move.to) }))
        .sort((a, b) => b.score - a.score);

      for (const { move } of candidates) {
        const applied = applyPour(board, capacity, move.from, move.to);
        /* istanbul ignore next -- legalMoves only yields valid pours */
        if (applied === null) continue;
        path.push(move);
        if (search(applied.tubes, remaining - 1)) return true;
        path.pop();
      }
      return false;
    };

    if (search(tubes, depthLimit)) {
      return { solved: true, moves: path.slice(), nodesExplored };
    }
    if (exhausted) break;
  }

  return { solved: false, moves: [], nodesExplored };
}

/** Verifies a solution actually solves the board, replaying it through the engine. */
export function verifySolution(
  tubes: Board,
  capacity: number,
  moves: readonly { from: number; to: number }[],
): boolean {
  let board = tubes;
  for (const move of moves) {
    const applied = applyPour(board, capacity, move.from, move.to);
    if (applied === null) return false;
    board = applied.tubes;
  }
  return isSolved(board, capacity);
}
