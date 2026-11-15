/**
 * Nobile Rim 2 terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `docs/research/site-terrain/nobile-rim-2/` (see its
 * README and `nobile-rim-2.metadata.json`): LRO/LOLA DM2 5 m/pixel adjusted
 * surface (`DM2_final_adj_5mpp_surf.tif`). Shared conventions and limits are
 * in `siteTerrain.ts`.
 */

import type { PolarTerrain } from './siteTerrain';

export const NOBILE_RIM_2_TERRAIN: PolarTerrain = {
  siteId: 'nobile-rim-2',
  terrainUrl: '/models/nobile-rim-2/nobile-rim-2.glb',
  astronautUrl: '/models/nobile-rim-2/astronaut.glb',
  // Metadata `localOrigin`: site projected X/Y and bilinear elevation rounded to whole meters.
  origin: { projectedXM: 157_000, projectedYM: 95_000, elevationM: 1010 },
  // Metadata `axes.geographicNorthGridBearingAtSiteDeg`.
  northGridBearingDeg: 58.82206,
  // 25 m grid-east of the site marker in the editable scene (`add_scale_astronaut.py`); y from the saved scene.
  astronautGlbPosition: [25.451965, 0.166, -0.253401],
};
