/**
 * Cabeus Exterior Wall 1 terrain for the shared first-person view.
 *
 * Values from `public/terrain/cabeus-exterior-wall-1.metadata.json` and
 * `assets/terrain/cabeus-exterior-wall-1/README.md`: LRO/LOLA NPA 5 m/pixel
 * adjusted surface (`NPA_final_adj_5mpp_surf.tif`), MOON_ME / DE421, meters,
 * vertical scale 1:1. Shared projection conventions are in `siteTerrain.ts`.
 * This is the PGDA/Data Book reference point NPA, not an approved landing site.
 *
 * Like Amundsen Rim and Shackleton Rim, the mesh is camera-led: all 5 m
 * source samples within 35 m of projected (-88472.5, 29532.5) m survive,
 * followed by 10 m seeds to 150 m, 20 m seeds to 500 m, and a 100 m base
 * grid adaptively refined toward the viewer and skyline crest. The shared
 * 2.6 m camera ring stays inside the dense center and illustrative texture
 * (not lunar imagery), which fades to plain gray by 24 m.
 *
 * The 14 x 14 km crop is shifted 2.5 km grid-east and grid-south of the
 * saved point. Looking grid-north/northwest, the skyline is the crop edge,
 * not the top of the wall. Terrain beyond the NPA raster is unchecked.
 * This planar height field omits lunar curvature and cannot certify visibility.
 *
 * The view uses the astronaut support position, re-casts its height, and
 * keeps it upright facing the viewer rather than applying the saved tilt.
 * Initial gaze and lighting use the shared app rig and Sun direction, not
 * the illustrative Blender camera/light recorded in the asset metadata.
 */

import type { PolarTerrain } from './siteTerrain';

export const CABEUS_EXTERIOR_WALL_1_TERRAIN: PolarTerrain = {
  siteId: 'cabeus-exterior-wall-1',
  terrainUrl: '/terrain/cabeus-exterior-wall-1.glb',
  astronautUrl: '/terrain/astronaut.glb',
  // Metadata `origin`: radial height above the 1,737,400 m reference sphere.
  origin: { projectedXM: -88_501, projectedYM: 29_500, elevationM: -2229 },
  // Metadata `coverage.cropPixelOuterBoundsM`: [-93000, 20000, -79000, 34000] m.
  cropSizeKm: [14, 14],
  // Geographic north has grid bearing = east longitude (shared/sites.ts).
  northGridBearingDeg: -71.5651,
  // Metadata `astronaut.supportGlbM`; y is re-cast onto the mesh at runtime.
  astronautGlbPosition: [30.166667938232422, 1.3733724355697632, -35.833335876464844],
};
