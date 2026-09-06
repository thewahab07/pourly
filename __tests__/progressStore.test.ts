/**
 * Level unlocking and settings persistence, exercised through the real store
 * and the real (mocked-native) AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useProgressStore } from '@/state/progressStore';
import { loadProgress, saveProgress } from '@/services/storage';

jest.mock('@/services/audio', () => ({
  applyAudioSettings: jest.fn(),
  startMusic: jest.fn(),
  stopMusic: jest.fn(),
}));

const store = useProgressStore;

beforeEach(async () => {
  await AsyncStorage.clear();
  store.setState({
    unlockedLevel: 1,
    completedLevels: [],
    settings: { soundEnabled: true, musicEnabled: true, hapticsEnabled: true },
    hydrated: false,
  });
});

/** Persistence is fire-and-forget; let the queued write settle. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setImmediate(() => resolve()));

describe('level locking', () => {
  it('starts with only level 1 unlocked', () => {
    const state = store.getState();
    expect(state.isLevelUnlocked(1)).toBe(true);
    expect(state.isLevelUnlocked(2)).toBe(false);
    expect(state.isLevelUnlocked(25)).toBe(false);
  });

  it('rejects level ids that do not exist', () => {
    const state = store.getState();
    expect(state.isLevelUnlocked(0)).toBe(false);
    expect(state.isLevelUnlocked(26)).toBe(false);
    expect(state.isLevelUnlocked(2.5)).toBe(false);
  });

  it('unlocks the next level when one is completed', () => {
    store.getState().completeLevel(1);
    expect(store.getState().unlockedLevel).toBe(2);
    expect(store.getState().isLevelUnlocked(2)).toBe(true);
    expect(store.getState().isLevelUnlocked(3)).toBe(false);
    expect(store.getState().isLevelCompleted(1)).toBe(true);
  });

  it('keeps completed levels replayable without moving progress backwards', () => {
    store.getState().completeLevel(1);
    store.getState().completeLevel(2);
    expect(store.getState().unlockedLevel).toBe(3);

    // Replaying an earlier level must not reduce the unlocked level.
    store.getState().completeLevel(1);
    expect(store.getState().unlockedLevel).toBe(3);
    expect(store.getState().completedLevels).toEqual([1, 2]);
  });

  it('does not unlock past the final level', () => {
    store.setState({ unlockedLevel: 25, completedLevels: [] });
    store.getState().completeLevel(25);
    expect(store.getState().unlockedLevel).toBe(25);
    expect(store.getState().isLevelCompleted(25)).toBe(true);
  });

  it('ignores completion of a level that does not exist', () => {
    store.getState().completeLevel(99);
    expect(store.getState().unlockedLevel).toBe(1);
    expect(store.getState().completedLevels).toEqual([]);
  });
});

describe('persistence', () => {
  it('writes progress that hydrate reads back', async () => {
    store.getState().completeLevel(1);
    store.getState().completeLevel(2);
    await flush();

    expect(await loadProgress()).toEqual({ unlockedLevel: 3, completedLevels: [1, 2] });

    store.setState({ unlockedLevel: 1, completedLevels: [] });
    await store.getState().hydrate();

    expect(store.getState().unlockedLevel).toBe(3);
    expect(store.getState().completedLevels).toEqual([1, 2]);
    expect(store.getState().hydrated).toBe(true);
  });

  it('persists each settings toggle independently', async () => {
    store.getState().setSoundEnabled(false);
    store.getState().setHapticsEnabled(false);
    await flush();

    store.setState({ settings: { soundEnabled: true, musicEnabled: true, hapticsEnabled: true } });
    await store.getState().hydrate();

    expect(store.getState().settings).toEqual({
      soundEnabled: false,
      musicEnabled: true,
      hapticsEnabled: false,
    });
  });

  it('recovers to defaults when the stored payload is corrupted', async () => {
    await AsyncStorage.setItem('lcs:progress:v1', '{not valid json');
    await store.getState().hydrate();

    expect(store.getState().unlockedLevel).toBe(1);
    expect(store.getState().completedLevels).toEqual([]);
  });

  it('repairs a save whose unlocked level trails its completed levels', async () => {
    await saveProgress({ unlockedLevel: 1, completedLevels: [1, 2, 3] });
    await store.getState().hydrate();

    expect(store.getState().unlockedLevel).toBe(4);
  });
});

describe('reset progress', () => {
  it('clears progress on disk and in memory but keeps settings', async () => {
    store.getState().completeLevel(1);
    store.getState().setSoundEnabled(false);
    await flush();

    await store.getState().resetProgress();

    expect(store.getState().unlockedLevel).toBe(1);
    expect(store.getState().completedLevels).toEqual([]);
    expect(await loadProgress()).toEqual({ unlockedLevel: 1, completedLevels: [] });
    expect(store.getState().settings.soundEnabled).toBe(false);
  });
});
