/**
 * Sun and Earth observations at equally spaced instants for the horizon
 * playback (`GET /api/ephemeris-series`, contract in
 * `shared/ephemerisSeries.ts`).
 *
 * Same Horizons method as `service.ts` (observer table, quantities 4, 13 and
 * 20, airless, UT, height 0 km), but one START/STOP/STEP request per body
 * returns every sample instead of one TLIST request per body and sample.
 * Each row becomes a frame built by `buildEphemerisResponse`, so frames carry
 * the same fields, provenance and warnings as single results. A body whose
 * table does not have exactly the requested instants fails as a whole
 * (`UPSTREAM_FORMAT`) rather than being matched by guesswork.
 */

import { BODY_IDS, type BodyId, type EphemerisResponse } from '../../shared/ephemeris.js';
import {
  SERIES_MAX_COUNT,
  SERIES_MAX_STEP_MINUTES,
  SERIES_MIN_COUNT,
  SERIES_MIN_STEP_MINUTES,
  type EphemerisSeriesResponse,
} from '../../shared/ephemerisSeries.js';
import type { ObserverSite } from '../../shared/sites.js';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../shared/time.js';
import { fetchObserverTables, type ObserverTableResult, type ObserverTablesResult } from '../horizons/client.js';
import { errorResponse, jsonResponse } from '../http.js';
import { parseSiteQuery } from './handler.js';
import { allFailed, buildEphemerisResponse, SITE_ALTITUDE_KM, type EphemerisServiceOptions } from './service.js';

const SUCCESS_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';
const MINUTE_MS = 60_000;

export type SeriesQueryResult =
  | { readonly ok: true; readonly site: ObserverSite; readonly start: Date; readonly stepMinutes: number; readonly count: number }
  | { readonly ok: false; readonly detail: string };

function integerParam(params: URLSearchParams, name: string, min: number, max: number): number | string {
  const raw = params.get(name);
  if (raw === null || !/^\d+$/.test(raw)) return `"${name}" must be a whole number in [${min}, ${max}]`;
  const value = Number(raw);
  return value >= min && value <= max ? value : `"${name}" must be a whole number in [${min}, ${max}]`;
}

export function parseSeriesQuery(requestUrl: string): SeriesQueryResult {
  let params: URLSearchParams;
  try {
    params = new URL(requestUrl).searchParams;
  } catch {
    return { ok: false, detail: 'request URL could not be parsed' };
  }
  const site = parseSiteQuery(params);
  if (!site.ok) return site;

  const startParam = params.get('start');
  const start = startParam === null ? null : parseUtcInstant(startParam);
  if (!start?.ok) return { ok: false, detail: '"start" must be a UTC instant formatted YYYY-MM-DDTHH:mm[:ss]Z within the supported range' };
  const stepMinutes = integerParam(params, 'step', SERIES_MIN_STEP_MINUTES, SERIES_MAX_STEP_MINUTES);
  if (typeof stepMinutes === 'string') return { ok: false, detail: stepMinutes };
  const count = integerParam(params, 'count', SERIES_MIN_COUNT, SERIES_MAX_COUNT);
  if (typeof count === 'string') return { ok: false, detail: count };

  const end = start.instant.getTime() + (count - 1) * stepMinutes * MINUTE_MS;
  if (end >= Date.parse(SUPPORTED_UTC_RANGE.endExclusive)) {
    return { ok: false, detail: `the last sample must be before ${SUPPORTED_UTC_RANGE.endExclusive}` };
  }
  return { ok: true, site: site.site, start: start.instant, stepMinutes, count };
}

/** The table must hold exactly the requested instants, in order. */
function checkRows(result: ObserverTablesResult, instants: readonly Date[]): ObserverTablesResult {
  if (!result.ok) return result;
  const matches =
    result.tables.length === instants.length &&
    result.tables.every((table, index) => Date.parse(table.ephemerisUtc) === instants[index]?.getTime());
  return matches
    ? result
    : { ok: false, error: { code: 'UPSTREAM_FORMAT', detail: `expected ${instants.length} rows at the requested instants` } };
}

export async function computeEphemerisSeries(
  site: ObserverSite,
  start: Date,
  stepMinutes: number,
  count: number,
  options: EphemerisServiceOptions = {},
  signal?: AbortSignal,
): Promise<EphemerisResponse[]> {
  const instants = Array.from({ length: count }, (_, index) => new Date(start.getTime() + index * stepMinutes * MINUTE_MS));
  const stop = instants[instants.length - 1] as Date;
  const entries = await Promise.all(
    BODY_IDS.map(async (body) => {
      const result = await fetchObserverTables(
        {
          body,
          latitudeDeg: site.latitudeDeg,
          longitudeEastDeg: site.longitudeEastDeg,
          altitudeKm: SITE_ALTITUDE_KM,
          start,
          stop,
          intervals: count - 1,
        },
        options.horizons,
        signal,
      );
      return [body, checkRows(result, instants)] as const;
    }),
  );
  const series = Object.fromEntries(entries) as Record<BodyId, ObserverTablesResult>;

  return instants.map((instant, index) => {
    const results = {} as Record<BodyId, ObserverTableResult>;
    for (const body of BODY_IDS) {
      const result = series[body];
      results[body] = result.ok
        ? { ok: true, table: result.tables[index]!, retrievedAt: result.retrievedAt, url: result.url }
        : result;
    }
    return buildEphemerisResponse(site, instant, results, 'live');
  });
}

export function createEphemerisSeriesHandler(options: EphemerisServiceOptions = {}) {
  return async function handleEphemerisSeriesRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(405, { code: 'METHOD_NOT_ALLOWED', detail: `method ${request.method} not allowed` }, { Allow: 'GET, HEAD' });
    }
    const query = parseSeriesQuery(request.url);
    if (!query.ok) return errorResponse(400, { code: 'INVALID_REQUEST', detail: query.detail });

    try {
      const frames = await computeEphemerisSeries(query.site, query.start, query.stepMinutes, query.count, options, request.signal);
      const first = frames[0];
      if (first && allFailed(first)) {
        const failure = BODY_IDS.map((body) => first.bodies[body]).find((body) => body.status === 'error');
        const error = failure?.status === 'error' ? failure.error : { code: 'UPSTREAM_UNAVAILABLE' as const, detail: 'no body computed' };
        console.error('[ephemeris-series] all bodies failed', error.code, error.detail);
        return errorResponse(502, error);
      }
      const partial = frames.some((frame) => frame.warnings.includes('PARTIAL_RESULT'));
      const body: EphemerisSeriesResponse = { frames };
      return jsonResponse(200, body, { 'Cache-Control': partial ? 'no-store' : SUCCESS_CACHE_CONTROL });
    } catch (cause) {
      console.error('[ephemeris-series] unexpected failure', cause);
      return errorResponse(500, { code: 'INTERNAL', detail: 'unexpected server error' });
    }
  };
}

export const handleEphemerisSeriesRequest = createEphemerisSeriesHandler();

