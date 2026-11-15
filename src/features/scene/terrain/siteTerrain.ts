/**
 * Terrain models for the first-person view, one per reference site, and the
 * shared projection helpers.
 *
 * Every model is a 10 x 10 km crop of NASA GSFC PGDA product 78 (LRO/LOLA
 * 5 m/pixel adjusted surface), south polar stereographic projection on a
 * 1,737,400 m sphere, MOON_ME/DE421 frame, meters, vertical exaggeration 1:1.
 * Per-site values come from each model's README and metadata (see
 * `nobileRim1.ts`, `nobileRim2.ts`, `shackletonRim.ts` and `amundsenRim.ts`).
 * Mesh density differs by model: Shackleton Rim and Amundsen Rim are densest
 * around the viewer and coarser toward the crop edges.
 *
 * GLB axes: x = X - X0 (grid east), y = h - h0 (radial height), z = -(Y - Y0).
 * Projected +Y is grid north, not geographic north: at a site of east
 * longitude L, geographic north (away from the pole, along the meridian)
 * lies at grid bearing L.
 *
 * The projected plane has no lunar curvature correction. The lighting in the
 * view is illustrative and the mesh is not a visibility, power,
 * communications or landing-suitability analysis.
 */

import type { SiteId } from '../../../../shared/sites';
import type { Vector3Tuple } from '../geometry';

/** Reference sphere radius of the projection and of the heights, meters. */
export const SPHERE_RADIUS_M = 1_737_400;

/** Height of the astronaut scale figure (all models), meters. */
export const ASTRONAUT_HEIGHT_M = 1.7;

export interface SiteTerrain {
  readonly siteId: SiteId;
  /** Terrain-only GLB (served from `public/`). */
  readonly terrainUrl: string;
  /**
   * Astronaut GLB. Its root transform (if any) is discarded: the view places
   * the figure itself, soles on the terrain, facing the viewer.
   */
  readonly astronautUrl: string;
  /** Local origin of the GLB: projected X/Y (m) and radial elevation (m). */
  readonly origin: { readonly projectedXM: number; readonly projectedYM: number; readonly elevationM: number };
  /** Grid bearing of geographic north at the site, degrees (equals its east longitude). */
  readonly northGridBearingDeg: number;
  /** Horizontal astronaut position in GLB coordinates (y is re-cast onto the terrain at runtime). */
  readonly astronautGlbPosition: Vector3Tuple;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * South polar stereographic projection (sphere, lat_0=-90, lon_0=0, k=1),
 * as in the terrain metadata `markerPlacement`. Returns projected X/Y in
 * meters.
 */
export function projectSouthPolar(latitudeDeg: number, longitudeEastDeg: number): { x: number; y: number } {
  const rho = 2 * SPHERE_RADIUS_M * Math.tan(Math.PI / 4 + (latitudeDeg * DEG_TO_RAD) / 2);
  const lon = longitudeEastDeg * DEG_TO_RAD;
  return { x: rho * Math.sin(lon), y: rho * Math.cos(lon) };
}

/** GLB coordinates of a projected point at `heightM` radial elevation. */
export function projectedToGlb(terrain: SiteTerrain, x: number, y: number, heightM: number): Vector3Tuple {
  const { origin } = terrain;
  return [x - origin.projectedXM, heightM - origin.elevationM, -(y - origin.projectedYM)];
}

/**
 * Rotation about the vertical axis (three.js `rotation.y`, radians) that
 * turns the GLB grid into the scene frame of `geometry.ts` (-Z geographic
 * north, +X east). A positive three.js yaw lowers grid bearings, so rotating
 * by the north bearing brings geographic north to bearing 0.
 */
export function terrainYawRad(terrain: SiteTerrain): number {
  return terrain.northGridBearingDeg * DEG_TO_RAD;
}

/** Applies `terrainYawRad` to a GLB-frame vector (same formula as three.js). */
export function glbToSceneDirection(terrain: SiteTerrain, [x, y, z]: Vector3Tuple): Vector3Tuple {
  const yaw = terrainYawRad(terrain);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, y, -x * s + z * c];
}
