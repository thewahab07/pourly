/**
 * Development probe: samples random boards for a set of configurations and
 * reports the distribution of optimal solution lengths, so level difficulty
 * bands can be chosen from real data rather than guesswork.
 */
import { solve } from '../src/engine/solver';
import { LIQUID_COLORS } from '../src/engine/types';
import type { Board, LiquidColor, Tube } from '../src/engine/types';

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

function deal(colors: number, empties: number, capacity: number, random: () => number): Board {
  const pool: LiquidColor[] = [];
  for (let i = 0; i < colors; i += 1) {
    const color = LIQUID_COLORS[i];
    if (color === undefined) throw new Error('not enough colors');
    for (let j = 0; j < capacity; j += 1) pool.push(color);
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) throw new Error('shuffle bounds');
    pool[i] = b;
    pool[j] = a;
  }
  const tubes: Tube[] = [];
  for (let i = 0; i < colors; i += 1) tubes.push(pool.slice(i * capacity, (i + 1) * capacity));
  for (let i = 0; i < empties; i += 1) tubes.push([]);
  return tubes;
}

const CONFIGS = [
  { colors: 3, empties: 2, capacity: 4 },
  { colors: 4, empties: 2, capacity: 4 },
  { colors: 5, empties: 2, capacity: 4 },
  { colors: 6, empties: 2, capacity: 4 },
  { colors: 7, empties: 2, capacity: 4 },
  { colors: 8, empties: 2, capacity: 4 },
  { colors: 4, empties: 1, capacity: 4 },
  { colors: 5, empties: 1, capacity: 4 },
  { colors: 6, empties: 1, capacity: 4 },
  { colors: 7, empties: 1, capacity: 4 },
  { colors: 8, empties: 1, capacity: 4 },
  { colors: 6, empties: 2, capacity: 5 },
  { colors: 7, empties: 2, capacity: 5 },
  { colors: 8, empties: 2, capacity: 5 },
  { colors: 8, empties: 1, capacity: 5 },
];

const SAMPLES = 40;

for (const config of CONFIGS) {
  const lengths: number[] = [];
  let unsolvable = 0;
  let budgetHit = 0;
  const started = Date.now();

  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const random = mulberry32(sample * 7919 + config.colors * 131 + config.empties * 17 + config.capacity);
    const board = deal(config.colors, config.empties, config.capacity, random);
    const result = solve(board, config.capacity, { maxDepth: 120, maxNodes: 600_000 });
    if (result.solved) lengths.push(result.moves.length);
    else if (result.nodesExplored >= 600_000) budgetHit += 1;
    else unsolvable += 1;
  }

  lengths.sort((a, b) => a - b);
  const at = (q: number) => lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * q))] ?? 0;
  const ms = Date.now() - started;
  console.log(
    `c=${config.colors} e=${config.empties} cap=${config.capacity} | solvable ${lengths.length}/${SAMPLES}` +
      ` unsolv=${unsolvable} budget=${budgetHit} | min=${lengths[0] ?? '-'} p25=${at(0.25)} p50=${at(0.5)} p75=${at(0.75)} max=${lengths[lengths.length - 1] ?? '-'}` +
      ` | ${ms}ms`,
  );
}
