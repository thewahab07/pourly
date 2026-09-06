/**
 * The only module in the app that talks to AsyncStorage.
 *
 * Everything is defensive: a missing key, malformed JSON or a payload written
 * by a different (or corrupted) build all fall back to sane defaults rather
 * than throwing into the render tree.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TOTAL_LEVELS } from '../levels';

const PROGRESS_KEY = 'lcs:progress:v1';
const SETTINGS_KEY = 'lcs:settings:v1';

export interface ProgressData {
  /** Highest level the player may open. Always between 1 and TOTAL_LEVELS. */
  readonly unlockedLevel: number;
  /** Ids of levels the player has finished, ascending and de-duplicated. */
  readonly completedLevels: readonly number[];
}

export interface SettingsData {
  readonly soundEnabled: boolean;
  readonly musicEnabled: boolean;
  readonly hapticsEnabled: boolean;
}

export const DEFAULT_PROGRESS: ProgressData = {
  unlockedLevel: 1,
  completedLevels: [],
};

export const DEFAULT_SETTINGS: SettingsData = {
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(value)));
}

/** Coerces an unknown payload into valid progress, discarding anything odd. */
export function parseProgress(raw: unknown): ProgressData {
  if (!isRecord(raw)) return DEFAULT_PROGRESS;

  const unlockedLevel =
    typeof raw.unlockedLevel === 'number' ? clampLevel(raw.unlockedLevel) : 1;

  const completed = Array.isArray(raw.completedLevels)
    ? raw.completedLevels.filter(
        (id): id is number => typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= TOTAL_LEVELS,
      )
    : [];

  const completedLevels = Array.from(new Set(completed)).sort((a, b) => a - b);

  // Completing level N always implies level N+1 is reachable; repair progress
  // that says otherwise so a partially-written save cannot lock the player out.
  const impliedUnlock = completedLevels.reduce(
    (highest, id) => Math.max(highest, clampLevel(id + 1)),
    unlockedLevel,
  );

  return { unlockedLevel: impliedUnlock, completedLevels };
}

/** Coerces an unknown payload into valid settings, field by field. */
export function parseSettings(raw: unknown): SettingsData {
  if (!isRecord(raw)) return DEFAULT_SETTINGS;
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;

  return {
    soundEnabled: bool(raw.soundEnabled, DEFAULT_SETTINGS.soundEnabled),
    musicEnabled: bool(raw.musicEnabled, DEFAULT_SETTINGS.musicEnabled),
    hapticsEnabled: bool(raw.hapticsEnabled, DEFAULT_SETTINGS.hapticsEnabled),
  };
}

async function readJson(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    // Unreadable or corrupted entry: drop it so the next write starts clean.
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Storage is unavailable entirely; defaults still let the game run.
    }
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A failed write must never break gameplay; the in-memory state stays valid.
  }
}

export async function loadProgress(): Promise<ProgressData> {
  return parseProgress(await readJson(PROGRESS_KEY));
}

export async function saveProgress(progress: ProgressData): Promise<void> {
  await writeJson(PROGRESS_KEY, progress);
}

export async function loadSettings(): Promise<SettingsData> {
  return parseSettings(await readJson(SETTINGS_KEY));
}

export async function saveSettings(settings: SettingsData): Promise<void> {
  await writeJson(SETTINGS_KEY, settings);
}

/** Removes all saved progress. Settings are intentionally left untouched. */
export async function clearProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROGRESS_KEY);
  } catch {
    // Nothing to do: the caller resets in-memory progress regardless.
  }
}
