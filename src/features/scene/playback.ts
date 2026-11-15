/**
 * Horizon playback interval: a start instant, a number of samples and a step
 * between samples (whole minutes). The end is derived:
 * start + (samples - 1) × step; both ends are samples.
 *
 * Step presets spread half a cycle over the chosen number of samples: half
 * of a body's course, e.g. from its rise to about its set when the interval
 * starts at the rise (see `nextRise.ts`):
 *
 * - `sun`: half a synodic month, 29.530589 d / 2 (mean). Seen from the Moon
 *   the Sun goes once around the sky per synodic month (one lunar day and
 *   night), so half of it is about one lunar day.
 * - `earth`: half a draconic month, 27.212220 d / 2 (mean). The draconic
 *   month is the period of the libration in latitude, which drives how high
 *   the Earth stands over a polar horizon (it hardly moves otherwise).
 *
 * Mean month lengths from NASA GSFC, F. Espenak, "Eclipses and the Moon's
 * Orbit" (https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html). They are
 * averages; any single month differs by hours, and a body is not up for
 * exactly half of it (latitude, libration and the disc size change that), so
 * the half course is approximate. Steps are rounded to the minute. The
 * default of 24 samples mirrors the 24 hours of an Earth day.
 */

import { SERIES_MAX_COUNT, SERIES_MAX_STEP_MINUTES } from '../../../shared/ephemerisSeries';
import { SUPPORTED_UTC_RANGE, toUtcIsoSeconds } from '../../../shared/time';

export const DEFAULT_SAMPLES = 24;
export const MIN_SAMPLES = 2;
export const MAX_SAMPLES = 500;

export const STEP_PRESETS = ['sun', 'earth', 'custom'] as const;
export type StepPreset = (typeof STEP_PRESETS)[number];

/** Mean full cycle of each preset, days; a preset covers half of it (see the module comment). */
export const PRESET_CYCLE_DAYS: Readonly<Record<Exclude<StepPreset, 'custom'>, number>> = {
  sun: 29.530589,
  earth: 27.21222,
};

const MINUTE_MS = 60_000;

/** Span covered by a preset, days: half its cycle. */
export function presetSpanDays(preset: Exclude<StepPreset, 'custom'>): number {
  return PRESET_CYCLE_DAYS[preset] / 2;
}

/** Step of a preset for `samples` samples, whole minutes (at least 1). */
export function presetStepMinutes(preset: Exclude<StepPreset, 'custom'>, samples: number): number {
  return Math.max(1, Math.round((presetSpanDays(preset) * 24 * 60) / Math.max(1, samples - 1)));
}

export interface PlaybackPlan {
  readonly startUtc: string;
  readonly endUtc: string;
  readonly stepMinutes: number;
  readonly samples: number;
}

/**
 * Checks an interval: whole number of samples in range, a step of at least
 * one minute and the last sample inside the supported range. Null when invalid.
 */
export function playbackPlan(startUtc: string, samples: number, stepMinutes: number): PlaybackPlan | null {
  const start = Date.parse(startUtc);
  if (!Number.isFinite(start) || start < Date.parse(SUPPORTED_UTC_RANGE.startInclusive)) return null;
  if (!Number.isInteger(samples) || samples < MIN_SAMPLES || samples > MAX_SAMPLES) return null;
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1 || stepMinutes > SERIES_MAX_STEP_MINUTES) return null;
  const end = start + (samples - 1) * stepMinutes * MINUTE_MS;
  if (end >= Date.parse(SUPPORTED_UTC_RANGE.endExclusive)) return null;
  return { startUtc: toUtcIsoSeconds(new Date(start)), endUtc: toUtcIsoSeconds(new Date(end)), stepMinutes, samples };
}

/** Request chunks of at most `SERIES_MAX_COUNT` samples (at least 2 each, since a plan has 2 or more), in order, covering every sample once. */
export function playbackChunks(plan: PlaybackPlan): { readonly startUtc: string; readonly count: number }[] {
  const parts = Math.ceil(plan.samples / SERIES_MAX_COUNT);
  const base = Math.floor(plan.samples / parts);
  const extra = plan.samples % parts;
  const start = Date.parse(plan.startUtc);
  const chunks: { startUtc: string; count: number }[] = [];
  let offset = 0;
  for (let index = 0; index < parts; index += 1) {
    const count = base + (index < extra ? 1 : 0);
    chunks.push({ startUtc: toUtcIsoSeconds(new Date(start + offset * plan.stepMinutes * MINUTE_MS)), count });
    offset += count;
  }
  return chunks;
}
