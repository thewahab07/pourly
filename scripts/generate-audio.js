/**
 * Synthesises the game's audio assets as 16-bit PCM WAV files.
 *
 * The game must work fully offline with no downloaded media, so every sound is
 * generated here from oscillators, noise and envelopes and committed to the
 * repository. Re-run with: npm run generate:audio
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio');
const RATE = 22050;

/** Writes mono float samples (-1..1) as a 16-bit PCM WAV file. */
function writeWav(name, samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }

  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, buffer);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

const seconds = (n) => Math.round(n * RATE);
const silence = (n) => new Float32Array(n);

/** Deterministic noise so regenerating assets produces identical files. */
function makeNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
}

/** Exponential decay envelope. */
const decay = (t, rate) => Math.exp(-t * rate);

/** Short attack so nothing clicks at the start of a sample. */
const attack = (t, time) => Math.min(1, t / time);

/** Adds a sine partial with its own envelope into `out`. */
function addTone(out, { freq, start, duration, gain, decayRate, glide = 0 }) {
  const from = seconds(start);
  const count = seconds(duration);
  for (let i = 0; i < count; i += 1) {
    const index = from + i;
    if (index >= out.length) break;
    const t = i / RATE;
    const f = freq + glide * (t / duration);
    const env = attack(t, 0.004) * decay(t, decayRate);
    out[index] += Math.sin(2 * Math.PI * f * (t + (glide * t * t) / (2 * duration))) * gain * env;
  }
}

/** Adds band-limited noise (a one-pole resonant sweep) into `out`. */
function addNoise(out, { start, duration, gain, decayRate, cutoffStart, cutoffEnd, seed }) {
  const from = seconds(start);
  const count = seconds(duration);
  const noise = makeNoise(seed);
  let low = 0;
  let band = 0;
  for (let i = 0; i < count; i += 1) {
    const index = from + i;
    if (index >= out.length) break;
    const t = i / RATE;
    const progress = i / Math.max(1, count - 1);
    const cutoff = cutoffStart + (cutoffEnd - cutoffStart) * progress;
    const f = (2 * Math.sin(Math.PI * Math.min(0.45, cutoff / RATE)));
    const input = noise();
    const high = input - low - 0.9 * band;
    band += f * high;
    low += f * band;
    const env = attack(t, 0.006) * decay(t, decayRate);
    out[index] += band * gain * env;
  }
}

/** Simple feedback delay, used sparingly to give sounds a little air. */
function addDelay(samples, { delaySeconds, feedback, mix }) {
  const delaySamples = seconds(delaySeconds);
  const out = Float32Array.from(samples);
  for (let i = delaySamples; i < out.length; i += 1) {
    out[i] += out[i - delaySamples] * feedback * mix;
  }
  return out;
}

/** Normalises to a target peak, keeping headroom so nothing clips on device. */
function normalise(samples, peak = 0.85) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  if (max === 0) return samples;
  const scale = peak / max;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= scale;
  return samples;
}

/** Fades the first and last few milliseconds so playback never pops. */
function fadeEdges(samples, ms = 6) {
  const n = Math.min(seconds(ms / 1000), Math.floor(samples.length / 2));
  for (let i = 0; i < n; i += 1) {
    const gain = i / n;
    samples[i] *= gain;
    samples[samples.length - 1 - i] *= gain;
  }
  return samples;
}

// --- UI click: a soft wooden tick -------------------------------------------
function buildClick() {
  const out = silence(seconds(0.12));
  addTone(out, { freq: 880, start: 0, duration: 0.08, gain: 0.35, decayRate: 55 });
  addTone(out, { freq: 1320, start: 0, duration: 0.05, gain: 0.18, decayRate: 80 });
  addNoise(out, {
    start: 0, duration: 0.03, gain: 0.5, decayRate: 120,
    cutoffStart: 3200, cutoffEnd: 1800, seed: 11,
  });
  return fadeEdges(normalise(out, 0.7));
}

// --- Tube selection: a light rising blip -------------------------------------
function buildSelect() {
  const out = silence(seconds(0.18));
  addTone(out, { freq: 620, start: 0, duration: 0.16, gain: 0.4, decayRate: 22, glide: 340 });
  addTone(out, { freq: 1240, start: 0.01, duration: 0.12, gain: 0.14, decayRate: 30, glide: 500 });
  return fadeEdges(normalise(out, 0.65));
}

// --- Pour: liquid gurgle, filtered noise plus a few bubbles -------------------
function buildPour() {
  const out = silence(seconds(0.75));
  // The body of the stream: noise sweeping down as the flow settles.
  addNoise(out, {
    start: 0, duration: 0.7, gain: 0.42, decayRate: 2.4,
    cutoffStart: 1500, cutoffEnd: 520, seed: 77,
  });
  // Bubbles: short upward chirps at irregular intervals.
  const bubbles = [
    [0.03, 480], [0.11, 620], [0.19, 400], [0.28, 700],
    [0.36, 520], [0.45, 660], [0.55, 440], [0.63, 580],
  ];
  for (const [start, freq] of bubbles) {
    addTone(out, { freq, start, duration: 0.09, gain: 0.16, decayRate: 34, glide: 260 });
  }
  return fadeEdges(normalise(addDelay(out, { delaySeconds: 0.06, feedback: 0.25, mix: 0.3 }), 0.6));
}

// --- Invalid move: a soft, low, non-punishing thud ---------------------------
function buildInvalid() {
  const out = silence(seconds(0.24));
  addTone(out, { freq: 196, start: 0, duration: 0.22, gain: 0.5, decayRate: 16, glide: -46 });
  addTone(out, { freq: 147, start: 0.01, duration: 0.2, gain: 0.3, decayRate: 18 });
  addNoise(out, {
    start: 0, duration: 0.06, gain: 0.22, decayRate: 60,
    cutoffStart: 700, cutoffEnd: 300, seed: 23,
  });
  return fadeEdges(normalise(out, 0.62));
}

// --- Level complete: a bright ascending arpeggio ------------------------------
function buildComplete() {
  const out = silence(seconds(1.5));
  // C major pentatonic run, then a shimmering octave to finish.
  const notes = [
    [523.25, 0.0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.3],
  ];
  for (const [freq, start] of notes) {
    addTone(out, { freq, start, duration: 0.9, gain: 0.32, decayRate: 4.2 });
    addTone(out, { freq: freq * 2, start, duration: 0.5, gain: 0.09, decayRate: 7 });
    addTone(out, { freq: freq * 3, start, duration: 0.3, gain: 0.04, decayRate: 11 });
  }
  addTone(out, { freq: 1567.98, start: 0.42, duration: 1.0, gain: 0.2, decayRate: 3.4 });
  addTone(out, { freq: 2093.0, start: 0.46, duration: 0.9, gain: 0.12, decayRate: 4 });
  return fadeEdges(normalise(addDelay(out, { delaySeconds: 0.19, feedback: 0.34, mix: 0.4 }), 0.72));
}

// --- Background music: a calm looping bell pattern over a soft pad ------------
function buildMusic() {
  const LOOP = 24; // seconds
  const out = silence(seconds(LOOP));

  // A slow chord pad: two chords alternating every four bars.
  const chords = [
    [261.63, 329.63, 392.0], // C major
    [220.0, 261.63, 329.63], // A minor
    [174.61, 220.0, 261.63], // F major
    [196.0, 246.94, 293.66], // G major
  ];
  const barLength = LOOP / chords.length;
  chords.forEach((chord, index) => {
    const start = index * barLength;
    for (const freq of chord) {
      addTone(out, { freq: freq / 2, start, duration: barLength, gain: 0.055, decayRate: 0.35 });
      addTone(out, { freq, start, duration: barLength, gain: 0.035, decayRate: 0.45 });
    }
  });

  // A gentle bell melody on a pentatonic scale, one note every 0.75s.
  const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const pattern = [0, 2, 4, 3, 1, 3, 5, 4, 2, 0, 1, 3, 4, 2, 3, 1];
  const stepLength = LOOP / pattern.length;
  pattern.forEach((degree, index) => {
    const freq = scale[degree % scale.length];
    const start = index * stepLength;
    addTone(out, { freq, start, duration: Math.min(1.6, LOOP - start), gain: 0.13, decayRate: 3.0 });
    addTone(out, { freq: freq * 2, start, duration: Math.min(0.8, LOOP - start), gain: 0.035, decayRate: 5.5 });
  });

  const withAir = addDelay(out, { delaySeconds: 0.375, feedback: 0.3, mix: 0.35 });

  // Cross-fade the tail into the head so the loop point is inaudible.
  const blend = seconds(1.2);
  for (let i = 0; i < blend; i += 1) {
    const t = i / blend;
    const head = withAir[i];
    const tail = withAir[withAir.length - blend + i];
    withAir[i] = head * t + tail * (1 - t);
  }
  const looped = withAir.subarray(0, withAir.length - blend);

  return normalise(Float32Array.from(looped), 0.55);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeWav('click.wav', buildClick());
  writeWav('select.wav', buildSelect());
  writeWav('pour.wav', buildPour());
  writeWav('invalid.wav', buildInvalid());
  writeWav('complete.wav', buildComplete());
  writeWav('music.wav', buildMusic());
}

main();
