/**
 * Web-standard handler for the inverse search (`shared/skySearch.ts`):
 *
 *   GET /api/sky-search?site=<SiteId>|lat=<deg>&lon=<deg east>
 *       &from=<YYYY-MM-DDTHH:mm[:ss]Z>
 *       [&direction=nearest|after|before]
 *       [&sunAz=<min,max>][&sunEl=...][&earthAz=...][&earthEl=...]
 *
 * At least one condition is required. Each condition is `min,max` or a single
 * value (exact match at 4 decimals); azimuth `min > max` wraps through north.
 * Conditions that the Sun or the Earth can never meet at the site are
 * rejected with 400 before Horizons is queried (`shared/skyFeasibility.ts`).
 *
 * Status codes:
 *   200  search finished: `outcome.status` is `found` or `not-found`
 *   400  INVALID_REQUEST
 *   405  METHOD_NOT_ALLOWED
 *   502  a Horizons request failed (the search cannot continue without it)
 *   500  INTERNAL
 */

import { BODY_IDS, type ApiError, type BodyId } from '../../shared/ephemeris.js';
import {
  activeTargets,
  parseRangeParam,
  SKY_SEARCH_DECIMALS,
  SKY_SEARCH_DIRECTIONS,
  SKY_SEARCH_RESOLUTION_SECONDS,
  SKY_SEARCH_WINDOW_DAYS,
  SKY_TARGET_INFO,
  SKY_TARGETS,
  type AngleRange,
  type SkyConditions,
  type SkySearchDirection,
  type SkySearchMethod,
  type SkySearchResponse,
  type SkyTarget,
} from '../../shared/skySearch.js';
import { impossibleBodies } from '../../shared/skyFeasibility.js';
import { CUSTOM_SITE_ID, type ObserverSite } from '../../shared/sites.js';
import { parseUtcInstant, SUPPORTED_UTC_RANGE, toUtcIsoSeconds } from '../../shared/time.js';
import { parseSiteQuery } from '../ephemeris/handler.js';
import { TtlCache } from '../ephemeris/cache.js';
import { SITE_ALTITUDE_KM } from '../ephemeris/service.js';
import type { HorizonsClientOptions } from '../horizons/client.js';
import { HORIZONS_API_URL, SEARCH_QUANTITIES } from '../horizons/query.js';
import { errorResponse, jsonResponse } from '../http.js';
import { createHorizonsSampler } from './sampler.js';
import { COARSE_STEP_MINUTES, searchSky, type SearchLimits } from './search.js';

/** Sampler calls per search (each is one Horizons request per conditioned body). */
export const MAX_SAMPLES_PER_SEARCH = 24;
/** No new Horizons request is started after this long. */
export const SEARCH_TIME_BUDGET_MS = 25_000;

const SUCCESS_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';

export const SKY_SEARCH_METHOD: SkySearchMethod = {
  ephemerisType: 'OBSERVER',
  quantities: SEARCH_QUANTITIES,
  refraction: 'AIRLESS',
  timeScale: 'UT',
  terrainModeled: false,
  coarseStepMinutes: COARSE_STEP_MINUTES,
  resolutionSeconds: SKY_SEARCH_RESOLUTION_SECONDS,
  windowDays: SKY_SEARCH_WINDOW_DAYS,
  comparisonDecimals: SKY_SEARCH_DECIMALS,
};

export interface SkySearchQuery {
  readonly site: ObserverSite;
  readonly reference: Date;
  readonly direction: SkySearchDirection;
  readonly conditions: SkyConditions;
}

export type SkySearchQueryResult = ({ readonly ok: true } & SkySearchQuery) | { readonly ok: false; readonly detail: string };

export function parseSkySearchQuery(requestUrl: string): SkySearchQueryResult {
  let params: URLSearchParams;
  try {
    params = new URL(requestUrl).searchParams;
  } catch {
    return { ok: false, detail: 'request URL could not be parsed' };
  }

  const site = parseSiteQuery(params);
  if (!site.ok) return site;

  const fromParam = params.get('from');
  if (fromParam === null) return { ok: false, detail: '"from" is required, e.g. 2026-11-14T12:00:00Z' };
  const reference = parseUtcInstant(fromParam);
  if (!reference.ok) {
    return {
      ok: false,
      detail:
        reference.reason === 'out-of-range'
          ? `"from" must be within [${SUPPORTED_UTC_RANGE.startInclusive}, ${SUPPORTED_UTC_RANGE.endExclusive})`
          : `"from" must be a valid UTC instant formatted YYYY-MM-DDTHH:mm[:ss]Z (${reference.reason})`,
    };
  }

  const directionParam = params.get('direction') ?? 'nearest';
  if (!(SKY_SEARCH_DIRECTIONS as readonly string[]).includes(directionParam)) {
    return { ok: false, detail: `"direction" must be one of: ${SKY_SEARCH_DIRECTIONS.join(', ')}` };
  }

  const conditions: { [K in SkyTarget]?: AngleRange } = {};
  for (const target of SKY_TARGETS) {
    const { param, angle } = SKY_TARGET_INFO[target];
    const text = params.get(param);
    if (text === null || text === '') continue;
    const parsed = parseRangeParam(angle, text);
    if (!parsed.ok) return { ok: false, detail: `"${param}": ${parsed.detail}` };
    conditions[target] = parsed.range;
  }
  if (activeTargets(conditions).length === 0) {
    const names = SKY_TARGETS.map((target) => SKY_TARGET_INFO[target].param).join(', ');
    return { ok: false, detail: `give at least one condition: ${names}` };
  }
  const impossible = impossibleBodies(site.site, conditions);
  if (impossible.length > 0) {
    const params = activeTargets(conditions)
      .filter((target) => impossible.includes(SKY_TARGET_INFO[target].body))
      .map((target) => `"${SKY_TARGET_INFO[target].param}"`)
      .join(' + ');
    return { ok: false, detail: `${params}: the ${impossible.join(' and the ')} never reaches these values at this site` };
  }

  return {
    ok: true,
    site: site.site,
    reference: reference.instant,
    direction: directionParam as SkySearchDirection,
    conditions,
  };
}

export interface SkySearchServiceOptions {
  readonly horizons?: HorizonsClientOptions;
  readonly limits?: Partial<Pick<SearchLimits, 'maxSamples'>> & { readonly timeBudgetMs?: number; readonly now?: () => number };
  /** Pass `null` to disable caching. */
  readonly cache?: TtlCache<SkySearchResponse> | null;
}

export function createDefaultSkySearchCache(): TtlCache<SkySearchResponse> {
  return new TtlCache<SkySearchResponse>({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 200 });
}

export type SkySearchRun =
  | { readonly ok: true; readonly response: SkySearchResponse; readonly cacheable: boolean }
  | { readonly ok: false; readonly error: ApiError };

export async function runSkySearch(query: SkySearchQuery, options: SkySearchServiceOptions = {}, signal?: AbortSignal): Promise<SkySearchRun> {
  const { site, reference, direction, conditions } = query;
  const place = site.id === CUSTOM_SITE_ID ? `${site.latitudeDeg},${site.longitudeEastDeg}` : site.id;
  const conditionKey = activeTargets(conditions)
    .map((target) => `${target}=${conditions[target]?.min},${conditions[target]?.max}`)
    .join(';');
  const cacheKey = `${place}|${toUtcIsoSeconds(reference)}|${direction}|${conditionKey}`;
  const cached = options.cache?.get(cacheKey);
  if (cached) return { ok: true, response: cached, cacheable: true };

  const bodies: BodyId[] = BODY_IDS.filter((body) => activeTargets(conditions).some((target) => SKY_TARGET_INFO[target].body === body));
  const sampler = createHorizonsSampler(
    { latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, altitudeKm: SITE_ALTITUDE_KM },
    bodies,
    options.horizons,
    signal,
  );
  const now = options.limits?.now ?? Date.now;

  const result = await searchSky(
    {
      referenceMs: reference.getTime(),
      direction,
      conditions,
      supportedRange: {
        startMs: Date.parse(SUPPORTED_UTC_RANGE.startInclusive),
        endMs: Date.parse(SUPPORTED_UTC_RANGE.endExclusive) - 1000,
      },
    },
    sampler.sample,
    {
      maxSamples: options.limits?.maxSamples ?? MAX_SAMPLES_PER_SEARCH,
      deadlineMs: now() + (options.limits?.timeBudgetMs ?? SEARCH_TIME_BUDGET_MS),
      now,
    },
  );
  if (!result.ok) return result;

  const source = sampler.source();
  const referenceUtc = toUtcIsoSeconds(reference);
  const response: SkySearchResponse = {
    site: {
      id: site.id,
      name: site.name,
      latitudeDeg: site.latitudeDeg,
      longitudeEastDeg: site.longitudeEastDeg,
      altitudeKm: SITE_ALTITUDE_KM,
      source: site.source,
    },
    referenceUtc,
    direction,
    conditions,
    searched: result.searched
      ? { startUtc: toUtcIsoSeconds(new Date(result.searched.startMs)), endUtc: toUtcIsoSeconds(new Date(result.searched.endMs)) }
      : { startUtc: referenceUtc, endUtc: referenceUtc },
    outcome: result.outcome,
    source: source ?? {
      name: 'NASA/JPL Horizons API',
      url: HORIZONS_API_URL,
      apiVersion: null,
      planetaryEphemeris: null,
      observerFrame: null,
      retrievedAt: new Date(now()).toISOString(),
    },
    method: SKY_SEARCH_METHOD,
    horizonsRequests: sampler.requests(),
  };

  // A budget cut depends on timing, so only finished searches are reused.
  const cacheable = result.outcome.status === 'found' ? result.outcome.complete : result.outcome.reason === 'no-match';
  if (cacheable) options.cache?.set(cacheKey, response);
  return { ok: true, response, cacheable };
}

export function createSkySearchHandler(options: SkySearchServiceOptions = {}) {
  return async function handleSkySearchRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(405, { code: 'METHOD_NOT_ALLOWED', detail: `method ${request.method} not allowed` }, { Allow: 'GET, HEAD' });
    }

    const query = parseSkySearchQuery(request.url);
    if (!query.ok) return errorResponse(400, { code: 'INVALID_REQUEST', detail: query.detail });

    try {
      const run = await runSkySearch(query, options, request.signal);
      if (!run.ok) {
        console.error('[sky-search] upstream failure', run.error.code, run.error.detail);
        return errorResponse(502, run.error);
      }
      return jsonResponse(200, run.response, { 'Cache-Control': run.cacheable ? SUCCESS_CACHE_CONTROL : 'no-store' });
    } catch (cause) {
      console.error('[sky-search] unexpected failure', cause);
      return errorResponse(500, { code: 'INTERNAL', detail: 'unexpected server error' });
    }
  };
}

export const handleSkySearchRequest = createSkySearchHandler({ cache: createDefaultSkySearchCache() });
