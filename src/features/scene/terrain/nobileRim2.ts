/**
 * Nobile Rim 2 terrain and scale-reference assets for the first-person view.
 *
 * Values copied from `docs/research/site-terrain/nobile-rim-2/` (see its
 * README and `nobile-rim-2.metadata.json`): NASA GSFC PGDA product 78,
 * LRO/LOLA DM2 5 m/pixel adjusted surface, south polar stereographic
 * projection on a 1,737,400 m sphere, MOON_ME/DE421 frame. The GLB is a
 * 10 x 10 km crop in meters, vertical exaggeration 1:1.
 *
 * GLB axes: x = X - X0 (grid east), y = h - h0 (radial height), z = -(Y - Y0).
 * Projected +Y is grid north, not geographic north: at the site, geographic
 * north lies at grid bearing `GEOGRAPHIC_NORTH_GRID_BEARING_DEG`.
 *
 * The projected plane has no lunar curvature correction. The lighting in the
 * view is illustrative and the mesh is not a visibility, power,
 * communications or landing-suitability analysis.
 */

import type { Vector3Tuple } from '../geometry';

export const NOBILE_RIM_2_TERRAIN_URL = '/models/nobile-rim-2/nobile-rim-2.glb';
export const ASTRONAUT_URL = '/models/nobile-rim-2/astronaut.glb';

/** Reference sphere radius of the projection and of the heights, meters. */
export const SPHERE_RADIUS_M = 1_737_400;

/** Local origin of the GLB: projected X/Y (m) and radial elevation (m). */
export const LOCAL_ORIGIN = { projectedXM: 157_000, projectedYM: 95_000, elevationM: 1010 } as const;

/** Grid bearing of geographic north at the site (equals its east longitude). */
export const GEOGRAPHIC_NORTH_GRID_BEARING_DEG = 58.82206;

/** Mesh extent in GLB x (grid east) and grid north offsets, meters. */
export const MESH_HALF_EXTENT_M = 5000;

/**
 * The astronaut is a 1.70 m illustrative scale figure placed 25 m grid-east
 * of the site marker in the editable scene (`add_scale_astronaut.py`). Its
 * soles are at the origin of `astronaut.glb`, Y up, visor facing +Z.
 */
export const ASTRONAUT_HEIGHT_M = 1.7;
/** Astronaut position in GLB coordinates (y from the saved scene; re-cast at runtime). */
export const ASTRONAUT_GLB_POSITION: Vector3Tuple = [25.451965, 0.166, -0.253401];

const DEG_TO_RAD = Math.PI / 180;

/**
 * South polar stereographic projection (sphere, lat_0=-90, lon_0=0, k=1),
 * as in the terrain metadata `markerPlacement.steps`. Returns projected X/Y
 * in meters.
 */
export function projectSouthPolar(latitudeDeg: number, longitudeEastDeg: number): { x: number; y: number } {
  const rho = 2 * SPHERE_RADIUS_M * Math.tan(Math.PI / 4 + (latitudeDeg * DEG_TO_RAD) / 2);
  const lon = longitudeEastDeg * DEG_TO_RAD;
  return { x: rho * Math.sin(lon), y: rho * Math.cos(lon) };
}

/** GLB coordinates of a projected point at `heightM` radial elevation. */
export function projectedToGlb(x: number, y: number, heightM: number): Vector3Tuple {
  return [x - LOCAL_ORIGIN.projectedXM, heightM - LOCAL_ORIGIN.elevationM, -(y - LOCAL_ORIGIN.projectedYM)];
}

/**
 * Rotation about the vertical axis (three.js `rotation.y`, radians) that
 * turns the GLB grid into the scene frame of `geometry.ts` (-Z geographic
 * north, +X east). A positive three.js yaw lowers grid bearings, so rotating
 * by the north bearing brings geographic north to bearing 0.
 */
export const TERRAIN_YAW_RAD = GEOGRAPHIC_NORTH_GRID_BEARING_DEG * DEG_TO_RAD;

/** Applies `TERRAIN_YAW_RAD` to a GLB-frame vector (same formula as three.js). */
export function glbToSceneDirection([x, y, z]: Vector3Tuple): Vector3Tuple {
  const c = Math.cos(TERRAIN_YAW_RAD);
  const s = Math.sin(TERRAIN_YAW_RAD);
  return [x * c + z * s, y, -x * s + z * c];
}
