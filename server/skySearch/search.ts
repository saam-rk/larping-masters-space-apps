/**
 * Inverse search: the instant closest to a reference time at which the given
 * azimuth/elevation ranges of the Sun and/or the Earth all hold.
 *
 * Method (all values come from Horizons; nothing is extrapolated):
 *   1. Sample the conditioned bodies every hour, first within ±32 days of the
 *      reference, then out to the full window if nothing matched closer.
 *   2. For each hour, interpolate linearly between its two samples, with the
 *      ranges widened by a safety margin, to keep only hours in which every
 *      condition could hold. The margin (0.002°) is larger than the error of
 *      linear interpolation over one hour for the slow motion of the Sun and
 *      the Earth in the lunar sky (on the order of 1e-5° to 1e-3°).
 *   3. Resample each candidate hour every minute and repeat with a smaller
 *      margin, then resample each candidate minute every second.
 *   4. A second matches only if the Horizons values printed for that second,
 *      rounded to 4 decimals, satisfy every range. The closest such second is
 *      the answer; candidates are visited by increasing distance and the search
 *      stops once no remaining candidate can be closer.
 *
 * Limits: a match window narrower than one second can fall between whole
 * seconds and be missed. Azimuth changes faster than 20° per hour (a body near
 * the zenith) are treated as "could match anywhere in the hour", which only
 * costs requests. The request and time budgets bound the work; when they run
 * out the result says so instead of claiming there is no match.
 */

import type { ApiError } from '../../shared/ephemeris.js';
import {
  activeTargets,
  matchesConditions,
  SKY_SEARCH_DECIMALS,
  SKY_SEARCH_WINDOW_DAYS,
  SKY_TARGET_INFO,
  type AngleRange,
  type SkyAngle,
  type SkyConditions,
  type SkySearchDirection,
  type SkySearchMatch,
  type SkySearchOutcome,
  type SkyTarget,
} from '../../shared/skySearch.js';
import type { ObserverStep } from '../horizons/query.js';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const COARSE_STEP_MINUTES = 60;
/** First, closer stage of the search, on each allowed side. */
export const NEAR_WINDOW_DAYS = 32;
/** Range widening while locating candidates (degrees); see the module comment. */
export const COARSE_MARGIN_DEG = 0.002;
export const FINE_MARGIN_DEG = 0.0002;
/** Above this azimuth change between two samples, the whole interval is kept as a candidate. */
export const AZIMUTH_JUMP_DEG = 20;
/** Values are compared after rounding to 4 decimals: half a unit of the last decimal. */
const HALF_UNIT_DEG = 0.5 / 10 ** SKY_SEARCH_DECIMALS;

/** Az/El of the conditioned bodies on a common time axis (ms since epoch, increasing). */
export interface SkySeries {
  readonly times: readonly number[];
  readonly values: { readonly [K in SkyTarget]?: readonly (number | null)[] };
}

export type SamplerResult = { readonly ok: true; readonly series: SkySeries } | { readonly ok: false; readonly error: ApiError };

/** Samples from `startMs` to `stopMs`, both included. */
export type Sampler = (startMs: number, stopMs: number, step: ObserverStep) => Promise<SamplerResult>;

export interface SearchInput {
  readonly referenceMs: number;
  readonly direction: SkySearchDirection;
  readonly conditions: SkyConditions;
  /** Supported instants: [startMs, endMs] (inclusive). */
  readonly supportedRange: { readonly startMs: number; readonly endMs: number };
}

export interface SearchLimits {
  /** Maximum sampler calls. */
  readonly maxSamples: number;
  /** Absolute time (ms) after which no new sample is started. */
  readonly deadlineMs: number;
  readonly now?: () => number;
}

export type SearchResult =
  | {
      readonly ok: true;
      readonly outcome: SkySearchOutcome;
      /** Sampled span, or `null` when nothing could be sampled. */
      readonly searched: { readonly startMs: number; readonly endMs: number } | null;
    }
  | { readonly ok: false; readonly error: ApiError };

type Interval = readonly [number, number];

interface Candidate {
  readonly startMs: number;
  readonly stopMs: number;
  /** Lower bound of the distance from the reference to a match inside. */
  readonly distanceMs: number;
}

class BudgetExhausted extends Error {}

class UpstreamFailed extends Error {
  constructor(readonly apiError: ApiError) {
    super(apiError.detail);
  }
}

export async function searchSky(input: SearchInput, sampler: Sampler, limits: SearchLimits): Promise<SearchResult> {
  const now = limits.now ?? Date.now;
  const { referenceMs, conditions } = input;
  let samples = 0;
  let searched: { startMs: number; endMs: number } | null = null;
  let best: { readonly timeMs: number; readonly values: SkySearchMatch['values'] } | null = null;
  let budgetHit = false;

  const sample = async (startMs: number, stopMs: number, step: ObserverStep): Promise<SkySeries> => {
    if (samples >= limits.maxSamples || now() >= limits.deadlineMs) throw new BudgetExhausted();
    samples += 1;
    const result = await sampler(startMs, stopMs, step);
    if (!result.ok) throw new UpstreamFailed(result.error);
    return result.series;
  };

  const bestDistance = () => (best === null ? Number.POSITIVE_INFINITY : Math.abs(best.timeMs - referenceMs));
  /** Visit a candidate only if it may hold a match at least as close as the best one. */
  const worthVisiting = (candidate: Candidate) => candidate.distanceMs <= bestDistance();

  const checkSeconds = (series: SkySeries) => {
    series.times.forEach((timeMs, index) => {
      const values = valuesAt(series, index);
      if (!matchesConditions(conditions, values)) return;
      const distance = Math.abs(timeMs - referenceMs);
      // Ties (same distance before and after the reference) go to the later instant.
      if (best === null || distance < bestDistance() || (distance === bestDistance() && timeMs > best.timeMs)) {
        best = { timeMs, values };
      }
    });
  };

  try {
    for (const stage of searchStages(input)) {
      const coarse: Candidate[] = [];
      for (const [startMs, stopMs] of stage) {
        const series = await sample(startMs, stopMs, { kind: 'hours', hours: COARSE_STEP_MINUTES / 60 });
        const previous = searched as { startMs: number; endMs: number } | null;
        searched = {
          startMs: Math.min(previous?.startMs ?? startMs, startMs),
          endMs: Math.max(previous?.endMs ?? stopMs, stopMs),
        };
        coarse.push(...findCandidates(series, conditions, COARSE_MARGIN_DEG, referenceMs));
      }
      sortCandidates(coarse);

      for (const hour of coarse) {
        if (!worthVisiting(hour)) break;
        const minutes = await sample(hour.startMs, hour.stopMs, { kind: 'intervals', count: intervalsOf(hour, MINUTE_MS) });
        const minuteCandidates = sortCandidates(findCandidates(minutes, conditions, FINE_MARGIN_DEG, referenceMs));
        for (const minute of minuteCandidates) {
          if (!worthVisiting(minute)) break;
          checkSeconds(await sample(minute.startMs, minute.stopMs, { kind: 'intervals', count: intervalsOf(minute, SECOND_MS) }));
        }
      }
      // Later stages are farther away than anything found in this one.
      if (best !== null) break;
    }
  } catch (cause) {
    if (cause instanceof UpstreamFailed) return { ok: false, error: cause.apiError };
    if (!(cause instanceof BudgetExhausted)) throw cause;
    budgetHit = true;
  }

  const found = best as { readonly timeMs: number; readonly values: SkySearchMatch['values'] } | null;
  const outcome: SkySearchOutcome = found
    ? {
        status: 'found',
        complete: !budgetHit,
        match: {
          utc: `${new Date(found.timeMs).toISOString().slice(0, 19)}Z`,
          offsetSeconds: Math.round((found.timeMs - referenceMs) / SECOND_MS),
          values: found.values,
        },
      }
    : { status: 'not-found', reason: budgetHit ? 'budget' : 'no-match' };
  return { ok: true, outcome, searched };
}

function intervalsOf(candidate: Candidate, stepMs: number): number {
  return Math.max(1, Math.round((candidate.stopMs - candidate.startMs) / stepMs));
}

function sortCandidates(candidates: Candidate[]): Candidate[] {
  return candidates.sort((a, b) => a.distanceMs - b.distanceMs || a.startMs - b.startMs);
}

/**
 * Time spans to sample, in order: the near window, then the rest of the full
 * window. Each span starts and ends a whole number of hours from the
 * reference, so every grid (hours, minutes, seconds) contains the reference.
 */
export function searchStages(input: SearchInput): Interval[][] {
  const { referenceMs: t0, direction, supportedRange } = input;
  const near = NEAR_WINDOW_DAYS * DAY_MS;
  const far = SKY_SEARCH_WINDOW_DAYS * DAY_MS;
  const before = direction !== 'after';
  const after = direction !== 'before';

  const stages: Interval[][] = [
    [[before ? t0 - near : t0, after ? t0 + near : t0]],
    [...(before ? [[t0 - far, t0 - near] as const] : []), ...(after ? [[t0 + near, t0 + far] as const] : [])],
  ];

  const alignUp = (ms: number) => t0 + Math.ceil((ms - t0) / HOUR_MS) * HOUR_MS;
  const alignDown = (ms: number) => t0 + Math.floor((ms - t0) / HOUR_MS) * HOUR_MS;
  const low = alignUp(supportedRange.startMs);
  const high = alignDown(supportedRange.endMs);
  return stages
    .map((stage) =>
      stage
        .map(([start, stop]): Interval => [Math.max(start, low), Math.min(stop, high)])
        .filter(([start, stop]) => stop > start),
    )
    .filter((stage) => stage.length > 0);
}

function valuesAt(series: SkySeries, index: number): { [K in SkyTarget]?: number | null } {
  const values: { [K in SkyTarget]?: number | null } = {};
  for (const [target, column] of Object.entries(series.values) as [SkyTarget, readonly (number | null)[]][]) {
    values[target] = column[index] ?? null;
  }
  return values;
}

/** Intervals between consecutive samples where, interpolating linearly, every condition could hold. */
export function findCandidates(series: SkySeries, conditions: SkyConditions, marginDeg: number, referenceMs: number): Candidate[] {
  const targets = activeTargets(conditions);
  const candidates: Candidate[] = [];
  for (let index = 0; index + 1 < series.times.length; index += 1) {
    const startMs = series.times[index] as number;
    const stopMs = series.times[index + 1] as number;
    let feasible: Interval[] = [[0, 1]];
    for (const target of targets) {
      const column = series.values[target];
      const range = conditions[target] as AngleRange;
      const allowed = column
        ? segmentFeasibility(SKY_TARGET_INFO[target].angle, range, column[index] ?? null, column[index + 1] ?? null, marginDeg)
        : [];
      feasible = intersect(feasible, allowed);
      if (feasible.length === 0) break;
    }
    if (feasible.length === 0) continue;
    const distanceMs = Math.min(
      ...feasible.map(([s0, s1]) => distanceTo(referenceMs, startMs + s0 * (stopMs - startMs), startMs + s1 * (stopMs - startMs))),
    );
    candidates.push({ startMs, stopMs, distanceMs });
  }
  return candidates;
}

function distanceTo(referenceMs: number, fromMs: number, toMs: number): number {
  if (referenceMs >= fromMs && referenceMs <= toMs) return 0;
  return Math.min(Math.abs(fromMs - referenceMs), Math.abs(toMs - referenceMs));
}

/**
 * Fractions s ∈ [0, 1] of the interval where the linear interpolation from
 * `v0` to `v1` lies within the range widened by `marginDeg` (plus the
 * 4-decimal rounding tolerance). Missing values cannot match.
 */
export function segmentFeasibility(
  angle: SkyAngle,
  range: AngleRange,
  v0: number | null,
  v1: number | null,
  marginDeg: number,
): Interval[] {
  if (v0 === null || v1 === null) return [];
  const tolerance = HALF_UNIT_DEG + marginDeg;
  if (angle === 'elevation') return solveLinear(v0, v1, range.min - tolerance, range.max + tolerance);

  // Shortest angular change; the path is unwrapped so it may leave [0, 360).
  const delta = ((((v1 - v0 + 180) % 360) + 360) % 360) - 180;
  if (Math.abs(delta) > AZIMUTH_JUMP_DEG) return [[0, 1]];
  const arcs: Interval[] = range.min <= range.max ? [[range.min, range.max]] : [[range.min, 360], [0, range.max]];
  const pieces: Interval[] = [];
  for (const [low, high] of arcs) {
    for (const turn of [-360, 0, 360]) {
      pieces.push(...solveLinear(v0, v0 + delta, low - tolerance + turn, high + tolerance + turn));
    }
  }
  return union(pieces);
}

function solveLinear(a: number, b: number, low: number, high: number): Interval[] {
  if (a === b) return a >= low && a <= high ? [[0, 1]] : [];
  const s1 = (low - a) / (b - a);
  const s2 = (high - a) / (b - a);
  const start = Math.max(0, Math.min(s1, s2));
  const stop = Math.min(1, Math.max(s1, s2));
  return start <= stop ? [[start, stop]] : [];
}

function union(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [start, stop] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], stop);
    else merged.push([start, stop]);
  }
  return merged;
}

function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      const start = Math.max(a0, b0);
      const stop = Math.min(a1, b1);
      if (start <= stop) result.push([start, stop]);
    }
  }
  return union(result);
}
