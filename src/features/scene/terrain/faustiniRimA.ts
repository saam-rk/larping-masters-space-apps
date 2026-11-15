/**
 * Faustini Rim A terrain and scale-reference assets for the first-person view.
 *
 * Values from `public/terrain/faustini-rim-a.metadata.json` and
 * `assets/terrain/faustini-rim-a/README.md`: LRO/LOLA LM7 5 m/pixel adjusted
 * surface (`LM7_final_adj_5mpp_surf.tif`), MOON_ME / DE421, meters, vertical
 * scale 1:1. Shared projection conventions and limits are in `siteTerrain.ts`.
 * This is the PGDA/Data Book reference point LM7, not an approved landing site.
 *
 * Like Amundsen Rim and Shackleton Rim, the mesh is camera-led: all 5 m
 * source samples within 35 m of projected (63977.5, -37.5) m are preserved,
 * followed by 10 m seeds to 150 m, 20 m seeds to 500 m, and a 100 m base grid
 * with adaptive refinement toward the viewer and the skyline crest. The
 * 50 x 50 m close-detail texture is illustrative, not lunar imagery; it fades
 * to plain gray by 24 m. The shared camera rig stands 2.6 m from the astronaut,
 * keeping the viewer inside the full-density area at every initial bearing.
 *
 * The 12 x 12 km crop is shifted 1 km grid-east and 2 km grid-south of the
 * saved point to retain the highland skyline. It includes neither Faustini's
 * floor nor its far rim; terrain beyond the LM7 raster is unchecked. The GLB
 * origin remains the rounded saved point.
 *
 * The view uses the metadata's astronaut support position (about 40 m from
 * the saved point), re-casts its height on the mesh, and keeps the figure
 * upright facing the viewer rather than applying the saved 2.03-degree tilt.
 * Camera orientation and lighting follow the shared app rig and Sun direction,
 * not the illustrative Blender camera/light stored in the metadata.
 */

import type { PolarTerrain } from './siteTerrain';

export const FAUSTINI_RIM_A_TERRAIN: PolarTerrain = {
  siteId: 'faustini-rim-a',
  terrainUrl: '/terrain/faustini-rim-a.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin` (radial height above the 1,737,400 m reference sphere).
  origin: { projectedXM: 63_999, projectedYM: 0, elevationM: 47 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [59000, -8000, 71000, 4000] m.
  cropSizeKm: [12, 12],
  // Geographic north lies at grid bearing = east longitude (shared/sites.ts).
  northGridBearingDeg: 90,
  // Metadata `astronaut.supportGlbM` (y is re-cast onto the terrain at runtime).
  astronautGlbPosition: [-18.166667938232422, -0.30420055985450745, 35.833335876464844],
};
