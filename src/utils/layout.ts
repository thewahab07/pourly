/**
 * Board layout maths.
 *
 * Tube size and slot positions are derived from the space the board is actually
 * given, so the same level looks balanced on a small phone and a large one.
 * Nothing here reads Dimensions directly — the caller passes measured space,
 * which keeps the function pure and testable.
 */

export interface BoardLayoutInput {
  /** Width available to the board, in points. */
  readonly width: number;
  /** Height available to the board, in points. */
  readonly height: number;
  readonly tubeCount: number;
  /** Layers a tube holds; taller tubes need a taller slot. */
  readonly capacity: number;
}

export interface TubeSlot {
  /** Centre of the tube slot, relative to the board's top-left corner. */
  readonly x: number;
  readonly y: number;
  readonly row: number;
  readonly column: number;
}

export interface BoardLayout {
  readonly tubeWidth: number;
  readonly tubeHeight: number;
  /** Height of one liquid layer inside the tube's interior. */
  readonly layerHeight: number;
  readonly rows: number;
  readonly columns: number;
  readonly slots: readonly TubeSlot[];
  /** Size of the laid-out board, used to centre it in the available space. */
  readonly boardWidth: number;
  readonly boardHeight: number;
}

/** Tubes narrower than this get hard to tap; wider than this looks clumsy. */
const MIN_TUBE_WIDTH = 30;
const MAX_TUBE_WIDTH = 82;

/**
 * How much taller than its natural proportions a tube may be drawn when the
 * board has vertical room to spare. Without this, a single row of tubes leaves
 * most of a tall phone empty.
 */
const MAX_HEIGHT_STRETCH = 1.28;

/** Wall thickness as a fraction of tube width, matched by the SVG renderer. */
export const TUBE_WALL_RATIO = 0.085;
/** Padding above the liquid column, so the tube never looks brim-full. */
export const TUBE_HEAD_RATIO = 0.42;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Splits `tubeCount` tubes into rows. One row reads best for small boards; two
 * balanced rows keep large boards from shrinking the tubes to nothing.
 */
export function splitRows(tubeCount: number): number[] {
  if (tubeCount <= 5) return [tubeCount];
  const top = Math.ceil(tubeCount / 2);
  return [top, tubeCount - top];
}

/**
 * Computes tube geometry and slot centres for a board.
 *
 * The tube's aspect ratio follows its capacity, so a five-layer tube is taller
 * than a four-layer one rather than just having thinner layers.
 */
export function computeBoardLayout(input: BoardLayoutInput): BoardLayout {
  const { width, height, tubeCount, capacity } = input;
  const rowSizes = splitRows(Math.max(1, tubeCount));
  const rows = rowSizes.length;
  const columns = Math.max(...rowSizes);

  // Interior height is capacity layers plus head room; add the two walls.
  const naturalAspect = capacity * 0.74 + TUBE_HEAD_RATIO + 0.5;

  const columnGapRatio = 0.4;
  // Row gap scales gently with available height so it is proportional on all screens.
  const rowGap = rows > 1 ? clamp(height * 0.045, 18, 34) : 0;

  // Width-driven candidate: fit `columns` tubes plus the gaps between them.
  const widthBudget = Math.max(1, width);
  const widthCandidate =
    widthBudget / (columns + columnGapRatio * (columns - 1));

  // Height-driven candidate: fit `rows` tubes plus the gap between rows.
  const heightPerRow = Math.max(1, height - rowGap * (rows - 1)) / rows;
  const heightCandidate = heightPerRow / naturalAspect;

  const tubeWidth = clamp(
    Math.min(widthCandidate, heightCandidate),
    MIN_TUBE_WIDTH,
    MAX_TUBE_WIDTH,
  );

  // Spend leftover vertical room on taller tubes rather than empty background,
  // but never stretch them into straws.
  const naturalHeight = tubeWidth * naturalAspect;
  const stretch = clamp(heightPerRow / naturalHeight, 1, MAX_HEIGHT_STRETCH);
  const tubeHeight = naturalHeight * stretch;
  const columnGap = tubeWidth * columnGapRatio;

  const wall = tubeWidth * TUBE_WALL_RATIO;
  const interiorHeight = tubeHeight - wall * 2 - tubeWidth * TUBE_HEAD_RATIO;
  const layerHeight = interiorHeight / capacity;

  const boardWidth = columns * tubeWidth + columnGap * (columns - 1);
  const boardHeight = rows * tubeHeight + rowGap * (rows - 1);

  const slots: TubeSlot[] = [];
  let index = 0;
  rowSizes.forEach((countInRow, row) => {
    const rowWidth = countInRow * tubeWidth + columnGap * (countInRow - 1);
    // Rows are centred against each other, so an odd split still looks tidy.
    const rowLeft = (boardWidth - rowWidth) / 2;
    for (let column = 0; column < countInRow; column += 1) {
      slots.push({
        x: rowLeft + column * (tubeWidth + columnGap) + tubeWidth / 2,
        y: row * (tubeHeight + rowGap) + tubeHeight / 2,
        row,
        column,
      });
      index += 1;
    }
  });

  return {
    tubeWidth,
    tubeHeight,
    layerHeight,
    rows,
    columns,
    slots: slots.slice(0, index),
    boardWidth,
    boardHeight,
  };
}
