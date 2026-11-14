/**
 * Vercel Function: GET /api/ephemeris?site=<SiteId>&utc=<YYYY-MM-DDTHH:mm[:ss]Z>
 *
 * The browser cannot call Horizons directly (JPL's CORS policy), so it calls
 * this route. Logic lives in `server/`; this file is only the platform adapter.
 */

import { handleEphemerisRequest } from '../server/ephemeris/handler.js';

export function GET(request: Request): Promise<Response> {
  return handleEphemerisRequest(request);
}
