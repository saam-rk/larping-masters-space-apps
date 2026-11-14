/**
 * Browser client for the inverse search route (`/api/sky-search`). Like the
 * ephemeris client, it never calls Horizons directly.
 */

import { isApiErrorResponse } from '../../shared/ephemeris';
import {
  formatRangeParam,
  SKY_SEARCH_ENDPOINT,
  SKY_TARGET_INFO,
  SKY_TARGETS,
  type SkyConditions,
  type SkySearchDirection,
  type SkySearchResponse,
} from '../../shared/skySearch';
import { CUSTOM_SITE_ID } from '../../shared/sites';
import type { ClientError, EphemerisSelection } from './ephemerisClient';

export interface SkySearchRequest {
  /** Site and reference instant (`utc`) of the search. */
  readonly selection: EphemerisSelection;
  readonly direction: SkySearchDirection;
  readonly conditions: SkyConditions;
}

export type SkySearchFetchResult =
  | { readonly ok: true; readonly data: SkySearchResponse }
  | { readonly ok: false; readonly error: ClientError };

export function skySearchUrl({ selection, direction, conditions }: SkySearchRequest): string {
  const params = new URLSearchParams(
    selection.siteId === CUSTOM_SITE_ID
      ? { lat: String(selection.latitudeDeg), lon: String(selection.longitudeEastDeg) }
      : { site: selection.siteId },
  );
  params.set('from', selection.utc);
  params.set('direction', direction);
  for (const target of SKY_TARGETS) {
    const range = conditions[target];
    if (range) params.set(SKY_TARGET_INFO[target].param, formatRangeParam(range));
  }
  return `${SKY_SEARCH_ENDPOINT}?${params.toString()}`;
}

export async function fetchSkySearch(request: SkySearchRequest, signal?: AbortSignal): Promise<SkySearchFetchResult> {
  let response: Response;
  try {
    response = await fetch(skySearchUrl(request), { headers: { Accept: 'application/json' }, signal });
  } catch (cause) {
    return { ok: false, error: { key: 'NETWORK', detail: String(cause) } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${response.status}, body is not JSON` } };
  }

  if (isApiErrorResponse(body)) return { ok: false, error: { key: body.error.code, detail: body.error.detail } };
  if (!response.ok || !looksLikeSkySearch(body)) {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${response.status}` } };
  }
  return { ok: true, data: body };
}

function looksLikeSkySearch(value: unknown): value is SkySearchResponse {
  if (typeof value !== 'object' || value === null) return false;
  const outcome = (value as Partial<SkySearchResponse>).outcome;
  return typeof outcome === 'object' && outcome !== null && (outcome.status === 'found' || outcome.status === 'not-found');
}
