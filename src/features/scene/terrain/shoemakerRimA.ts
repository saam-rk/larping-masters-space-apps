/**
 * Shoemaker Rim A terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/shoemaker-rim-a/README.md` and
 * `public/terrain/shoemaker-rim-a.metadata.json`: LRO/LOLA LM2 5 m/pixel
 * adjusted surface (`LM2_final_adj_5mpp_surf.tif`). Shared conventions and
 * limits are in `siteTerrain.ts`. "Shoemaker Rim A" is the PGDA/Data Book
 * reference point LM2, not a verified IAU feature or an approved landing site.
 *
 * Like Shackleton Rim, Amundsen Rim and Haworth, the mesh is camera-led: it
 * keeps every 5 m source sample within 35 m of the near-detail center
 * (projected 11997.5 / 57042.5 m, next to the astronaut), then thins out with
 * distance (10 m to 150 m, 20 m to 500 m, then a 100 m base grid refined where
 * the surface changes, weighted toward the viewer and the grid-southwest crest
 * that forms the far skyline). The astronaut and the viewer, who stands a few
 * meters from it, are inside the full-density area, and so is the 50 x 50 m
 * illustrative close-detail texture (not lunar imagery), which fades to plain
 * gray past 24 m.
 *
 * The crop is 12 x 12 km, shifted 2 km grid-west and 2 km grid-south of the
 * saved point so the crests seen toward the pole (3.1-3.6 km and 6.1-6.8 km
 * away) are real relief instead of the crop edge. It omits a low rise about
 * 11.6-12 km grid-southwest, near the LM2 raster edge, that a planar raster
 * scan places up to about 0.5 degrees above the modeled skyline at grid
 * bearings 232-236 degrees. The saved point lies on the outer slope of the
 * Shoemaker rim region (about 6-7 degrees, rising grid-southeast); the crop
 * includes neither Shoemaker crater nor its interior. The GLB origin is still
 * the saved point, rounded.
 *
 * The metadata tilts the astronaut 5.05 degrees to the local slope. The view
 * keeps only the horizontal position of that support point (about 43 m
 * grid-north of the saved point, in the gentlest 25 m window found within
 * 45 m, chosen for scale-figure footing, not landing suitability) and stands
 * the figure upright, facing the viewer, as at the other sites.
 */

import type { PolarTerrain } from './siteTerrain';

export const SHOEMAKER_RIM_A_TERRAIN: PolarTerrain = {
  siteId: 'shoemaker-rim-a',
  terrainUrl: '/terrain/shoemaker-rim-a.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: 12_000, projectedYM: 57_001, elevationM: -620 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [4000, 49000, 16000, 61000] m.
  cropSizeKm: [12, 12],
  // Geographic north along the meridian lies at grid bearing = east longitude (shared/sites.ts: 11.88866°).
  northGridBearingDeg: 11.88866,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [-0.8333333730697632, -3.66143798828125, -43.16666793823242],
};
