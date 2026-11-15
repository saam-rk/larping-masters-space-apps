/**
 * Shackleton Rim terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/shackleton-rim/README.md` and
 * `public/terrain/shackleton-rim.metadata.json`: LRO/LOLA Site04 5 m/pixel
 * adjusted surface (`Site04_final_adj_5mpp_surf.tif`). Shared conventions and
 * limits are in `siteTerrain.ts`.
 *
 * Unlike the Nobile meshes, this one is camera-led: it keeps every 5 m source
 * sample within 35 m of the near-detail center (projected -1003.5 / -7038.5 m,
 * next to the astronaut), then thins out with distance (10 m to 150 m, 20 m
 * to 500 m, coarser beyond). The astronaut and the viewer, who stands a few
 * meters from it, are inside that full-density area, and so is the 50 x 50 m
 * illustrative close-detail texture (not lunar imagery), which fades to plain
 * gray past 24 m. Far relief still follows the source heights, with fewer
 * triangles.
 *
 * The metadata places the astronaut rigidly tilted to the local slope
 * (about 23 degrees). The view keeps only the horizontal position of that
 * support point and stands the figure upright, facing the viewer, as at the
 * other sites; the saved point lies on sloping ground near the rim, not on a
 * landing pad.
 */

import type { PolarTerrain } from './siteTerrain';

export const SHACKLETON_RIM_TERRAIN: PolarTerrain = {
  siteId: 'shackleton-rim',
  terrainUrl: '/terrain/shackleton-rim.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: -1000, projectedYM: -7000, elevationM: 770 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [-6000, -12000, 4000, -2000] m.
  cropSizeKm: [10, 10],
  // Geographic north along the meridian lies at grid bearing = east longitude: -171.87° = 188.13°.
  northGridBearingDeg: 188.13,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [-4.1666669845581055, -0.6942952871322632, 39.16666793823242],
};
