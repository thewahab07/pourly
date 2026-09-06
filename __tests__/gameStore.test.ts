/**
 * Interaction rules: selection, rejection, pour locking and the guarantees that
 * keep the animation from being able to corrupt the board.
 */
import { selectCanUndo, selectIsLevelComplete, useGameStore } from '@/state/gameStore';
import type { LevelDefinition } from '@/engine/types';

const level: LevelDefinition = {
  id: 1,
  name: 'Store Level',
  difficulty: 'tutorial',
  capacity: 4,
  tubes: [
    ['red', 'blue', 'red', 'red'],
    ['blue', 'red', 'blue', 'blue'],
    [],
  ],
};

const store = useGameStore;

beforeEach(() => {
  store.getState().clearLevel();
  store.getState().loadLevel(level);
});

describe('loading a level', () => {
  it('starts unlocked, unselected and with a pristine board', () => {
    const state = store.getState();
    expect(state.game?.tubes).toEqual(level.tubes);
    expect(state.selectedTube).toBeNull();
    expect(state.activePour).toBeNull();
    expect(state.locked).toBe(false);
  });

  it('does not alias the level definition', () => {
    expect(store.getState().game?.tubes[0]).not.toBe(level.tubes[0]);
  });
});

describe('selection', () => {
  it('selects a tube that has liquid', () => {
    expect(store.getState().tapTube(0)).toEqual({ kind: 'selected', tube: 0 });
    expect(store.getState().selectedTube).toBe(0);
  });

  it('ignores taps on an empty tube when nothing is selected', () => {
    expect(store.getState().tapTube(2)).toEqual({ kind: 'ignored' });
    expect(store.getState().selectedTube).toBeNull();
  });

  it('deselects when the selected tube is tapped again', () => {
    store.getState().tapTube(0);
    expect(store.getState().tapTube(0)).toEqual({ kind: 'deselected', tube: 0 });
    expect(store.getState().selectedTube).toBeNull();
  });

  it('ignores taps outside the board', () => {
    expect(store.getState().tapTube(-1)).toEqual({ kind: 'ignored' });
    expect(store.getState().tapTube(99)).toEqual({ kind: 'ignored' });
  });
});

describe('invalid moves', () => {
  it('leaves the board untouched and keeps the selection', () => {
    const before = store.getState().game?.tubes;
    store.getState().tapTube(0);
    // Tube 1 is full, so the pour is rejected before colours are compared.
    const outcome = store.getState().tapTube(1);

    expect(outcome).toEqual({ kind: 'rejected', reason: 'destination-full' });
    expect(store.getState().game?.tubes).toEqual(before);
    expect(store.getState().game?.moveCount).toBe(0);
    expect(store.getState().selectedTube).toBe(0);
    expect(store.getState().locked).toBe(false);
    expect(store.getState().rejected?.tube).toBe(1);
  });

  it('reports a colour mismatch when the destination has room', () => {
    store.getState().loadLevel({
      id: 4,
      name: 'Mismatch',
      difficulty: 'tutorial',
      capacity: 4,
      tubes: [['blue', 'red'], ['red', 'blue'], []],
    });
    store.getState().tapTube(0);
    expect(store.getState().tapTube(1)).toEqual({ kind: 'rejected', reason: 'color-mismatch' });
    expect(store.getState().game?.moveCount).toBe(0);
  });
});

describe('pouring', () => {
  it('commits to the engine immediately and locks interaction', () => {
    store.getState().tapTube(0);
    const outcome = store.getState().tapTube(2);

    expect(outcome.kind).toBe('poured');
    const state = store.getState();
    expect(state.game?.tubes[0]).toEqual(['red', 'blue']);
    expect(state.game?.tubes[2]).toEqual(['red', 'red']);
    expect(state.game?.moveCount).toBe(1);
    expect(state.locked).toBe(true);
    expect(state.selectedTube).toBeNull();
    expect(state.activePour).toMatchObject({ from: 0, to: 2, amount: 2, color: 'red' });
  });

  it('ignores every tap while a pour is animating, so rapid taps cannot double-pour', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const afterPour = store.getState().game;

    expect(store.getState().tapTube(1)).toEqual({ kind: 'ignored' });
    expect(store.getState().tapTube(0)).toEqual({ kind: 'ignored' });
    expect(store.getState().game).toBe(afterPour);
    expect(store.getState().selectedTube).toBeNull();
  });

  it('unlocks only when the matching pour token finishes', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const token = store.getState().activePour?.token;
    expect(token).toBeDefined();
    if (token === undefined) return;

    // A callback from an older, unrelated animation must be ignored.
    store.getState().finishPour(token - 1);
    expect(store.getState().locked).toBe(true);
    expect(store.getState().activePour).not.toBeNull();

    store.getState().finishPour(token);
    expect(store.getState().locked).toBe(false);
    expect(store.getState().activePour).toBeNull();
  });

  it('ignores a repeated finish callback for an already-finished pour', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const token = store.getState().activePour?.token ?? 0;
    store.getState().finishPour(token);

    store.getState().tapTube(1);
    store.getState().tapTube(0);
    const secondPour = store.getState().activePour;
    expect(secondPour).not.toBeNull();

    // The stale callback must not clear the newer pour.
    store.getState().finishPour(token);
    expect(store.getState().activePour).toBe(secondPour);
    expect(store.getState().locked).toBe(true);
  });

  it('reports a win once the final pour is made', () => {
    const almost: LevelDefinition = {
      id: 2,
      name: 'Almost',
      difficulty: 'tutorial',
      capacity: 4,
      tubes: [['red', 'red', 'red'], ['red'], ['blue', 'blue', 'blue', 'blue']],
    };
    store.getState().loadLevel(almost);
    store.getState().tapTube(1);
    const outcome = store.getState().tapTube(0);

    expect(outcome).toMatchObject({ kind: 'poured', won: true });
    expect(store.getState().game?.status).toBe('won');
  });

  it('ignores taps once the level is won', () => {
    const almost: LevelDefinition = {
      id: 3,
      name: 'Almost',
      difficulty: 'tutorial',
      capacity: 4,
      tubes: [['red', 'red', 'red'], ['red'], ['blue', 'blue', 'blue', 'blue']],
    };
    store.getState().loadLevel(almost);
    store.getState().tapTube(1);
    store.getState().tapTube(0);
    store.getState().finishPour(store.getState().activePour?.token ?? 0);

    expect(store.getState().tapTube(0)).toEqual({ kind: 'ignored' });
  });
});

describe('undo', () => {
  it('reverses the last move and clears the selection', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    store.getState().finishPour(store.getState().activePour?.token ?? 0);

    expect(store.getState().undoMove()).toBe(true);
    expect(store.getState().game?.tubes).toEqual(level.tubes);
    expect(store.getState().selectedTube).toBeNull();
  });

  it('refuses to run while a pour is animating', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const during = store.getState().game;

    expect(store.getState().undoMove()).toBe(false);
    expect(store.getState().game).toBe(during);
  });

  it('does nothing when there is no history', () => {
    expect(store.getState().undoMove()).toBe(false);
  });
});

describe('restart', () => {
  it('restores the level, clears history, selection and animation state', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    // Restart deliberately runs mid-animation: it must recover cleanly.
    store.getState().restartLevel();

    const state = store.getState();
    expect(state.game?.tubes).toEqual(level.tubes);
    expect(state.game?.history).toHaveLength(0);
    expect(state.game?.moveCount).toBe(0);
    expect(state.selectedTube).toBeNull();
    expect(state.activePour).toBeNull();
    expect(state.locked).toBe(false);
  });

  it('leaves a stale finish callback harmless after a restart', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const token = store.getState().activePour?.token ?? 0;
    store.getState().restartLevel();

    store.getState().finishPour(token);
    expect(store.getState().game?.tubes).toEqual(level.tubes);
    expect(store.getState().locked).toBe(false);
  });
});

describe('cancelPour', () => {
  it('releases interaction without touching the committed board', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    const board = store.getState().game?.tubes;

    store.getState().cancelPour();
    expect(store.getState().activePour).toBeNull();
    expect(store.getState().locked).toBe(false);
    expect(store.getState().game?.tubes).toEqual(board);
  });
});

describe('selectors', () => {
  it('offers undo only when there is history and nothing is animating', () => {
    expect(selectCanUndo(store.getState())).toBe(false);

    store.getState().tapTube(0);
    store.getState().tapTube(2);
    // Still animating, so undo stays unavailable.
    expect(selectCanUndo(store.getState())).toBe(false);

    store.getState().finishPour(store.getState().activePour?.token ?? 0);
    expect(selectCanUndo(store.getState())).toBe(true);
  });

  it('reports completion only after the winning pour stops animating', () => {
    const almost: LevelDefinition = {
      id: 5,
      name: 'Almost',
      difficulty: 'tutorial',
      capacity: 4,
      tubes: [['red', 'red', 'red'], ['red'], ['blue', 'blue', 'blue', 'blue']],
    };
    store.getState().loadLevel(almost);
    expect(selectIsLevelComplete(store.getState())).toBe(false);

    store.getState().tapTube(1);
    store.getState().tapTube(0);
    // The board is solved, but the pour is still on screen.
    expect(store.getState().game?.status).toBe('won');
    expect(selectIsLevelComplete(store.getState())).toBe(false);

    store.getState().finishPour(store.getState().activePour?.token ?? 0);
    expect(selectIsLevelComplete(store.getState())).toBe(true);
  });
});

describe('clearLevel', () => {
  it('leaves no orphaned state behind when the screen unmounts', () => {
    store.getState().tapTube(0);
    store.getState().tapTube(2);
    store.getState().clearLevel();

    const state = store.getState();
    expect(state.level).toBeNull();
    expect(state.game).toBeNull();
    expect(state.activePour).toBeNull();
    expect(state.locked).toBe(false);
    expect(state.tapTube(0)).toEqual({ kind: 'ignored' });
    expect(state.undoMove()).toBe(false);
  });
});
