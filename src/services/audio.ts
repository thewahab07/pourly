/**
 * Centralised audio service.
 *
 * All sound in the game goes through this module: components call
 * `playSound('select')`, never expo-audio directly. Every asset is bundled with
 * the app, so audio works with no network connection.
 *
 * The service degrades quietly — if the audio session or a player fails to
 * initialise, calls become no-ops rather than breaking gameplay.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { SettingsData } from './storage';

export type SoundName = 'click' | 'select' | 'pour' | 'invalid' | 'complete';

/**
 * Static requires so Metro bundles every asset. `require` is intentional here:
 * it is how the Expo asset pipeline resolves bundled media.
 */
const SOUND_SOURCES: Readonly<Record<SoundName, number>> = {
  click: require('../../assets/audio/click.wav') as number,
  select: require('../../assets/audio/select.wav') as number,
  pour: require('../../assets/audio/pour.wav') as number,
  invalid: require('../../assets/audio/invalid.wav') as number,
  complete: require('../../assets/audio/complete.wav') as number,
};

const MUSIC_SOURCE = require('../../assets/audio/music.wav') as number;

/** Per-sound mix levels, so effects sit under the music rather than over it. */
const SOUND_VOLUME: Readonly<Record<SoundName, number>> = {
  click: 0.45,
  select: 0.4,
  pour: 0.6,
  invalid: 0.5,
  complete: 0.75,
};

const MUSIC_VOLUME = 0.28;

interface AudioState {
  effects: Partial<Record<SoundName, AudioPlayer>>;
  music: AudioPlayer | null;
  initialised: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  /** Set when the player asked for music but playback has not started yet. */
  musicWanted: boolean;
  /**
   * Incremented by every release. An initialisation that started before a
   * release checks this before committing, so a teardown that lands mid-setup
   * cannot leave the service marked ready with removed players.
   */
  generation: number;
}

const state: AudioState = {
  effects: {},
  music: null,
  initialised: false,
  soundEnabled: true,
  musicEnabled: true,
  musicWanted: false,
  generation: 0,
};

/**
 * Prepares the audio session and preloads every player.
 *
 * Safe to call more than once; subsequent calls are no-ops.
 */
export async function initializeAudio(settings: SettingsData): Promise<void> {
  state.soundEnabled = settings.soundEnabled;
  state.musicEnabled = settings.musicEnabled;

  if (state.initialised) {
    applyAudioSettings(settings);
    return;
  }

  const generation = state.generation;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      // Sound effects and light music should never steal focus from, say, a podcast.
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // An unavailable audio session is not fatal — players may still work.
  }

  // Released while the audio session was being configured: abandon this setup.
  if (generation !== state.generation) return;

  for (const name of Object.keys(SOUND_SOURCES) as SoundName[]) {
    try {
      const player = createAudioPlayer(SOUND_SOURCES[name]);
      player.volume = SOUND_VOLUME[name];
      state.effects[name] = player;
    } catch {
      // Leave this effect unavailable; the rest of the game continues.
    }
  }

  try {
    const music = createAudioPlayer(MUSIC_SOURCE);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    state.music = music;
  } catch {
    state.music = null;
  }

  state.initialised = true;

  if (state.musicWanted) {
    startMusic();
  }
}

/** Plays a one-shot effect, restarting it if it is already sounding. */
export function playSound(name: SoundName): void {
  if (!state.soundEnabled) return;
  const player = state.effects[name];
  if (player === undefined) return;

  try {
    // Rewind first so rapid repeats (tapping tubes) retrigger cleanly.
    void player.seekTo(0);
    player.play();
  } catch {
    // A failed effect must never interrupt play.
  }
}

/** Starts looping background music, if music is enabled. */
export function startMusic(): void {
  state.musicWanted = true;
  if (!state.musicEnabled) return;

  const music = state.music;
  if (music === null) return;

  try {
    if (!music.playing) music.play();
  } catch {
    // Ignore: music is decorative.
  }
}

/** Pauses background music without forgetting that the player wants it. */
export function pauseMusic(): void {
  const music = state.music;
  if (music === null) return;
  try {
    if (music.playing) music.pause();
  } catch {
    // Ignore.
  }
}

/** Stops music and clears the intent to play it. */
export function stopMusic(): void {
  state.musicWanted = false;
  pauseMusic();
}

/** Applies updated settings immediately, starting or stopping music as needed. */
export function applyAudioSettings(settings: SettingsData): void {
  state.soundEnabled = settings.soundEnabled;
  state.musicEnabled = settings.musicEnabled;

  if (settings.musicEnabled) {
    if (state.musicWanted) startMusic();
  } else {
    pauseMusic();
  }
}

/** Releases every native player. Called when the app tears down. */
export function releaseAudio(): void {
  state.generation += 1;

  for (const player of Object.values(state.effects)) {
    try {
      player?.remove();
    } catch {
      // Ignore: the platform reclaims these anyway.
    }
  }
  state.effects = {};

  try {
    state.music?.remove();
  } catch {
    // Ignore.
  }
  state.music = null;
  state.initialised = false;
  state.musicWanted = false;
}
