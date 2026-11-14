/**
 * HTTP contract for `GET /api/ephemeris`, shared by the browser and the server.
 *
 * Request:  GET /api/ephemeris?site=<SiteId>&utc=<YYYY-MM-DDTHH:mm[:ss]Z>
 *      or:  GET /api/ephemeris?lat=<deg>&lon=<deg east>&utc=<...>   (custom point)
 * Success:  200 with `EphemerisResponse` (each body may still carry an error).
 * Failure:  4xx/5xx with `ApiErrorResponse`.
 *
 * Missing values stay `null` and failures stay explicit; nothing is replaced
 * with zero. All angles are degrees unless the field name says otherwise.
 */

import type { DataSource, ObserverSiteId } from './sites.js';

export const EPHEMERIS_ENDPOINT = '/api/ephemeris';

export const BODY_IDS = ['sun', 'earth'] as const;
export type BodyId = (typeof BODY_IDS)[number];

/** How the result was produced. A saved sample must never be presented as live. */
export type Provenance = 'live' | 'saved-sample';

export const API_ERROR_CODES = [
  /** Query parameters are missing or invalid. */
  'INVALID_REQUEST',
  /** HTTP method other than GET/HEAD. */
  'METHOD_NOT_ALLOWED',
  /** Horizons could not be reached, timed out, or reported overload/maintenance. */
  'UPSTREAM_UNAVAILABLE',
  /** Horizons answered but rejected the query or reported an error. */
  'UPSTREAM_REJECTED',
  /** Horizons answered with a payload this adapter cannot read safely. */
  'UPSTREAM_FORMAT',
  /** Unexpected failure inside this server. */
  'INTERNAL',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  readonly code: ApiErrorCode;
  /** Technical detail in English for logs and debugging. Not for direct UI display. */
  readonly detail: string;
}

export interface ApiErrorResponse {
  readonly error: ApiError;
}

/**
 * Raw Horizons sky-presence markers for one output row, kept verbatim so the
 * interface can explain them. See `shared/presence.ts` for their meaning.
 */
export interface HorizonsMarkers {
  /** '*' or ' ' for non-Earth observers. */
  readonly solarPresence: string;
  /** 'i', ' ', or an r/e/t/s event code for non-Earth observers. */
  readonly interferingBodyPresence: string;
}

export interface BodyObservation {
  readonly body: BodyId;
  /** Target name as printed by Horizons, e.g. "Sun (10)". */
  readonly targetName: string;
  /** Airless apparent azimuth, clockwise from local north (0=N, 90=E, 180=S, 270=W). */
  readonly azimuthDeg: number | null;
  /** Airless apparent elevation of the target center above the local reference plane. */
  readonly elevationDeg: number | null;
  /** Full equatorial angular diameter of the disk, arcseconds. */
  readonly angularDiameterArcsec: number | null;
  /** Observer-to-target range, astronomical units. Not shown in the main summary. */
  readonly rangeAu: number | null;
  /** Range rate, km/s; positive means moving away. Not shown in the main summary. */
  readonly rangeRateKmPerS: number | null;
  readonly markers: HorizonsMarkers;
  /** Name of the "interfering body" declared in the Horizons header, e.g. "EARTH". */
  readonly interferingBody: string | null;
}

export type BodyResult =
  | { readonly status: 'ok'; readonly observation: BodyObservation }
  | { readonly status: 'error'; readonly body: BodyId; readonly error: ApiError };

export interface EphemerisSite {
  /** Reference site id, or `custom` for user-entered coordinates. */
  readonly id: ObserverSiteId;
  readonly name: string;
  readonly latitudeDeg: number;
  readonly longitudeEastDeg: number;
  /** Observer height used in the query. 0 km on the Horizons reference sphere, not measured terrain. */
  readonly altitudeKm: number;
  /** Publication of the coordinates; `null` for user-entered coordinates. */
  readonly source: DataSource | null;
}

export interface HorizonsProvenance {
  readonly name: 'NASA/JPL Horizons API';
  readonly url: string;
  /** API `signature.version` returned with the response. */
  readonly apiVersion: string | null;
  /** Planetary ephemeris named in the Horizons header, e.g. "DE441". */
  readonly planetaryEphemeris: string | null;
  /** Lunar body-fixed frame named in the header, e.g. "MEAN_ME (high precision)". */
  readonly observerFrame: string | null;
  /** Instant this server received the response (ISO 8601 UTC). */
  readonly retrievedAt: string;
}

export interface EphemerisMethod {
  readonly ephemerisType: 'OBSERVER';
  /** Horizons observer-table quantity codes requested. 4=Az/El, 13=angular diameter, 20=range. */
  readonly quantities: readonly number[];
  readonly refraction: 'AIRLESS';
  readonly timeScale: 'UT';
  readonly terrainModeled: false;
}

export const WARNING_CODES = [
  /** Horizons returned an API version this adapter was not checked against. */
  'HORIZONS_API_VERSION_UNVERIFIED',
  /** At least one body could not be computed; see `bodies`. */
  'PARTIAL_RESULT',
] as const;
export type WarningCode = (typeof WARNING_CODES)[number];

export interface EphemerisResponse {
  readonly provenance: Provenance;
  readonly site: EphemerisSite;
  /** Requested instant, normalized to ISO 8601 UTC with seconds. */
  readonly requestedUtc: string;
  /** Instant printed in the Horizons table (UT; UTC after 1962), ISO 8601. */
  readonly ephemerisUtc: string | null;
  readonly bodies: { readonly [K in BodyId]: BodyResult };
  readonly source: HorizonsProvenance;
  readonly method: EphemerisMethod;
  readonly warnings: readonly WarningCode[];
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (API_ERROR_CODES as readonly string[]).includes((error as { code: string }).code)
  );
}
