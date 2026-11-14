/**
 * Browser client for the project's server route. The browser never calls
 * Horizons directly (JPL CORS policy); it always goes through `/api/ephemeris`.
 */

import { EPHEMERIS_ENDPOINT, isApiErrorResponse, type EphemerisResponse } from '../../shared/ephemeris';
import type { SiteId } from '../../shared/sites';
import type { ClientErrorKey } from '../i18n/messages';

export interface EphemerisSelection {
  readonly siteId: SiteId;
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

export async function fetchEphemeris(selection: EphemerisSelection, signal?: AbortSignal): Promise<EphemerisFetchResult> {
  const params = new URLSearchParams({ site: selection.siteId, utc: selection.utc });

  let response: Response;
  try {
    response = await fetch(`${EPHEMERIS_ENDPOINT}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
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
  if (!response.ok || !looksLikeEphemeris(body)) {
    return { ok: false, error: { key: 'UNEXPECTED_RESPONSE', detail: `HTTP ${response.status}` } };
  }
  return { ok: true, data: body };
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
