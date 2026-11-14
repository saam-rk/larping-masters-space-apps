/**
 * Vercel Function: GET /api/sky-search (inverse search; see
 * `shared/skySearch.ts` for the parameters).
 *
 * Logic lives in `server/skySearch/`; this file is only the platform adapter.
 */

import { handleSkySearchRequest } from '../server/skySearch/handler.js';

export function GET(request: Request): Promise<Response> {
  return handleSkySearchRequest(request);
}
