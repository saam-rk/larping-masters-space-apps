/**
 * Synthesises the video's subtle sound effects (no music, no third-party
 * samples) as 16-bit mono WAV files in public/sfx/. Deterministic: the noise
 * uses a fixed seed, so re-running produces identical files.
 *
 *   click    soft UI tick for each pointer press
 *   blip     two short tones for "done" moments (rise found, interval ready)
 *   whoosh   short filtered-noise swell for view and full-screen changes
 *   warp     longer rising swell for the "Update view" hyperspace jump
 *   ticks    faint data chatter while the data panel is shown
 *   swell    low airy swell under the outro logo
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 48000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');
mkdirSync(OUT, { recursive: true });

let seed = 20261115;
function noise() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  // Every effect is normalised to the same peak; the video sets each cue's level.
  const norm = peak > 0 ? 0.9 / peak : 1;
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * norm)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)} s`);
}

const buffer = (seconds) => new Float64Array(Math.round(seconds * RATE));

/** One-pole low-pass with a cutoff that may change per sample. */
function lowpass(input, cutoffAt) {
  const out = new Float64Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i++) {
    const fc = cutoffAt(i / RATE);
    const a = 1 - Math.exp((-2 * Math.PI * fc) / RATE);
    y += a * (input[i] - y);
    out[i] = y;
  }
  return out;
}

function click() {
  const out = buffer(0.07);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const body = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t / 0.009);
    const thump = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t / 0.014) * 0.6;
    const grit = noise() * Math.exp(-t / 0.003) * 0.35;
    out[i] = (body * 0.55 + thump + grit) * 0.5;
  }
  return out;
}

function blip() {
  const out = buffer(0.26);
  const tone = (t, start, freq) => {
    const local = t - start;
    if (local < 0) return 0;
    const attack = Math.min(1, local / 0.004);
    return Math.sin(2 * Math.PI * freq * local) * attack * Math.exp(-local / 0.05);
  };
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = (tone(t, 0, 1320) + tone(t, 0.075, 1980) * 0.8) * 0.35;
  }
  return out;
}

function sweep(seconds, { from, to, peakAt, level }) {
  const raw = buffer(seconds).map(() => noise());
  const filtered = lowpass(raw, (t) => from * Math.pow(to / from, Math.min(1, t / (seconds * peakAt))));
  return filtered.map((s, i) => {
    const p = i / filtered.length;
    const envelope = p < peakAt ? Math.pow(p / peakAt, 2) : Math.pow(1 - (p - peakAt) / (1 - peakAt), 1.6);
    return s * envelope * level;
  });
}

function ticks() {
  const out = buffer(0.9);
  let next = 0;
  while (next < out.length - 2000) {
    const freq = 2400 + noise() * 900;
    const length = Math.round(0.012 * RATE);
    for (let i = 0; i < length; i++) {
      const t = i / RATE;
      out[next + i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.003) * 0.25;
    }
    next += Math.round((0.045 + Math.abs(noise()) * 0.05) * RATE);
  }
  return out.map((s, i) => s * Math.min(1, (out.length - i) / (0.2 * RATE)));
}

writeWav('click', click());
writeWav('blip', blip());
writeWav('whoosh', sweep(0.6, { from: 300, to: 3200, peakAt: 0.55, level: 2.4 }));
writeWav('warp', sweep(1.3, { from: 150, to: 5200, peakAt: 0.7, level: 2.6 }));
writeWav('ticks', ticks());
writeWav('swell', sweep(2.0, { from: 120, to: 1100, peakAt: 0.45, level: 3.2 }));
