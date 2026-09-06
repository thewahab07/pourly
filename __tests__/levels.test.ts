/**
 * Validates the 25 shipped levels.
 *
 * Every board is run through the solver and the resulting move sequence is
 * replayed through the engine, so "solvable" means "actually finishable with
 * the same rules the player plays by" — not just that the search reported
 * success.
 */
import { createGameState, isSolved, isTubeComplete, pour } from '@/engine/engine';
import { hasValidColorCounts, solve, verifySolution } from '@/engine/solver';
import { LIQUID_COLORS } from '@/engine/types';
import type { LiquidColor } from '@/engine/types';
import { LEVELS, TOTAL_LEVELS, getLevel, getNextLevelId, isValidLevelId } from '@/levels';

describe('level catalogue', () => {
  it('ships exactly 25 levels', () => {
    expect(LEVELS).toHaveLength(TOTAL_LEVELS);
    expect(TOTAL_LEVELS).toBe(25);
  });

  it('numbers levels 1..25 with no gaps and unique names', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: TOTAL_LEVELS }, (_, index) => index + 1),
    );
    expect(new Set(LEVELS.map((level) => level.name)).size).toBe(TOTAL_LEVELS);
  });

  it('looks levels up by id', () => {
    expect(getLevel(1)?.name).toBe(LEVELS[0]?.name);
    expect(getLevel(0)).toBeUndefined();
    expect(getLevel(26)).toBeUndefined();
  });

  it('validates level ids', () => {
    expect(isValidLevelId(1)).toBe(true);
    expect(isValidLevelId(25)).toBe(true);
    expect(isValidLevelId(0)).toBe(false);
    expect(isValidLevelId(26)).toBe(false);
    expect(isValidLevelId(1.5)).toBe(false);
    expect(isValidLevelId(Number.NaN)).toBe(false);
  });

  it('chains levels together and stops at the last one', () => {
    expect(getNextLevelId(1)).toBe(2);
    expect(getNextLevelId(24)).toBe(25);
    expect(getNextLevelId(25)).toBeUndefined();
  });

  it('never gets easier as it progresses', () => {
    const rank = { tutorial: 0, easy: 1, medium: 2, hard: 3, expert: 4 } as const;
    for (let i = 1; i < LEVELS.length; i += 1) {
      const previous = LEVELS[i - 1];
      const current = LEVELS[i];
      if (previous === undefined || current === undefined) throw new Error('missing level');
      expect(rank[current.difficulty]).toBeGreaterThanOrEqual(rank[previous.difficulty]);
    }
  });
});

describe.each(LEVELS.map((level) => [level.id, level.name, level] as const))(
  'level %i (%s)',
  (_id, _name, level) => {
    it('is structurally sound', () => {
      expect(level.capacity).toBeGreaterThanOrEqual(4);
      expect(level.tubes.length).toBeGreaterThan(0);

      for (const tube of level.tubes) {
        expect(tube.length).toBeLessThanOrEqual(level.capacity);
        for (const layer of tube) {
          expect(LIQUID_COLORS).toContain(layer);
        }
      }

      // Every colour must appear exactly `capacity` times, otherwise the board
      // can never be sorted no matter how it is played.
      expect(hasValidColorCounts(level.tubes, level.capacity)).toBe(true);

      const counts = new Map<LiquidColor, number>();
      for (const tube of level.tubes) {
        for (const layer of tube) counts.set(layer, (counts.get(layer) ?? 0) + 1);
      }
      for (const count of counts.values()) {
        expect(count).toBe(level.capacity);
      }

      // There must be spare room to work with.
      const emptyTubes = level.tubes.filter((tube) => tube.length === 0).length;
      expect(emptyTubes).toBeGreaterThanOrEqual(1);
      expect(level.tubes.length).toBe(counts.size + emptyTubes);
    });

    it('does not start solved or with a tube already finished', () => {
      expect(isSolved(level.tubes, level.capacity)).toBe(false);
      for (const tube of level.tubes) {
        if (tube.length === 0) continue;
        expect(isTubeComplete(tube, level.capacity)).toBe(false);
      }
    });

    it('is solvable, and its solution replays cleanly through the engine', () => {
      const result = solve(level.tubes, level.capacity, { maxDepth: 120, maxNodes: 3_000_000 });

      expect(result.solved).toBe(true);
      expect(result.moves.length).toBeGreaterThan(0);
      expect(verifySolution(level.tubes, level.capacity, result.moves)).toBe(true);

      // Replay through the player-facing API: every move must be accepted, and
      // the final state must report a win.
      let state = createGameState(level);
      for (const move of result.moves) {
        const next = pour(state, move.from, move.to);
        expect(next).not.toBe(state);
        state = next;
      }
      expect(state.status).toBe('won');
      expect(state.moveCount).toBe(result.moves.length);
    });
  },
);

describe('difficulty curve', () => {
  it('rises in optimal solution length from the first level to the last', () => {
    const optimalFor = (index: number): number => {
      const level = LEVELS[index];
      if (level === undefined) throw new Error('missing level');
      const result = solve(level.tubes, level.capacity, { maxDepth: 120, maxNodes: 3_000_000 });
      expect(result.solved).toBe(true);
      return result.moves.length;
    };

    const first = optimalFor(0);
    const last = optimalFor(LEVELS.length - 1);
    expect(last).toBeGreaterThan(first * 3);
  });
});
