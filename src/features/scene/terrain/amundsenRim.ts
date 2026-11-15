/**
 * Amundsen Rim terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/amundsen-rim/README.md` and
 * `public/terrain/amundsen-rim.metadata.json`: LRO/LOLA DM1 5 m/pixel
 * adjusted surface (`DM1_final_adj_5mpp_surf.tif`). Shared conventions and
 * limits are in `siteTerrain.ts`.
 *
 * Like Shackleton Rim, the mesh is camera-led: it keeps every 5 m source
 * sample within 35 m of the near-detail center (projected 163991.5 /
 * 61481.5 m, next to the astronaut), then thins out with distance (10 m to
 * 150 m, 20 m to 500 m, then a 100 m base grid refined where the surface
 * changes, weighted toward the viewer and the visible crater-rim ridge). The
 * astronaut and the viewer, who stands a few meters from it, are inside the
 * full-density area, and so is the 50 x 50 m illustrative close-detail
 * texture (not lunar imagery), which fades to plain gray past 24 m.
 *
 * The 10 x 10 km crop is not centered on the site: it was shifted 2.5 km
 * grid-west so the west-southwest crest is inside the relief data instead of
 * on the crop edge. The GLB origin is still the saved point, rounded.
 *
 * The metadata tilts the astronaut 0.44 degrees to the local slope. The view
 * keeps only the horizontal position of that support point (about 21 m from
 * the saved point, on a gently undulating crest) and stands the figure
 * upright, facing the viewer, as at the other sites.
 */

import type { SiteTerrain } from './siteTerrain';

export const AMUNDSEN_RIM_TERRAIN: SiteTerrain = {
  siteId: 'amundsen-rim',
  terrainUrl: '/terrain/amundsen-rim.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: 164_000, projectedYM: 61_500, elevationM: 399 },
  // Geographic north along the meridian lies at grid bearing = east longitude (shared/sites.ts: 69.44396°).
  northGridBearingDeg: 69.44396,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [-9.166666984558105, -0.577850341796875, 19.166667938232422],
};
