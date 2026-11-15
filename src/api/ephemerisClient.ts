/**
 * Browser client for the project's server route. The browser never calls
 * Horizons directly (JPL CORS policy); it always goes through `/api/ephemeris`.
 */

import { EPHEMERIS_ENDPOINT, isApiErrorResponse, type EphemerisResponse } from '../../shared/ephemeris';
import { EPHEMERIS_SERIES_ENDPOINT } from '../../shared/ephemerisSeries';
import { CUSTOM_SITE_ID, type ObserverSiteId } from '../../shared/sites';
import type { ClientErrorKey } from '../i18n/messages';

export interface EphemerisSelection {
  /** Reference site, or `custom` when the coordinates match none of them. */
  readonly siteId: ObserverSiteId;
  /** Checked coordinates (see `checkCoordinates`); equal to the site's own for a reference site. */
  readonly latitudeDeg: number;
  readonly longitudeEastDeg: number;
  /** ISO 8601 UTC, e.g. `2026-11-14T12:00:00Z`. */
  readonly utc: string;
}

export interface ClientError {
  readonly key: ClientErrorKey;
  /** Technical detail for the console; not shown as UI text. */
  readonly detail: string;
}

export type EphemerisFetchResult =
  | { readonly ok: true; readonly data: EphemerisResponse }
  | { readonly ok: false; readonly error: ClientError };

function siteParams(selection: Omit<EphemerisSelection, 'utc'>): Record<string, string> {
  return selection.siteId === CUSTOM_SITE_ID
    ? { lat: String(selection.latitudeDeg), lon: String(selection.longitudeEastDeg) }
    : { site: selection.siteId };
}

type JsonResult = { readonly ok: true; readonly status: number; readonly body: unknown } | { readonly ok: false; readonly error: ClientError };

/** GET a project route and decode its JSON; API errors keep their code. */
async function getJson(url: string, signal?: AbortSignal): Promise<JsonResult> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  } catch (cause) {
    return { ok: false, error: { key: 'NETWORK', detail: String(cause) } };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${response.status}, body is not JSON` } };
  }
  if (isApiErrorResponse(body)) {
    return { ok: false, error: { key: body.error.code, detail: body.error.detail } };
  }
  if (!response.ok) return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${response.status}` } };
  return { ok: true, status: response.status, body };
}

export async function fetchEphemeris(selection: EphemerisSelection, signal?: AbortSignal): Promise<EphemerisFetchResult> {
  const params = new URLSearchParams({ ...siteParams(selection), utc: selection.utc });
  const result = await getJson(`${EPHEMERIS_ENDPOINT}?${params.toString()}`, signal);
  if (!result.ok) return result;
  if (!looksLikeEphemeris(result.body)) {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${result.status}` } };
  }
  return { ok: true, data: result.body };
}

export interface EphemerisSeriesRequest {
  readonly selection: Omit<EphemerisSelection, 'utc'>;
  /** First sample, ISO 8601 UTC. */
  readonly startUtc: string;
  readonly stepMinutes: number;
  readonly count: number;
}

export type EphemerisSeriesFetchResult =
  | { readonly ok: true; readonly frames: readonly EphemerisResponse[] }
  | { readonly ok: false; readonly error: ClientError };

/** Equally spaced samples from `/api/ephemeris-series` (see `shared/ephemerisSeries.ts`). */
export async function fetchEphemerisSeries(request: EphemerisSeriesRequest, signal?: AbortSignal): Promise<EphemerisSeriesFetchResult> {
  const params = new URLSearchParams({
    ...siteParams(request.selection),
    start: request.startUtc,
    step: String(request.stepMinutes),
    count: String(request.count),
  });
  const result = await getJson(`${EPHEMERIS_SERIES_ENDPOINT}?${params.toString()}`, signal);
  if (!result.ok) return result;
  const frames = (result.body as { frames?: unknown }).frames;
  if (!Array.isArray(frames) || frames.length !== request.count || !frames.every(looksLikeEphemeris)) {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${result.status}, unexpected series` } };
  }
  return { ok: true, frames };
}

function looksLikeEphemeris(value: unknown): value is EphemerisResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<EphemerisResponse>;
  return (
    (candidate.provenance === 'live' || candidate.provenance === 'saved-sample') &&
    typeof candidate.bodies === 'object' &&
    candidate.bodies !== null &&
    'sun' in candidate.bodies &&
    'earth' in candidate.bodies
  );
}
