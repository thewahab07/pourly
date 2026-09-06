/**
 * Where a pouring tube travels to, and where its stream arc falls.
 *
 * The source tube tilts so its mouth hovers above the destination. The stream
 * is a curved SVG arc from the tilted mouth to the destination's opening —
 * just like pouring a liquid in real life.
 */
import type { BoardLayout } from '../../utils/layout';
import type { PourTarget } from './TubeView';

/** Tilt of a pouring tube, in degrees. */
const POUR_ANGLE = 62;

/** Vertical gap between the source's mouth and the destination's, as a share of tube height. */
const MOUTH_GAP_RATIO = 0.22;

export interface PourGeometry {
  readonly target: PourTarget;
  readonly stream: {
    /** Left edge of the SVG bounding box in board coordinates. */
    readonly left: number;
    /** Top edge of the SVG bounding box in board coordinates. */
    readonly top: number;
    /** Width of the SVG canvas. */
    readonly svgWidth: number;
    /** Height of the SVG canvas. */
    readonly svgHeight: number;
    /** Arc start (source mouth), relative to SVG top-left. */
    readonly startX: number;
    readonly startY: number;
    /** Arc end (destination mouth), relative to SVG top-left. */
    readonly endX: number;
    readonly endY: number;
  };
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Vertical space a pour needs above the top row of tubes, so the game screen
 * can reserve it and the tilted tube is never clipped.
 */
export function pourHeadroom(layout: BoardLayout): number {
  return layout.tubeHeight * 0.55;
}

export function computePourGeometry(
  layout: BoardLayout,
  from: number,
  to: number,
): PourGeometry | null {
  const source = layout.slots[from];
  const destination = layout.slots[to];
  if (source === undefined || destination === undefined) return null;

  const { tubeWidth, tubeHeight, boardWidth } = layout;
  const angle = toRadians(POUR_ANGLE);
  const halfHeight = tubeHeight / 2;
  const offsetX = halfHeight * Math.sin(angle);

  // Approach the destination from whichever side the source is on.
  // Flip if that would push the tilted tube off the board.
  let direction = destination.x >= source.x ? 1 : -1;
  const margin = tubeWidth * 0.35;
  const centerFor = (dir: number): number => destination.x - dir * offsetX;
  if (centerFor(direction) < margin || centerFor(direction) > boardWidth - margin) {
    direction = -direction;
  }

  const gap = tubeHeight * MOUTH_GAP_RATIO;

  // Destination mouth position (board coords): top-centre of destination tube
  const destMouthX = destination.x;
  const destMouthY = destination.y - halfHeight - gap * 0.2;

  // Where the tilted source ends up (board coords):
  // centre of source when tilted over destination
  const centerX = centerFor(direction);
  const centerY = destMouthY + halfHeight * Math.cos(angle);

  // Source mouth (board coords): tip of the tilted tube
  // When tilted by `angle`, the mouth is at the end of the tube rotated around its centre.
  // The mouth moves: +/- sin(angle)*halfHeight horizontally, -cos(angle)*halfHeight vertically
  const sourceMouthX = centerX + direction * halfHeight * Math.sin(angle);
  const sourceMouthY = centerY - halfHeight * Math.cos(angle);

  // Build a bounding box that contains both arc endpoints with padding
  const padding = tubeWidth * 0.8;
  const minX = Math.min(sourceMouthX, destMouthX) - padding;
  const minY = Math.min(sourceMouthY, destMouthY) - padding * 0.5;
  const maxX = Math.max(sourceMouthX, destMouthX) + padding;
  const maxY = Math.max(sourceMouthY, destMouthY) + padding * 0.5;

  const svgLeft = minX;
  const svgTop = minY;
  const svgWidth = Math.max(tubeWidth * 2, maxX - minX);
  const svgHeight = Math.max(tubeHeight * 0.5, maxY - minY);

  return {
    target: {
      x: centerX - source.x,
      y: centerY - source.y,
      angle: direction * POUR_ANGLE,
    },
    stream: {
      left: svgLeft,
      top: svgTop,
      svgWidth,
      svgHeight,
      // Arc endpoints relative to SVG top-left
      startX: sourceMouthX - svgLeft,
      startY: sourceMouthY - svgTop,
      endX: destMouthX - svgLeft,
      endY: destMouthY - svgTop,
    },
  };
}
