/**
 * Builds Horizons API observer-table requests for a topocentric lunar site.
 *
 * Parameters follow https://ssd-api.jpl.nasa.gov/doc/horizons.html and match
 * the saved fixtures documented in `__fixtures__/README.md`.
 */

import type { BodyId } from '../../shared/ephemeris.js';

export const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** Horizons major-body IDs. */
export const HORIZONS_COMMANDS: { readonly [K in BodyId]: string } = {
  sun: '10',
  earth: '399',
};

/** Observer-table quantities: 4 = apparent Az/El, 13 = angular diameter, 20 = range & range-rate. */
export const OBSERVER_QUANTITIES = [4, 13, 20] as const;

export interface ObserverQuery {
  readonly body: BodyId;
  readonly latitudeDeg: number;
  readonly longitudeEastDeg: number;
  /** Height above the Horizons lunar reference sphere, km. */
  readonly altitudeKm: number;
  readonly instant: Date;
}

/** Horizons calendar form `YYYY-MM-DD HH:MM:SS` (UT). */
export function formatHorizonsCalendarTime(instant: Date): string {
  return instant.toISOString().slice(0, 19).replace('T', ' ');
}

/** Normalizes an east longitude to [0, 360), the form Horizons prints back. */
export function normalizeEastLongitude(longitudeEastDeg: number): number {
  const normalized = ((longitudeEastDeg % 360) + 360) % 360;
  // Avoid floating-point noise such as 188.13000000000002.
  return Number(normalized.toFixed(10));
}

type Parameters = ReadonlyArray<readonly [string, string]>;

/** Target and topocentric lunar observer shared by the single-instant and range requests. */
function observerSiteParameters(query: Omit<ObserverQuery, 'instant'>): Parameters {
  const siteCoord = [normalizeEastLongitude(query.longitudeEastDeg), query.latitudeDeg, query.altitudeKm].join(',');
  return [
    ['format', 'json'],
    ['COMMAND', quoted(HORIZONS_COMMANDS[query.body])],
    ['OBJ_DATA', quoted('NO')],
    ['MAKE_EPHEM', quoted('YES')],
    ['EPHEM_TYPE', quoted('OBSERVER')],
    // 301 = Moon; "coord" takes the site from SITE_COORD/COORD_TYPE.
    ['CENTER', quoted('coord@301')],
    ['COORD_TYPE', quoted('GEODETIC')],
    ['SITE_COORD', quoted(siteCoord)],
  ];
}

export function buildObserverParameters(query: ObserverQuery): Parameters {
  return [
    ...observerSiteParameters(query),
    ['TLIST', quoted(formatHorizonsCalendarTime(query.instant))],
    ['TLIST_TYPE', quoted('CAL')],
    ['TIME_TYPE', quoted('UT')],
    ['QUANTITIES', quoted(OBSERVER_QUANTITIES.join(','))],
    ['ANG_FORMAT', quoted('DEG')],
    ['APPARENT', quoted('AIRLESS')],
    ['RANGE_UNITS', quoted('AU')],
    ['CSV_FORMAT', quoted('YES')],
    ['TIME_DIGITS', quoted('SECONDS')],
  ];
}

/** Only apparent Az/El (quantity 4) is needed to search for an instant. */
export const SEARCH_QUANTITIES = [4] as const;

/**
 * Step of a range request: whole hours (`1h`), or a number of equal intervals
 * between start and stop (Horizons "unitless" step, e.g. 60 intervals over one
 * minute = 1 s), which allows steps shorter than a minute.
 */
export type ObserverStep = { readonly kind: 'hours'; readonly hours: number } | { readonly kind: 'intervals'; readonly count: number };

export interface ObserverRangeQuery extends Omit<ObserverQuery, 'instant'> {
  readonly start: Date;
  readonly stop: Date;
  readonly step: ObserverStep;
}

export function formatObserverStep(step: ObserverStep): string {
  return step.kind === 'hours' ? `${step.hours}h` : String(step.count);
}

/** Observer table sampled from `start` to `stop` (both included), Az/El only. */
export function buildObserverRangeParameters(query: ObserverRangeQuery): Parameters {
  return [
    ...observerSiteParameters(query),
    ['START_TIME', quoted(formatHorizonsCalendarTime(query.start))],
    ['STOP_TIME', quoted(formatHorizonsCalendarTime(query.stop))],
    ['STEP_SIZE', quoted(formatObserverStep(query.step))],
    ['TIME_TYPE', quoted('UT')],
    ['QUANTITIES', quoted(SEARCH_QUANTITIES.join(','))],
    ['ANG_FORMAT', quoted('DEG')],
    ['APPARENT', quoted('AIRLESS')],
    ['CSV_FORMAT', quoted('YES')],
    ['TIME_DIGITS', quoted('SECONDS')],
  ];
}

/**
 * Full request URL. Values are percent-encoded with `%20` for spaces and `%27`
 * for single quotes, as the API documentation recommends.
 */
export function buildObserverUrl(query: ObserverQuery, baseUrl: string = HORIZONS_API_URL): string {
  return toUrl(buildObserverParameters(query), baseUrl);
}

export function buildObserverRangeUrl(query: ObserverRangeQuery, baseUrl: string = HORIZONS_API_URL): string {
  return toUrl(buildObserverRangeParameters(query), baseUrl);
}

function toUrl(parameters: Parameters, baseUrl: string): string {
  const search = parameters.map(([key, value]) => `${key}=${encodeValue(value)}`).join('&');
  return `${baseUrl}?${search}`;
}

function quoted(value: string): string {
  return `'${value}'`;
}

function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/'/g, '%27');
}
