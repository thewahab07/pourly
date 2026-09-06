/**
 * Level design tool (development only — never bundled into the app).
 *
 * Each level is specified by hand: its colour palette, tube count, spare-tube
 * count, capacity and a target optimal-solution length chosen from measured
 * difficulty distributions (see scripts/probe-difficulty.ts). The tool then
 * searches a deterministic seed sweep for a board matching that specification,
 * grading every candidate with the real solver — whose iterative-deepening
 * search returns an optimal-length solution.
 *
 * The result is printed as TypeScript literals which are committed into
 * src/levels/levels.ts as fixed data. The game never generates levels at
 * runtime, and never runs the solver.
 *
 * Usage: npm run design:levels
 */
import { isSolved, isTubeComplete } from '../src/engine/engine';
import { solve } from '../src/engine/solver';
import type { Board, Difficulty, LiquidColor, Tube } from '../src/engine/types';

interface LevelSpec {
  readonly id: number;
  readonly name: string;
  readonly difficulty: Difficulty;
  /** Exact palette, chosen so colours on a board stay easy to tell apart. */
  readonly palette: readonly LiquidColor[];
  /** Number of spare (empty) tubes. Fewer spares means far tighter play. */
  readonly empties: number;
  readonly capacity: number;
  /** Desired optimal-solution length, inclusive on both ends. */
  readonly targetMoves: readonly [number, number];
}

/** Deterministic PRNG so level generation is fully reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deals the palette into `palette.length` completely full tubes plus `empties`
 * spare tubes — the classic liquid-sort starting shape.
 */
function deal(spec: LevelSpec, random: () => number): Board {
  const pool: LiquidColor[] = [];
  for (const color of spec.palette) {
    for (let i = 0; i < spec.capacity; i += 1) pool.push(color);
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) throw new Error('shuffle out of bounds');
    pool[i] = b;
    pool[j] = a;
  }

  const tubes: Tube[] = [];
  for (let i = 0; i < spec.palette.length; i += 1) {
    tubes.push(pool.slice(i * spec.capacity, (i + 1) * spec.capacity));
  }
  for (let i = 0; i < spec.empties; i += 1) tubes.push([]);
  return tubes;
}

/** Rejects boards that would feel unpolished or give away free progress. */
function isWellFormed(board: Board, capacity: number): boolean {
  if (isSolved(board, capacity)) return false;

  const filled = board.filter((tube) => tube.length > 0);
  for (const tube of filled) {
    // No tube may start already sorted — that is a wasted tube.
    if (isTubeComplete(tube, capacity)) return false;
  }

  // Require real mixing: on average a tube should hold at least ~2.4 colours,
  // and no single tube may be three-quarters one colour at the start.
  const distinct = filled.map((tube) => new Set(tube).size);
  const average = distinct.reduce((sum, n) => sum + n, 0) / filled.length;
  if (average < 2.4) return false;

  for (const tube of filled) {
    const counts = new Map<LiquidColor, number>();
    for (const layer of tube) counts.set(layer, (counts.get(layer) ?? 0) + 1);
    for (const count of counts.values()) {
      if (count >= capacity - 1 && capacity >= 4) return false;
    }
  }
  return true;
}

const SPECS: readonly LevelSpec[] = [
  { id: 1,  name: 'First Drops',        difficulty: 'tutorial', palette: ['orange', 'cyan', 'green'], empties: 2, capacity: 4, targetMoves: [5, 6] },
  { id: 2,  name: 'Two Spares',         difficulty: 'tutorial', palette: ['red', 'yellow', 'blue'], empties: 2, capacity: 4, targetMoves: [7, 8] },
  { id: 3,  name: 'Finding Order',      difficulty: 'tutorial', palette: ['purple', 'yellow', 'cyan'], empties: 2, capacity: 4, targetMoves: [9, 10] },
  { id: 4,  name: 'Four Hues',          difficulty: 'easy',     palette: ['red', 'yellow', 'green', 'blue'], empties: 2, capacity: 4, targetMoves: [10, 11] },
  { id: 5,  name: 'Steady Hand',        difficulty: 'easy',     palette: ['orange', 'cyan', 'purple', 'green'], empties: 2, capacity: 4, targetMoves: [12, 13] },
  { id: 6,  name: 'One Spare',          difficulty: 'easy',     palette: ['red', 'yellow', 'green', 'blue'], empties: 1, capacity: 4, targetMoves: [10, 12] },
  { id: 7,  name: 'Five Alive',         difficulty: 'easy',     palette: ['red', 'orange', 'green', 'blue', 'purple'], empties: 2, capacity: 4, targetMoves: [14, 15] },
  { id: 8,  name: 'Careful Pour',       difficulty: 'easy',     palette: ['orange', 'yellow', 'cyan', 'blue', 'pink'], empties: 2, capacity: 4, targetMoves: [16, 17] },
  { id: 9,  name: 'Six Shades',         difficulty: 'medium',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue'], empties: 2, capacity: 4, targetMoves: [17, 18] },
  { id: 10, name: 'Narrow Margin',      difficulty: 'medium',   palette: ['red', 'yellow', 'green', 'blue', 'purple'], empties: 1, capacity: 4, targetMoves: [14, 16] },
  { id: 11, name: 'Rising Tide',        difficulty: 'medium',   palette: ['orange', 'yellow', 'green', 'cyan', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [19, 20] },
  { id: 12, name: 'Deep Mix',           difficulty: 'medium',   palette: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'], empties: 2, capacity: 4, targetMoves: [20, 21] },
  { id: 13, name: 'Seven Streams',      difficulty: 'medium',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'], empties: 2, capacity: 4, targetMoves: [20, 21] },
  { id: 14, name: 'Tangled',            difficulty: 'medium',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [22, 23] },
  { id: 15, name: 'Tight Fit',          difficulty: 'hard',     palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue'], empties: 1, capacity: 4, targetMoves: [18, 20] },
  { id: 16, name: 'Cross Currents',     difficulty: 'hard',     palette: ['orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [23, 24] },
  { id: 17, name: 'Full Spectrum',      difficulty: 'hard',     palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [23, 24] },
  { id: 18, name: 'Undertow',           difficulty: 'hard',     palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [25, 26] },
  { id: 19, name: 'Deep Vessels',       difficulty: 'hard',     palette: ['red', 'orange', 'green', 'cyan', 'blue', 'pink'], empties: 2, capacity: 5, targetMoves: [24, 25] },
  { id: 20, name: 'Bottleneck',         difficulty: 'hard',     palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'], empties: 1, capacity: 4, targetMoves: [21, 23] },
  { id: 21, name: 'Spectrum Storm',     difficulty: 'expert',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 4, targetMoves: [26, 27] },
  { id: 22, name: 'Cascade',            difficulty: 'expert',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'], empties: 2, capacity: 5, targetMoves: [27, 28] },
  { id: 23, name: 'Slow Separation',    difficulty: 'expert',   palette: ['orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 5, targetMoves: [29, 30] },
  { id: 24, name: 'Undercurrent',       difficulty: 'expert',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 5, targetMoves: [31, 32] },
  { id: 25, name: 'Final Distillation', difficulty: 'expert',   palette: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'], empties: 2, capacity: 5, targetMoves: [33, 34] },
];

function formatTube(tube: Tube): string {
  if (tube.length === 0) return '[]';
  return `[${tube.map((color) => `'${color}'`).join(', ')}]`;
}

function main(): void {
  const chunks: string[] = [];

  for (const spec of SPECS) {
    let board: Board | null = null;
    let optimal = 0;

    for (let seed = 1; seed <= 20000 && board === null; seed += 1) {
      const candidate = deal(spec, mulberry32(spec.id * 1_000_003 + seed));
      if (!isWellFormed(candidate, spec.capacity)) continue;

      const result = solve(candidate, spec.capacity, { maxDepth: 120, maxNodes: 900_000 });
      if (!result.solved) continue;

      const [low, high] = spec.targetMoves;
      if (result.moves.length < low || result.moves.length > high) continue;

      board = candidate;
      optimal = result.moves.length;
    }

    if (board === null) {
      console.error(`level ${spec.id} (${spec.name}): NO CANDIDATE FOUND`);
      process.exitCode = 1;
      continue;
    }

    console.error(
      `level ${String(spec.id).padStart(2)} ${spec.name.padEnd(20)} ` +
        `colors=${spec.palette.length} spare=${spec.empties} cap=${spec.capacity} optimal=${optimal}`,
    );

    chunks.push(
      [
        '  {',
        `    id: ${spec.id},`,
        `    name: '${spec.name}',`,
        `    difficulty: '${spec.difficulty}',`,
        `    capacity: ${spec.capacity},`,
        '    tubes: [',
        ...board.map((tube) => `      ${formatTube(tube)},`),
        '    ],',
        '  },',
      ].join('\n'),
    );
  }

  console.log(chunks.join('\n'));
}

main();
