/**
 * Malapert Crater 1 terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `assets/terrain/malapert-crater-1/README.md` and
 * `public/terrain/malapert-crater-1.metadata.json`: LRO/LOLA NPD 5 m/pixel
 * adjusted surface (`NPD_final_adj_5mpp_surf.tif`). Shared conventions and
 * limits are in `siteTerrain.ts`. This is not Malapert Massif (R23/Site23).
 *
 * Like Amundsen Rim and Shackleton Rim, the mesh is camera-led: every 5 m
 * source sample within 35 m of the near-detail center (projected 22977.5 /
 * 155992.5 m) is retained, followed by 10 m seeds to 150 m, 20 m seeds to
 * 500 m, then a 150 m base grid with residual refinement. The astronaut and
 * the shared viewer ring stay inside the dense center and the full-detail
 * radius of the illustrative regolith texture (not lunar imagery).
 *
 * The 20 x 20 km crop covers the complete NPD raster. In some directions
 * the skyline is the truncated raster edge, not a real crest. The shared
 * viewer chooses its heading from the celestial bodies, not the asset's
 * saved Blender camera; no terrain-visibility guarantee is implied.
 *
 * The metadata tilts the astronaut 1.62 degrees to its support triangle.
 * As at the other polar sites, the view retains its horizontal support
 * position and re-casts the height, keeping the figure upright and facing
 * the viewer.
 */

import type { PolarTerrain } from './siteTerrain';

export const MALAPERT_CRATER_1_TERRAIN: PolarTerrain = {
  siteId: 'malapert-crater-1',
  terrainUrl: '/terrain/malapert-crater-1.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`.
  origin: { projectedXM: 23_000, projectedYM: 156_000, elevationM: -2267 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [13000, 146000, 33000, 166000] m.
  cropSizeKm: [20, 20],
  // Geographic north along the meridian lies at grid bearing = east longitude.
  northGridBearingDeg: 8.387032,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [-20.83333396911621, -0.860595703125, 4.1666669845581055],
};
