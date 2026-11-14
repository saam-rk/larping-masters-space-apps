/**
 * Web-standard handler for `GET /api/ephemeris?site=<SiteId>&utc=<ISO UTC>`
 * (or `?lat=<deg>&lon=<deg east>&utc=<ISO UTC>` for a custom point).
 * Used by the Vercel function (`api/ephemeris.ts`) and the Vite dev server.
 *
 * Status codes:
 *   200  at least one body computed (check each `bodies[*].status`)
 *   400  INVALID_REQUEST
 *   405  METHOD_NOT_ALLOWED
 *   502  every body failed upstream (code of the first failure)
 *   500  INTERNAL
 */

import { BODY_IDS, type EphemerisResponse } from '../../shared/ephemeris.js';
import { checkCoordinates, findSite, isSiteId, siteAt, SITE_IDS, type ObserverSite } from '../../shared/sites.js';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../shared/time.js';
import { errorResponse, jsonResponse } from '../http.js';
import { allFailed, computeEphemeris, createDefaultCache, type EphemerisServiceOptions } from './service.js';

/** Results for a fixed site and instant are deterministic; let the CDN keep them for a day. */
const SUCCESS_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';

export type EphemerisQueryResult =
  | { readonly ok: true; readonly site: ObserverSite; readonly instant: Date }
  | { readonly ok: false; readonly detail: string };

/** Plain decimal degrees, e.g. `-85.4381` or `37`; no exponents, units or hemisphere letters. */
const DECIMAL_DEGREES = /^[+-]?\d{1,3}(?:\.\d+)?$/;

export type SiteQueryResult = { readonly ok: true; readonly site: ObserverSite } | { readonly ok: false; readonly detail: string };

/** `site=<SiteId>`, or `lat` and `lon` in degrees (east longitude) for a custom point. Shared with `/api/sky-search`. */
export function parseSiteQuery(params: URLSearchParams): SiteQueryResult {
  const siteParam = params.get('site');
  const latParam = params.get('lat');
  const lonParam = params.get('lon');

  if (siteParam !== null) {
    if (!isSiteId(siteParam)) return { ok: false, detail: `"site" must be one of: ${SITE_IDS.join(', ')}` };
    if (latParam !== null || lonParam !== null) return { ok: false, detail: 'send either "site" or "lat"/"lon", not both' };
    return { ok: true, site: findSite(siteParam) };
  }

  if (latParam === null && lonParam === null) {
    return { ok: false, detail: `"site" must be one of: ${SITE_IDS.join(', ')}; or send "lat" and "lon" in degrees` };
  }
  if (latParam === null || lonParam === null || !DECIMAL_DEGREES.test(latParam) || !DECIMAL_DEGREES.test(lonParam)) {
    return { ok: false, detail: '"lat" and "lon" must both be decimal degrees, e.g. lat=-85.4381&lon=37.36667' };
  }
  const checked = checkCoordinates(Number(latParam), Number(lonParam));
  if (!checked.ok) {
    return {
      ok: false,
      detail: checked.reason === 'latitude' ? '"lat" must be within [-90, 90]' : '"lon" must be within [-180, 360]',
    };
  }
  return { ok: true, site: siteAt(checked.latitudeDeg, checked.longitudeEastDeg) };
}

/** Validates the site (`site`, or `lat` + `lon`) and `utc` query parameters. */
export function parseEphemerisQuery(requestUrl: string): EphemerisQueryResult {
  let params: URLSearchParams;
  try {
    params = new URL(requestUrl).searchParams;
  } catch {
    return { ok: false, detail: 'request URL could not be parsed' };
  }

  const site = parseSiteQuery(params);
  if (!site.ok) return site;

  const utcParam = params.get('utc');
  if (utcParam === null) {
    return { ok: false, detail: '"utc" is required, e.g. 2026-11-14T12:00:00Z' };
  }
  const parsedTime = parseUtcInstant(utcParam);
  if (!parsedTime.ok) {
    const detail =
      parsedTime.reason === 'out-of-range'
        ? `"utc" must be within [${SUPPORTED_UTC_RANGE.startInclusive}, ${SUPPORTED_UTC_RANGE.endExclusive})`
        : `"utc" must be a valid UTC instant formatted YYYY-MM-DDTHH:mm[:ss]Z (${parsedTime.reason})`;
    return { ok: false, detail };
  }

  return { ok: true, site: site.site, instant: parsedTime.instant };
}

export function createEphemerisHandler(options: EphemerisServiceOptions = {}) {
  return async function handleEphemerisRequest(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(
        405,
        { code: 'METHOD_NOT_ALLOWED', detail: `method ${request.method} not allowed` },
        { Allow: 'GET, HEAD' },
      );
    }

    const query = parseEphemerisQuery(request.url);
    if (!query.ok) {
      return errorResponse(400, { code: 'INVALID_REQUEST', detail: query.detail });
    }

    try {
      const response = await computeEphemeris(query.site, query.instant, options, request.signal);
      return toHttpResponse(response);
    } catch (cause) {
      console.error('[ephemeris] unexpected failure', cause);
      return errorResponse(500, { code: 'INTERNAL', detail: 'unexpected server error' });
    }
  };
}

function toHttpResponse(response: EphemerisResponse): Response {
  if (allFailed(response)) {
    const failures = BODY_IDS.flatMap((body) => {
      const result = response.bodies[body];
      return result.status === 'error' ? [{ body, error: result.error }] : [];
    });
    const detail = failures.map(({ body, error }) => `${body}: ${error.code} ${error.detail}`).join('; ');
    console.error('[ephemeris] all bodies failed', detail);
    return errorResponse(502, { code: failures[0]?.error.code ?? 'UPSTREAM_UNAVAILABLE', detail });
  }

  const partial = response.warnings.includes('PARTIAL_RESULT');
  if (partial) console.error('[ephemeris] partial result', JSON.stringify(response.bodies));
  return jsonResponse(200, response, { 'Cache-Control': partial ? 'no-store' : SUCCESS_CACHE_CONTROL });
}

export const handleEphemerisRequest = createEphemerisHandler({ cache: createDefaultCache() });
