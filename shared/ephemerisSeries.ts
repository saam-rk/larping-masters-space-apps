/**
 * HTTP contract for `GET /api/ephemeris-series`, shared by the browser and the
 * server: the same Sun and Earth observations as `/api/ephemeris`, at
 * `count` equally spaced instants, so a horizon playback interval needs one
 * Horizons request per body instead of one per body and sample.
 *
 * Request:  GET /api/ephemeris-series?site=<SiteId>&start=<ISO UTC>&step=<minutes>&count=<n>
 *      or:  GET /api/ephemeris-series?lat=<deg>&lon=<deg east>&start=...&step=...&count=...
 * Samples:  start + i * step minutes, i = 0 .. count - 1 (both ends included).
 * Success:  200 with `EphemerisSeriesResponse` (each frame may still carry a body error).
 * Failure:  4xx/5xx with `ApiErrorResponse`.
 */

import type { EphemerisResponse } from './ephemeris.js';

export const EPHEMERIS_SERIES_ENDPOINT = '/api/ephemeris-series';

/** Samples per request; longer intervals are requested in consecutive chunks. */
export const SERIES_MIN_COUNT = 2;
export const SERIES_MAX_COUNT = 100;
/** Step limits, whole minutes (one minute to 366 days). */
export const SERIES_MIN_STEP_MINUTES = 1;
export const SERIES_MAX_STEP_MINUTES = 366 * 24 * 60;

export interface EphemerisSeriesResponse {
  /** One frame per sample, in time order; each is built exactly like an `/api/ephemeris` response. */
  readonly frames: readonly EphemerisResponse[];
}
