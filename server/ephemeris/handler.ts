/**
 * Web-standard handler for `GET /api/ephemeris?site=<SiteId>&utc=<ISO UTC>`.
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
import { findSite, isSiteId, SITE_IDS, type ReferenceSite } from '../../shared/sites.js';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../shared/time.js';
import { errorResponse, jsonResponse } from '../http.js';
import { allFailed, computeEphemeris, createDefaultCache, type EphemerisServiceOptions } from './service.js';

/** Results for a fixed site and instant are deterministic; let the CDN keep them for a day. */
const SUCCESS_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';

export type EphemerisQueryResult =
  | { readonly ok: true; readonly site: ReferenceSite; readonly instant: Date }
  | { readonly ok: false; readonly detail: string };

/** Validates `site` and `utc` query parameters. */
export function parseEphemerisQuery(requestUrl: string): EphemerisQueryResult {
  let params: URLSearchParams;
  try {
    params = new URL(requestUrl).searchParams;
  } catch {
    return { ok: false, detail: 'request URL could not be parsed' };
  }

  const siteParam = params.get('site');
  if (!isSiteId(siteParam)) {
    return { ok: false, detail: `"site" must be one of: ${SITE_IDS.join(', ')}` };
  }

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

  return { ok: true, site: findSite(siteParam), instant: parsedTime.instant };
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
