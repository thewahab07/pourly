/**
 * Player progress and settings.
 *
 * The store owns the in-memory truth; writes are mirrored to AsyncStorage
 * through the storage service. Persistence failures never reject into the UI,
 * so a device with unavailable storage still plays normally for that session.
 */
import { create } from 'zustand';

import { TOTAL_LEVELS, isValidLevelId } from '../levels';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  clearProgress,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
  type ProgressData,
  type SettingsData,
} from '../services/storage';
import { applyAudioSettings, startMusic, stopMusic } from '../services/audio';
import { setHapticsEnabled } from '../services/haptics';

interface ProgressState {
  readonly unlockedLevel: number;
  readonly completedLevels: readonly number[];
  readonly settings: SettingsData;
  /** False until saved data has been read; the splash screen waits on this. */
  readonly hydrated: boolean;

  hydrate: () => Promise<void>;
  isLevelUnlocked: (levelId: number) => boolean;
  isLevelCompleted: (levelId: number) => boolean;
  completeLevel: (levelId: number) => void;
  setSoundEnabled: (value: boolean) => void;
  setMusicEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  resetProgress: () => Promise<void>;
}

function persistProgress(data: ProgressData): void {
  void saveProgress(data);
}

function persistSettings(settings: SettingsData): void {
  void saveSettings(settings);
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  unlockedLevel: DEFAULT_PROGRESS.unlockedLevel,
  completedLevels: DEFAULT_PROGRESS.completedLevels,
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const [progress, settings] = await Promise.all([loadProgress(), loadSettings()]);

    // Push settings into the services that need them before the UI renders.
    setHapticsEnabled(settings.hapticsEnabled);

    set({
      unlockedLevel: progress.unlockedLevel,
      completedLevels: progress.completedLevels,
      settings,
      hydrated: true,
    });
  },

  isLevelUnlocked: (levelId) => isValidLevelId(levelId) && levelId <= get().unlockedLevel,

  isLevelCompleted: (levelId) => get().completedLevels.includes(levelId),

  completeLevel: (levelId) => {
    if (!isValidLevelId(levelId)) return;

    const { completedLevels, unlockedLevel } = get();
    const nextCompleted = completedLevels.includes(levelId)
      ? completedLevels
      : [...completedLevels, levelId].sort((a, b) => a - b);
    const nextUnlocked = Math.min(TOTAL_LEVELS, Math.max(unlockedLevel, levelId + 1));

    if (nextCompleted === completedLevels && nextUnlocked === unlockedLevel) return;

    set({ completedLevels: nextCompleted, unlockedLevel: nextUnlocked });
    persistProgress({ unlockedLevel: nextUnlocked, completedLevels: nextCompleted });
  },

  setSoundEnabled: (value) => {
    const settings = { ...get().settings, soundEnabled: value };
    set({ settings });
    applyAudioSettings(settings);
    persistSettings(settings);
  },

  setMusicEnabled: (value) => {
    const settings = { ...get().settings, musicEnabled: value };
    set({ settings });
    applyAudioSettings(settings);
    if (value) startMusic();
    else stopMusic();
    persistSettings(settings);
  },

  setHapticsEnabled: (value) => {
    const settings = { ...get().settings, hapticsEnabled: value };
    set({ settings });
    setHapticsEnabled(value);
    persistSettings(settings);
  },

  resetProgress: async () => {
    set({
      unlockedLevel: DEFAULT_PROGRESS.unlockedLevel,
      completedLevels: DEFAULT_PROGRESS.completedLevels,
    });
    await clearProgress();
  },
}));
