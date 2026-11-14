/**
 * Computes Sun and Earth positions for one observer point (a reference site or
 * custom coordinates) and instant by
 * querying Horizons once per body. Each body succeeds or fails on its own;
 * failures stay explicit in the response.
 */

import {
  BODY_IDS,
  type BodyId,
  type BodyResult,
  type EphemerisMethod,
  type EphemerisResponse,
  type Provenance,
  type WarningCode,
} from '../../shared/ephemeris.js';
import { CUSTOM_SITE_ID, type ObserverSite } from '../../shared/sites.js';
import { toUtcIsoSeconds } from '../../shared/time.js';
import { fetchObserverTable, type HorizonsClientOptions, type ObserverTableResult } from '../horizons/client.js';
import { VERIFIED_HORIZONS_API_VERSIONS } from '../horizons/parse.js';
import { HORIZONS_API_URL, OBSERVER_QUANTITIES } from '../horizons/query.js';
import { TtlCache } from './cache.js';

/** Observer height: 0 km on the Horizons lunar reference sphere, not measured terrain. */
export const SITE_ALTITUDE_KM = 0;

export const EPHEMERIS_METHOD: EphemerisMethod = {
  ephemerisType: 'OBSERVER',
  quantities: OBSERVER_QUANTITIES,
  refraction: 'AIRLESS',
  timeScale: 'UT',
  terrainModeled: false,
};

export interface EphemerisServiceOptions {
  readonly horizons?: HorizonsClientOptions;
  /** Pass `null` to disable caching. */
  readonly cache?: TtlCache<EphemerisResponse> | null;
}

export function createDefaultCache(): TtlCache<EphemerisResponse> {
  return new TtlCache<EphemerisResponse>({ ttlMs: 6 * 60 * 60 * 1000, maxEntries: 500 });
}

export async function computeEphemeris(
  site: ObserverSite,
  instant: Date,
  options: EphemerisServiceOptions = {},
  signal?: AbortSignal,
): Promise<EphemerisResponse> {
  const place = site.id === CUSTOM_SITE_ID ? `${site.latitudeDeg},${site.longitudeEastDeg}` : site.id;
  const cacheKey = `${place}|${toUtcIsoSeconds(instant)}`;
  const cached = options.cache?.get(cacheKey);
  if (cached) return cached;

  const entries = await Promise.all(
    BODY_IDS.map(
      async (body) =>
        [
          body,
          await fetchObserverTable(
            {
              body,
              latitudeDeg: site.latitudeDeg,
              longitudeEastDeg: site.longitudeEastDeg,
              altitudeKm: SITE_ALTITUDE_KM,
              instant,
            },
            options.horizons,
            signal,
          ),
        ] as const,
    ),
  );
  const results = Object.fromEntries(entries) as Record<BodyId, ObserverTableResult>;

  const response = buildEphemerisResponse(site, instant, results, 'live');
  // Cache only complete results so a transient failure is retried next time.
  if (!response.warnings.includes('PARTIAL_RESULT')) {
    options.cache?.set(cacheKey, response);
  }
  return response;
}

/**
 * Pure assembly of the API response from per-body Horizons results. Also used
 * to derive the saved sample from the raw fixtures.
 */
export function buildEphemerisResponse(
  site: ObserverSite,
  instant: Date,
  results: Readonly<Record<BodyId, ObserverTableResult>>,
  provenance: Provenance,
): EphemerisResponse {
  const bodies = {} as Record<BodyId, BodyResult>;
  for (const body of BODY_IDS) {
    const result = results[body];
    bodies[body] = result.ok
      ? { status: 'ok', observation: result.table.observation }
      : { status: 'error', body, error: result.error };
  }

  const firstOk = BODY_IDS.map((body) => results[body]).find((result) => result.ok);
  const okTable = firstOk?.ok ? firstOk : undefined;

  const warnings: WarningCode[] = [];
  const apiVersion = okTable?.table.apiVersion ?? null;
  if (okTable && (apiVersion === null || !VERIFIED_HORIZONS_API_VERSIONS.includes(apiVersion))) {
    warnings.push('HORIZONS_API_VERSION_UNVERIFIED');
  }
  if (BODY_IDS.some((body) => !results[body].ok)) {
    warnings.push('PARTIAL_RESULT');
  }

  return {
    provenance,
    site: {
      id: site.id,
      name: site.name,
      latitudeDeg: site.latitudeDeg,
      longitudeEastDeg: site.longitudeEastDeg,
      altitudeKm: SITE_ALTITUDE_KM,
      source: site.source,
    },
    requestedUtc: toUtcIsoSeconds(instant),
    ephemerisUtc: okTable?.table.ephemerisUtc ?? null,
    bodies,
    source: {
      name: 'NASA/JPL Horizons API',
      url: HORIZONS_API_URL,
      apiVersion,
      planetaryEphemeris: okTable?.table.planetaryEphemeris ?? null,
      observerFrame: okTable?.table.observerFrame ?? null,
      retrievedAt: (okTable?.retrievedAt ?? new Date()).toISOString(),
    },
    method: EPHEMERIS_METHOD,
    warnings,
  };
}

export function allFailed(response: EphemerisResponse): boolean {
  return BODY_IDS.every((body) => response.bodies[body].status === 'error');
}
