/**
 * Centralised colour system.
 *
 * Liquid colours are defined once here and consumed by both the SVG renderer
 * (via gradients) and the UI. Nothing else in the app may hard-code a liquid
 * colour value.
 */
import type { LiquidColor } from '../engine/types';

export interface LiquidPalette {
  /** Mid tone — the colour the liquid reads as. */
  readonly base: string;
  /** Lighter tone used at the top of a layer's gradient. */
  readonly light: string;
  /** Darker tone used at the bottom of a layer's gradient and for edges. */
  readonly dark: string;
  /** Bright specular tone for the glass highlight over this liquid. */
  readonly highlight: string;
  /** Human-readable name, used for accessibility labels. */
  readonly label: string;
}

export const LIQUID_PALETTE: Readonly<Record<LiquidColor, LiquidPalette>> = {
  red: {
    base: '#E8503F',
    light: '#FF7A66',
    dark: '#C0362A',
    highlight: '#FFB1A2',
    label: 'red',
  },
  orange: {
    base: '#F28B36',
    light: '#FFB169',
    dark: '#CE6A1C',
    highlight: '#FFD3A6',
    label: 'orange',
  },
  yellow: {
    base: '#F2C438',
    light: '#FFE07A',
    dark: '#D0A017',
    highlight: '#FFF0B8',
    label: 'yellow',
  },
  green: {
    base: '#57BE6B',
    light: '#84DC94',
    dark: '#3E9A50',
    highlight: '#BCF0C6',
    label: 'green',
  },
  cyan: {
    base: '#3FBBD0',
    light: '#76DCEC',
    dark: '#2694AA',
    highlight: '#B4EFF7',
    label: 'cyan',
  },
  blue: {
    base: '#4A78D8',
    light: '#7CA3F0',
    dark: '#3055AE',
    highlight: '#B6CDFA',
    label: 'blue',
  },
  purple: {
    base: '#8B5CD6',
    light: '#B389EC',
    dark: '#6A3EB0',
    highlight: '#D8C2F7',
    label: 'purple',
  },
  pink: {
    base: '#E86FA6',
    light: '#FF9DC6',
    dark: '#C24C81',
    highlight: '#FFC8DF',
    label: 'pink',
  },
};

export function liquidPalette(color: LiquidColor): LiquidPalette {
  return LIQUID_PALETTE[color];
}

/** Surface, ink and accent colours for the app chrome. */
export const UI_COLORS = {
  paper: '#FBF6EC',
  paperSoft: '#F5EEE0',
  paperDeep: '#EDE3D2',
  paperLine: '#E0D4BE',
  ink: '#3E3323',
  inkSoft: '#6B5B45',
  inkMuted: '#9A8A72',
  brand: '#F0803C',
  brandDark: '#D8652A',
  brandLight: '#FFA36B',
  accent: '#4FA8C8',
  accentDark: '#3A8AA8',
  success: '#5FBF6A',
  successDark: '#45A551',
  danger: '#E4626B',
  dangerDark: '#C74954',
  glassStroke: '#6C5B44',
  glassFill: '#FFFFFF',
  shadow: '#2A2015',
} as const;

export type UiColor = keyof typeof UI_COLORS;
