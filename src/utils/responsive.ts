/**
 * Responsive scaling helpers.
 *
 * Everything is derived from the live window dimensions so the same code works
 * on a 320 pt iPhone SE, a 430 pt iPhone Pro Max, and a 768 pt iPad — with no
 * breakpoint tables to maintain.
 *
 * Usage: import { rs, rf, rsp } from '../utils/responsive'
 *   rs(16)  → scaled spacing/size   (scales with screen width)
 *   rf(16)  → scaled font size      (gentler curve, never too big)
 *   rsp(16) → scaled padding        (like rs but clamped tighter)
 */
import { Dimensions, PixelRatio } from "react-native";

// Base design width (iPhone 14 / 390 pt).
const BASE_WIDTH = 390;
// Base design height.
const BASE_HEIGHT = 844;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** Width scale factor, clamped so very wide screens don't blow things up. */
const wScale = Math.min(SCREEN_W / BASE_WIDTH, 1.35);
/** Height scale factor. */
const hScale = Math.min(SCREEN_H / BASE_HEIGHT, 1.35);

/**
 * Scale a size/spacing value proportionally to screen width.
 * Suitable for widths, heights, gaps, border radii, icon sizes.
 */
export function rs(size: number): number {
  return PixelRatio.roundToNearestPixel(size * wScale);
}

/**
 * Scale a font size. Uses a gentler curve (square root blending) so text
 * doesn't grow as aggressively as spacing on large screens.
 */
export function rf(size: number): number {
  const factor = 0.5 + Math.sqrt(wScale) * 0.5;
  return PixelRatio.roundToNearestPixel(size * factor);
}

/**
 * Scale a padding/margin value. Slightly less aggressive than rs so content
 * gains breathing room without wasting too much on large phones.
 */
export function rsp(size: number): number {
  const factor = 0.6 + wScale * 0.4;
  return PixelRatio.roundToNearestPixel(size * factor);
}

/** The actual screen width, for convenience. */
export const SCREEN_WIDTH = SCREEN_W;
/** The actual screen height, for convenience. */
export const SCREEN_HEIGHT = SCREEN_H;

/**
 * Returns how many grid columns fit at a given minimum card size.
 * Useful for the levels grid: never go below `minCols` or above `maxCols`.
 */
export function gridColumns(
  screenWidth: number,
  cardMin: number,
  gap: number,
  padding: number,
  minCols = 3,
  maxCols = 5,
): number {
  const available = screenWidth - padding * 2;
  for (let cols = maxCols; cols >= minCols; cols--) {
    const cardWidth = (available - gap * (cols - 1)) / cols;
    if (cardWidth >= cardMin) return cols;
  }
  return minCols;
}
