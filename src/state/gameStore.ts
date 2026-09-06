/**
 * Gameplay state for the level currently being played.
 *
 * Design note on animation synchronisation: a pour is committed to the engine
 * *immediately*, and `activePour` describes the transfer that the renderer is
 * still drawing. The engine is therefore always the truth — an interrupted or
 * dropped animation can never corrupt the board, and undo, restart and
 * navigation are safe at any moment. The renderer subtracts the in-flight
 * layers from the destination (and draws them leaving the source) so nothing
 * ever teleports on screen.
 *
 * Interaction is locked for the duration of a pour, and every pour carries a
 * token so a late callback from a cancelled animation cannot unlock the board
 * or clear a newer pour.
 */
import { create } from 'zustand';

import {
  canUndo as engineCanUndo,
  createGameState,
  evaluatePour,
  pour as enginePour,
  restart as engineRestart,
  undo as engineUndo,
} from '../engine/engine';
import type { GameState, LevelDefinition, LiquidColor, PourRejection } from '../engine/types';

/** A transfer the renderer is currently animating. */
export interface ActivePour {
  /** Identifies this pour so stale animation callbacks are ignored. */
  readonly token: number;
  readonly from: number;
  readonly to: number;
  readonly amount: number;
  readonly color: LiquidColor;
}

/** Emitted when a tap is rejected, so the UI can shake the tube once. */
export interface RejectedMove {
  readonly token: number;
  readonly tube: number;
  readonly reason: PourRejection;
}

interface GameStoreState {
  readonly level: LevelDefinition | null;
  readonly game: GameState | null;
  readonly selectedTube: number | null;
  readonly activePour: ActivePour | null;
  readonly rejected: RejectedMove | null;
  /** True while a pour animation is running; blocks all board interaction. */
  readonly locked: boolean;

  loadLevel: (level: LevelDefinition) => void;
  /**
   * Handles a tap on a tube. Returns what happened so the calling component can
   * fire the matching sound and haptic without duplicating any game rules.
   */
  tapTube: (index: number) => TapOutcome;
  /** Called by the renderer when a pour animation finishes. */
  finishPour: (token: number) => void;
  undoMove: () => boolean;
  restartLevel: () => void;
  /** Drops any in-flight animation state, e.g. when leaving the screen. */
  cancelPour: () => void;
  clearLevel: () => void;
}

export type TapOutcome =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'selected'; readonly tube: number }
  | { readonly kind: 'deselected'; readonly tube: number }
  | { readonly kind: 'poured'; readonly pour: ActivePour; readonly won: boolean }
  | { readonly kind: 'rejected'; readonly reason: PourRejection };

let nextToken = 1;

export const useGameStore = create<GameStoreState>((set, get) => ({
  level: null,
  game: null,
  selectedTube: null,
  activePour: null,
  rejected: null,
  locked: false,

  loadLevel: (level) => {
    set({
      level,
      game: createGameState(level),
      selectedTube: null,
      activePour: null,
      rejected: null,
      locked: false,
    });
  },

  tapTube: (index) => {
    const { game, selectedTube, locked } = get();
    if (game === null || locked) return { kind: 'ignored' };
    if (index < 0 || index >= game.tubes.length) return { kind: 'ignored' };
    if (game.status === 'won') return { kind: 'ignored' };

    // First tap: pick up a tube, but only one that has liquid to give.
    if (selectedTube === null) {
      const tube = game.tubes[index];
      if (tube === undefined || tube.length === 0) return { kind: 'ignored' };
      set({ selectedTube: index, rejected: null });
      return { kind: 'selected', tube: index };
    }

    // Tapping the selected tube again puts it back down.
    if (selectedTube === index) {
      set({ selectedTube: null, rejected: null });
      return { kind: 'deselected', tube: index };
    }

    const evaluation = evaluatePour(game.tubes, game.capacity, selectedTube, index);
    if (!evaluation.valid) {
      // An invalid move must leave the board untouched. The selection is kept
      // so the player can simply try a different destination.
      set({ rejected: { token: nextToken++, tube: index, reason: evaluation.reason } });
      return { kind: 'rejected', reason: evaluation.reason };
    }

    const nextGame = enginePour(game, selectedTube, index);
    const activePour: ActivePour = {
      token: nextToken++,
      from: selectedTube,
      to: index,
      amount: evaluation.amount,
      color: evaluation.color,
    };

    set({
      game: nextGame,
      selectedTube: null,
      activePour,
      rejected: null,
      locked: true,
    });

    return { kind: 'poured', pour: activePour, won: nextGame.status === 'won' };
  },

  finishPour: (token) => {
    const { activePour } = get();
    // Ignore callbacks from a pour that was already replaced or cancelled.
    if (activePour === null || activePour.token !== token) return;
    set({ activePour: null, locked: false });
  },

  undoMove: () => {
    const { game, locked } = get();
    if (game === null || locked) return false;
    if (!engineCanUndo(game)) return false;

    set({ game: engineUndo(game), selectedTube: null, rejected: null });
    return true;
  },

  restartLevel: () => {
    const { level } = get();
    if (level === null) return;
    set({
      game: engineRestart(level),
      selectedTube: null,
      activePour: null,
      rejected: null,
      locked: false,
    });
  },

  cancelPour: () => {
    set({ activePour: null, locked: false });
  },

  clearLevel: () => {
    set({
      level: null,
      game: null,
      selectedTube: null,
      activePour: null,
      rejected: null,
      locked: false,
    });
  },
}));

/** True when the player has a move to take back and nothing is animating. */
export function selectCanUndo(state: GameStoreState): boolean {
  return state.game !== null && !state.locked && state.game.history.length > 0;
}

/** The level is finished and the pour that finished it has stopped animating. */
export function selectIsLevelComplete(state: GameStoreState): boolean {
  return state.game?.status === 'won' && state.activePour === null;
}
