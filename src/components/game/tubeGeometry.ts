/**
 * Shared geometry for the glass tube.
 *
 * The tube is drawn in its own pixel space (viewBox `0 0 width height`), so the
 * SVG needs no scaling and the layout module's numbers are used directly. Both
 * the static renderer and the animated pour bands read their positions from
 * here, which is what keeps them pixel-aligned.
 */
import { TUBE_WALL_RATIO } from '../../utils/layout';

export interface TubeGeometry {
  readonly width: number;
  readonly height: number;
  readonly wall: number;
  /** Interior bounds, where liquid may be drawn. */
  readonly interiorLeft: number;
  readonly interiorWidth: number;
  readonly interiorTop: number;
  readonly interiorBottom: number;
  readonly layerHeight: number;
  /** Corner radii of the outer silhouette. */
  readonly topRadius: number;
  readonly bottomRadius: number;
}

export function tubeGeometry(width: number, height: number, layerHeight: number): TubeGeometry {
  const wall = Math.max(1.6, width * TUBE_WALL_RATIO);
  return {
    width,
    height,
    wall,
    interiorLeft: wall,
    interiorWidth: width - wall * 2,
    interiorTop: wall,
    interiorBottom: height - wall,
    layerHeight,
    topRadius: width * 0.14,
    bottomRadius: width * 0.46,
  };
}

/**
 * Path for a tube silhouette: gently rounded shoulders, deeply rounded bottom.
 * `inset` shrinks the shape uniformly, which produces the interior outline.
 */
export function tubePath(geometry: TubeGeometry, inset: number): string {
  const left = inset;
  const right = geometry.width - inset;
  const top = inset;
  const bottom = geometry.height - inset;
  const rt = Math.max(1, geometry.topRadius - inset);
  const rb = Math.max(1, Math.min(geometry.bottomRadius - inset, (right - left) / 2));

  return [
    `M ${left + rt} ${top}`,
    `H ${right - rt}`,
    `A ${rt} ${rt} 0 0 1 ${right} ${top + rt}`,
    `V ${bottom - rb}`,
    `A ${rb} ${rb} 0 0 1 ${right - rb} ${bottom}`,
    `H ${left + rb}`,
    `A ${rb} ${rb} 0 0 1 ${left} ${bottom - rb}`,
    `V ${top + rt}`,
    `A ${rt} ${rt} 0 0 1 ${left + rt} ${top}`,
    'Z',
  ].join(' ');
}

/** Top edge (y) of the `index`-th liquid layer, counting from the bottom. */
export function layerTop(geometry: TubeGeometry, index: number): number {
  return geometry.interiorBottom - (index + 1) * geometry.layerHeight;
}

/** Surface height (y) of a liquid column holding `count` layers. */
export function surfaceY(geometry: TubeGeometry, count: number): number {
  return geometry.interiorBottom - count * geometry.layerHeight;
}

/** Vertical bulge of the rounded liquid surface. */
export function meniscusHeight(geometry: TubeGeometry): number {
  return Math.min(geometry.layerHeight * 0.32, geometry.interiorWidth * 0.16);
}
