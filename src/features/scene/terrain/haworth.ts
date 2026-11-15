/**
 * Haworth terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/haworth/README.md` and
 * `public/terrain/haworth.metadata.json`: LRO/LOLA Haworth 5 m/pixel adjusted
 * surface (`Haworth_final_adj_5mpp_surf.tif`). Shared conventions and limits
 * are in `siteTerrain.ts`. "Haworth" is the PGDA/Data Book reference point,
 * not a verified IAU crater center.
 *
 * Like Shackleton Rim and Amundsen Rim, the mesh is camera-led: it keeps every
 * 5 m source sample within 35 m of the near-detail center (projected
 * -37977.5 / 90507.5 m, next to the astronaut), then thins out with distance
 * (10 m to 150 m, 20 m to 500 m, then a 100 m base grid refined where the
 * surface changes, weighted toward the viewer and the massif crest that forms
 * the skyline). The astronaut and the viewer, who stands a few meters from it,
 * are inside the full-density area, and so is the 50 x 50 m illustrative
 * close-detail texture (not lunar imagery), which fades to plain gray past
 * 24 m.
 *
 * The crop is 12 x 14 km (grid east x grid north), larger than at the other
 * sites, and shifted grid-north/west so the massif north of the site is real
 * relief instead of the crop edge. The GLB origin is still the saved point,
 * rounded.
 *
 * The metadata tilts the astronaut 1.94 degrees to the local slope. The view
 * keeps only the horizontal position of that support point (about 26 m
 * grid-east-northeast of the saved point) and stands the figure upright,
 * facing the viewer, as at the other sites.
 */

import type { SiteTerrain } from './siteTerrain';

export const HAWORTH_TERRAIN: SiteTerrain = {
  siteId: 'haworth',
  terrainUrl: '/terrain/haworth.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: -38_000, projectedYM: 90_501, elevationM: 1629 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [-45500, 88500, -33500, 102500] m.
  cropSizeKm: [12, 14],
  // Geographic north along the meridian lies at grid bearing = east longitude: -22.777° = 337.223°.
  northGridBearingDeg: 337.223,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [24.166667938232422, -2.2790935039520264, -8.166666984558105],
};
