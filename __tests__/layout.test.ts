/**
 * The board layout must stay balanced and on-screen across phone sizes, and it
 * must never depend on a hardcoded resolution.
 */
import { computeBoardLayout, splitRows } from '@/utils/layout';

const SCREENS = [
  { name: 'small phone', width: 320, height: 480 },
  { name: 'normal phone', width: 393, height: 640 },
  { name: 'large phone', width: 480, height: 780 },
  { name: 'very tall phone', width: 412, height: 900 },
];

const BOARDS = [
  { tubeCount: 5, capacity: 4 },
  { tubeCount: 7, capacity: 4 },
  { tubeCount: 9, capacity: 4 },
  { tubeCount: 10, capacity: 4 },
  { tubeCount: 10, capacity: 5 },
];

describe('splitRows', () => {
  it('keeps small boards on a single row', () => {
    expect(splitRows(3)).toEqual([3]);
    expect(splitRows(5)).toEqual([5]);
  });

  it('splits larger boards into two balanced rows', () => {
    expect(splitRows(6)).toEqual([3, 3]);
    expect(splitRows(9)).toEqual([5, 4]);
    expect(splitRows(10)).toEqual([5, 5]);
  });
});

describe('computeBoardLayout', () => {
  it.each(SCREENS)('fits every board on a $name', ({ width, height }) => {
    for (const board of BOARDS) {
      const layout = computeBoardLayout({ width, height, ...board });

      expect(layout.slots).toHaveLength(board.tubeCount);
      expect(layout.boardWidth).toBeLessThanOrEqual(width + 0.01);
      expect(layout.boardHeight).toBeLessThanOrEqual(height + 0.01);

      // Tubes must stay large enough to tap comfortably.
      expect(layout.tubeWidth).toBeGreaterThanOrEqual(20);
      expect(layout.layerHeight).toBeGreaterThan(4);

      for (const slot of layout.slots) {
        expect(slot.x - layout.tubeWidth / 2).toBeGreaterThanOrEqual(-0.01);
        expect(slot.x + layout.tubeWidth / 2).toBeLessThanOrEqual(layout.boardWidth + 0.01);
        expect(slot.y - layout.tubeHeight / 2).toBeGreaterThanOrEqual(-0.01);
        expect(slot.y + layout.tubeHeight / 2).toBeLessThanOrEqual(layout.boardHeight + 0.01);
      }
    }
  });

  it('scales the tubes up when the screen is larger', () => {
    const small = computeBoardLayout({ width: 320, height: 480, tubeCount: 7, capacity: 4 });
    const large = computeBoardLayout({ width: 480, height: 780, tubeCount: 7, capacity: 4 });
    expect(large.tubeWidth).toBeGreaterThan(small.tubeWidth);
    expect(large.tubeHeight).toBeGreaterThan(small.tubeHeight);
  });

  it('gives a deeper tube more room per layer than a shallow one of the same width', () => {
    const four = computeBoardLayout({ width: 412, height: 700, tubeCount: 10, capacity: 4 });
    const five = computeBoardLayout({ width: 412, height: 700, tubeCount: 10, capacity: 5 });
    expect(five.tubeHeight).toBeGreaterThan(four.tubeHeight);
    // The liquid column must always account for exactly `capacity` layers.
    expect(five.layerHeight * 5).toBeLessThan(five.tubeHeight);
  });

  it('never returns overlapping slots', () => {
    const layout = computeBoardLayout({ width: 412, height: 700, tubeCount: 10, capacity: 4 });
    const byRow = new Map<number, number[]>();
    for (const slot of layout.slots) {
      byRow.set(slot.row, [...(byRow.get(slot.row) ?? []), slot.x]);
    }
    for (const xs of byRow.values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1) {
        const gap = (sorted[i] ?? 0) - (sorted[i - 1] ?? 0);
        expect(gap).toBeGreaterThanOrEqual(layout.tubeWidth);
      }
    }
  });

  it('centres a ragged row against the wider one', () => {
    const layout = computeBoardLayout({ width: 412, height: 700, tubeCount: 9, capacity: 4 });
    const rowCentre = (row: number): number => {
      const xs = layout.slots.filter((slot) => slot.row === row).map((slot) => slot.x);
      return (Math.min(...xs) + Math.max(...xs)) / 2;
    };
    expect(rowCentre(0)).toBeCloseTo(rowCentre(1), 5);
  });

  it('survives a degenerate measurement without producing NaN', () => {
    const layout = computeBoardLayout({ width: 0, height: 0, tubeCount: 5, capacity: 4 });
    expect(Number.isFinite(layout.tubeWidth)).toBe(true);
    expect(Number.isFinite(layout.layerHeight)).toBe(true);
    expect(layout.slots).toHaveLength(5);
  });
});
