/**
 * Vercel Function: GET /api/ephemeris-series?site=<SiteId>&start=<ISO UTC>&step=<minutes>&count=<n>
 * (or ?lat=<deg>&lon=<deg east>&... for a custom point). Contract in
 * `shared/ephemerisSeries.ts`; logic in `server/ephemeris/series.ts`.
 */

import { handleEphemerisSeriesRequest } from '../server/ephemeris/series.js';

export function GET(request: Request): Promise<Response> {
  return handleEphemerisSeriesRequest(request);
}
