/**
 * Nobile Rim 1 terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/nobile-rim-1/README.md` and
 * `public/terrain/nobile-rim-1.metadata.json`: LRO/LOLA Site06 5 m/pixel
 * adjusted surface (`Site06_final_adj_5mpp_surf.tif`). Shared conventions and
 * limits are in `siteTerrain.ts`.
 *
 * The astronaut GLB carries its placement in its root transform (9 m forward
 * and 3 m left of the Blender ground camera). The view keeps that horizontal
 * position but drops the root transform and places the figure itself, as for
 * Nobile Rim 2, so it is not added twice.
 */

import type { PolarTerrain } from './siteTerrain';

export const NOBILE_RIM_1_TERRAIN: PolarTerrain = {
  siteId: 'nobile-rim-1',
  terrainUrl: '/terrain/nobile-rim-1.glb',
  astronautUrl: '/terrain/nobile-rim-1.astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: 84_000, projectedYM: 110_000, elevationM: 5900 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [78940, 106870, 88940, 116870] m.
  cropSizeKm: [10, 10],
  // Geographic north along the meridian lies at grid bearing = east longitude (shared/sites.ts: 37.36667°).
  northGridBearingDeg: 37.36667,
  // Metadata `scaleReference.glbPositionM`.
  astronautGlbPosition: [-3.2741570472717285, 47.110107421875, -8.91102409362793],
};
