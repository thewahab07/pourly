/**
 * Storage must survive anything it finds on disk: an older build's payload, a
 * partial write, or outright junk. These tests exercise the pure parsers.
 */
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  parseProgress,
  parseSettings,
} from '@/services/storage';

describe('parseProgress', () => {
  it('falls back to defaults for missing or non-object payloads', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress(undefined)).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('corrupted')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress(42)).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress([1, 2, 3])).toEqual(DEFAULT_PROGRESS);
  });

  it('keeps a valid payload intact', () => {
    expect(parseProgress({ unlockedLevel: 5, completedLevels: [1, 2, 3, 4] })).toEqual({
      unlockedLevel: 5,
      completedLevels: [1, 2, 3, 4],
    });
  });

  it('clamps an out-of-range unlocked level', () => {
    expect(parseProgress({ unlockedLevel: 999, completedLevels: [] }).unlockedLevel).toBe(25);
    expect(parseProgress({ unlockedLevel: -4, completedLevels: [] }).unlockedLevel).toBe(1);
    expect(parseProgress({ unlockedLevel: Number.NaN, completedLevels: [] }).unlockedLevel).toBe(1);
  });

  it('drops completed entries that are not real level ids', () => {
    const result = parseProgress({
      unlockedLevel: 3,
      completedLevels: [1, 2, 'three', null, 99, -1, 2.5],
    });
    expect(result.completedLevels).toEqual([1, 2]);
  });

  it('de-duplicates and sorts completed levels', () => {
    expect(parseProgress({ unlockedLevel: 4, completedLevels: [3, 1, 3, 2] }).completedLevels).toEqual([
      1, 2, 3,
    ]);
  });

  it('repairs a save that would otherwise lock the player out', () => {
    // Completing level 7 must always leave level 8 reachable.
    const result = parseProgress({ unlockedLevel: 1, completedLevels: [1, 2, 7] });
    expect(result.unlockedLevel).toBe(8);
  });

  it('does not unlock past the final level', () => {
    const result = parseProgress({ unlockedLevel: 25, completedLevels: [25] });
    expect(result.unlockedLevel).toBe(25);
  });

  it('treats a missing completedLevels field as no progress', () => {
    expect(parseProgress({ unlockedLevel: 6 })).toEqual({ unlockedLevel: 6, completedLevels: [] });
  });
});

describe('parseSettings', () => {
  it('falls back to defaults for junk payloads', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid booleans and repairs the rest field by field', () => {
    expect(parseSettings({ soundEnabled: false, musicEnabled: 'yes', hapticsEnabled: false })).toEqual({
      soundEnabled: false,
      musicEnabled: true,
      hapticsEnabled: false,
    });
  });

  it('defaults every toggle to on for an empty object', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
  });
});
