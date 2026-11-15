/**
 * Sites with a terrain model for the first-person view. Kept free of three.js
 * imports so `viewMode.ts` can use it outside the lazily loaded scene chunk.
 */

import type { ObserverSiteId } from '../../../../shared/sites';
import { AMUNDSEN_RIM_TERRAIN } from './amundsenRim';
import { NOBILE_RIM_1_TERRAIN } from './nobileRim1';
import { NOBILE_RIM_2_TERRAIN } from './nobileRim2';
import { SHACKLETON_RIM_TERRAIN } from './shackletonRim';
import type { SiteTerrain } from './siteTerrain';

export const SITE_TERRAINS: readonly SiteTerrain[] = [
  NOBILE_RIM_1_TERRAIN,
  NOBILE_RIM_2_TERRAIN,
  SHACKLETON_RIM_TERRAIN,
  AMUNDSEN_RIM_TERRAIN,
];

/** Terrain model of a site, or null when the site has none (custom points included). */
export function terrainForSite(siteId: ObserverSiteId): SiteTerrain | null {
  return SITE_TERRAINS.find((model) => model.siteId === siteId) ?? null;
}
