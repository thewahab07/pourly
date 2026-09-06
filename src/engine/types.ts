/**
 * Core domain types for Liquid Color Sort.
 *
 * Everything in this module is pure data: no React, no rendering concerns.
 * The engine operates on these types and is fully testable in isolation.
 */

/** The eight liquid colors the game uses. Keys map into the theme color table. */
export const LIQUID_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'pink',
] as const;

export type LiquidColor = (typeof LIQUID_COLORS)[number];

/**
 * A single unit of liquid inside a tube.
 *
 * Tubes are modelled bottom-up: index 0 is the bottom of the tube and the last
 * element is the top (the surface that pours out first).
 */
export type LiquidLayer = LiquidColor;

/** A tube is an ordered stack of liquid layers, bottom-first. */
export type Tube = readonly LiquidLayer[];

/** The full board: an ordered list of tubes. */
export type Board = readonly Tube[];

export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';

/**
 * A handcrafted level.
 *
 * `tubes` is the exact starting arrangement. Empty tubes are represented by
 * empty arrays and are part of the definition, not derived at runtime.
 */
export interface LevelDefinition {
  readonly id: number;
  readonly name: string;
  readonly difficulty: Difficulty;
  /** Capacity of every tube on this board, in layers. */
  readonly capacity: number;
  readonly tubes: Board;
}

/** A recorded pour, sufficient to replay or reverse the move exactly. */
export interface Move {
  readonly from: number;
  readonly to: number;
  /** Number of layers transferred. Always >= 1 for a recorded move. */
  readonly amount: number;
  /** The color that was moved; kept for undo integrity checks and analytics-free debugging. */
  readonly color: LiquidColor;
}

export type GameStatus = 'playing' | 'won';

/** The complete, serialisable state of one level in progress. */
export interface GameState {
  readonly levelId: number;
  readonly capacity: number;
  readonly tubes: Board;
  readonly history: readonly Move[];
  readonly status: GameStatus;
  readonly moveCount: number;
}

/** Why a requested pour was rejected. Used for feedback, never for control flow in the UI. */
export type PourRejection =
  | 'same-tube'
  | 'source-empty'
  | 'destination-full'
  | 'color-mismatch'
  | 'out-of-range';

export type PourEvaluation =
  | { readonly valid: true; readonly amount: number; readonly color: LiquidColor }
  | { readonly valid: false; readonly reason: PourRejection };
