/** Prints an optimal solution for one level as JSON. Development helper. */
import { solve } from '../src/engine/solver';
import { getLevel } from '../src/levels/levels';

const id = Number.parseInt(process.argv[2] ?? '1', 10);
const level = getLevel(id);
if (level === undefined) {
  console.error(`no level ${id}`);
  process.exit(1);
}
const result = solve(level.tubes, level.capacity, { maxDepth: 120, maxNodes: 3_000_000 });
if (!result.solved) {
  console.error(`level ${id} not solved`);
  process.exit(1);
}
console.log(JSON.stringify(result.moves));
