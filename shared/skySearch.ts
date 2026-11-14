/**
 * HTTP contract for `GET /api/sky-search`, the inverse search: given ranges
 * for the azimuth and/or elevation of the Sun and the Earth seen from one
 * lunar point, find the instant closest to a reference time at which every
 * given range holds.
 *
 * Request:  GET /api/sky-search?site=<SiteId>&from=<UTC>&direction=<dir>&sunAz=<min,max>&...
 *      or:  GET /api/sky-search?lat=<deg>&lon=<deg east>&from=<UTC>&...
 * Success:  200 with `SkySearchResponse` (the outcome may still be "not found").
 * Failure:  4xx/5xx with `ApiErrorResponse` (see `shared/ephemeris.ts`).
 *
 * Conditions use the same quantities as `/api/ephemeris` (Horizons observer
 * quantity 4, airless apparent azimuth/elevation, degrees). A value matches a
 * range when the value rounded to `SKY_SEARCH_DECIMALS` decimals lies in it.
 */

import type { BodyId, EphemerisSite } from './ephemeris.js';

export const SKY_SEARCH_ENDPOINT = '/api/sky-search';

export const SKY_TARGETS = ['sunAzimuth', 'sunElevation', 'earthAzimuth', 'earthElevation'] as const;
export type SkyTarget = (typeof SKY_TARGETS)[number];

export type SkyAngle = 'azimuth' | 'elevation';

export const SKY_TARGET_INFO: { readonly [K in SkyTarget]: { readonly body: BodyId; readonly angle: SkyAngle; readonly param: string } } = {
  sunAzimuth: { body: 'sun', angle: 'azimuth', param: 'sunAz' },
  sunElevation: { body: 'sun', angle: 'elevation', param: 'sunEl' },
  earthAzimuth: { body: 'earth', angle: 'azimuth', param: 'earthAz' },
  earthElevation: { body: 'earth', angle: 'elevation', param: 'earthEl' },
};

/** Conditions are given and compared with at most this many decimals of a degree. */
export const SKY_SEARCH_DECIMALS = 4;

/** `nearest`: either side of the reference; `after`/`before`: only later/earlier instants (the reference included). */
export const SKY_SEARCH_DIRECTIONS = ['nearest', 'after', 'before'] as const;
export type SkySearchDirection = (typeof SKY_SEARCH_DIRECTIONS)[number];

/** Maximum distance from the reference instant that is searched, on each allowed side. */
export const SKY_SEARCH_WINDOW_DAYS = 366;

/** Time resolution of a match: whole UTC seconds. */
export const SKY_SEARCH_RESOLUTION_SECONDS = 1;

/**
 * Inclusive range in degrees with at most 4 decimals. For an azimuth,
 * `min > max` is a range that wraps through north (e.g. 350 to 10). An exact
 * value is a range with `min === max`.
 */
export interface AngleRange {
  readonly min: number;
  readonly max: number;
}

export type SkyConditions = { readonly [K in SkyTarget]?: AngleRange };

const ANGLE_TEXT = /^[+-]?\d{1,3}(?:\.\d{1,4})?$/;
const SCALE = 10 ** SKY_SEARCH_DECIMALS;
const FULL_TURN_UNITS = 360 * SCALE;

/** Plain decimal degrees with at most 4 decimals (`12`, `-3.5`, `359.9999`); `null` otherwise. */
export function parseAngleText(text: string): number | null {
  const trimmed = text.trim();
  if (!ANGLE_TEXT.test(trimmed)) return null;
  return Number(trimmed) + 0;
}

export type RangeCheck =
  | { readonly ok: true; readonly range: AngleRange }
  /** `bounds`: outside [0, 360] (azimuth) or [-90, 90] (elevation); `order`: elevation min above max. */
  | { readonly ok: false; readonly reason: 'bounds' | 'order' };

export function checkRange(angle: SkyAngle, min: number, max: number): RangeCheck {
  const [low, high] = angle === 'azimuth' ? [0, 360] : [-90, 90];
  if (![min, max].every((value) => Number.isFinite(value) && value >= low && value <= high)) {
    return { ok: false, reason: 'bounds' };
  }
  if (angle === 'elevation' && min > max) return { ok: false, reason: 'order' };
  return { ok: true, range: { min, max } };
}

/** True when an azimuth range wraps through north (0°/360°). */
export function wrapsNorth(angle: SkyAngle, range: AngleRange): boolean {
  return angle === 'azimuth' && range.min > range.max;
}

/** Query-string form: `min,max`, or a single value for an exact match. */
export function formatRangeParam(range: AngleRange): string {
  return range.min === range.max ? String(range.min) : `${range.min},${range.max}`;
}

export type RangeParamResult = { readonly ok: true; readonly range: AngleRange } | { readonly ok: false; readonly detail: string };

export function parseRangeParam(angle: SkyAngle, text: string): RangeParamResult {
  const parts = text.split(',');
  if (parts.length > 2) return { ok: false, detail: 'expected "min,max" or a single value' };
  const values = parts.map(parseAngleText);
  if (values.some((value) => value === null)) {
    return { ok: false, detail: `values must be decimal degrees with at most ${SKY_SEARCH_DECIMALS} decimals` };
  }
  const [min, max = min] = values as number[];
  const checked = checkRange(angle, min as number, max as number);
  if (!checked.ok) {
    return {
      ok: false,
      detail:
        checked.reason === 'order'
          ? 'elevation min must not exceed max'
          : angle === 'azimuth'
            ? 'azimuth must be within [0, 360]'
            : 'elevation must be within [-90, 90]',
    };
  }
  return checked;
}

function toUnits(value: number): number {
  return Math.round(value * SCALE);
}

/**
 * Whether a Horizons value satisfies a range at 4-decimal precision: the value
 * is rounded to 4 decimals (an azimuth of 360.0000 counts as 0) and compared
 * with the inclusive range.
 */
export function matchesRange(angle: SkyAngle, range: AngleRange, valueDeg: number | null): boolean {
  if (valueDeg === null || !Number.isFinite(valueDeg)) return false;
  const low = toUnits(range.min);
  const high = toUnits(range.max);
  if (angle === 'elevation') {
    const value = toUnits(valueDeg);
    return value >= low && value <= high;
  }
  const value = ((toUnits(valueDeg) % FULL_TURN_UNITS) + FULL_TURN_UNITS) % FULL_TURN_UNITS;
  // A range ending at 360 includes north, printed as 0.
  const inRange = (units: number) => (low <= high ? units >= low && units <= high : units >= low || units <= high);
  return inRange(value) || (value === 0 && inRange(FULL_TURN_UNITS));
}

export function matchesConditions(conditions: SkyConditions, values: { readonly [K in SkyTarget]?: number | null }): boolean {
  return SKY_TARGETS.every((target) => {
    const range = conditions[target];
    return range === undefined || matchesRange(SKY_TARGET_INFO[target].angle, range, values[target] ?? null);
  });
}

export function activeTargets(conditions: SkyConditions): SkyTarget[] {
  return SKY_TARGETS.filter((target) => conditions[target] !== undefined);
}

export interface SkySearchMatch {
  /** Matching instant, whole seconds, ISO 8601 UTC. */
  readonly utc: string;
  /** `utc` minus the reference instant, seconds (negative: earlier). */
  readonly offsetSeconds: number;
  /** Horizons azimuth/elevation at `utc` for every body that had a condition; degrees. */
  readonly values: { readonly [K in SkyTarget]?: number | null };
}

export type SkySearchOutcome =
  | {
      readonly status: 'found';
      readonly match: SkySearchMatch;
      /**
       * True when every closer whole second was checked, including intervals
       * rejected by interpolation. False when the request budget ran
       * out first: the match is real, but a closer one may exist.
       */
      readonly complete: boolean;
    }
  | {
      readonly status: 'not-found';
      /** `no-match`: nothing matches in the searched window; `budget`: the request/time budget ran out first. */
      readonly reason: 'no-match' | 'budget';
    };

export interface SkySearchMethod {
  readonly ephemerisType: 'OBSERVER';
  readonly quantities: readonly number[];
  readonly refraction: 'AIRLESS';
  readonly timeScale: 'UT';
  readonly terrainModeled: false;
  /** Coarse sampling step used to locate candidates, minutes. */
  readonly coarseStepMinutes: number;
  readonly resolutionSeconds: number;
  readonly windowDays: number;
  readonly comparisonDecimals: number;
}

export interface SkySearchSource {
  readonly name: 'NASA/JPL Horizons API';
  readonly url: string;
  readonly apiVersion: string | null;
  readonly planetaryEphemeris: string | null;
  readonly observerFrame: string | null;
  readonly retrievedAt: string;
}

export interface SkySearchResponse {
  readonly site: EphemerisSite;
  /** Reference instant, ISO 8601 UTC with seconds. */
  readonly referenceUtc: string;
  readonly direction: SkySearchDirection;
  readonly conditions: SkyConditions;
  /** Time span actually sampled (it can be shorter than the window near the supported range ends). */
  readonly searched: { readonly startUtc: string; readonly endUtc: string };
  readonly outcome: SkySearchOutcome;
  readonly source: SkySearchSource;
  readonly method: SkySearchMethod;
  /** Number of Horizons requests made for this search. */
  readonly horizonsRequests: number;
}
