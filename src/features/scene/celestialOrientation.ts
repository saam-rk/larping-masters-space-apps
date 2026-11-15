/**
 * Orientation of the celestial GLB models (`public/models/celestial`, see
 * `assets/celestial-bodies/README.md`) in the third-person scene frame of
 * `geometry.ts` (-Z north, +X east, +Y up at the site; Moon center below).
 *
 * Model frame (glTF): +Y is the north pole, +X is latitude 0 / longitude 0 and
 * -Z is latitude 0 / longitude 90° E.
 *
 * - The Moon is oriented from the site coordinates, so the site of the result
 *   sits under the observer with the lunar north pole along the spin axis drawn
 *   in the real-scale view. The site is the only input: no libration.
 * - The Sun and the Earth only get their north pole along the lunar spin axis.
 *   This is an illustrative choice: their axes are tilted from the Moon's
 *   (the Earth's by roughly 25° at most), and neither the Earth's daily
 *   rotation nor the Sun's rotation is computed, so the longitude facing the
 *   viewer carries no meaning. Their phase comes from the scene lighting.
 */

import { Matrix4, Quaternion, Vector3 } from 'three';
import { horizontalToDirection } from './geometry';

const DEG = Math.PI / 180;
const MODEL_NORTH = new Vector3(0, 1, 0);

/** Model-frame unit vector of a planetocentric latitude / east longitude. */
export function modelDirection(latitudeDeg: number, longitudeEastDeg: number): Vector3 {
  const lat = latitudeDeg * DEG;
  const lon = longitudeEastDeg * DEG;
  return new Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
}

/** Lunar spin axis (toward the north pole) in the scene frame: azimuth 0, elevation = site latitude. */
export function lunarNorthAxis(latitudeDeg: number): Vector3 {
  return new Vector3(...horizontalToDirection(0, latitudeDeg));
}

/**
 * Rotation taking the Moon model to the scene: the site normal to +Y (up),
 * local east at the site to +X and local north to -Z.
 */
export function moonOrientation(latitudeDeg: number, longitudeEastDeg: number): Quaternion {
  const lat = latitudeDeg * DEG;
  const lon = longitudeEastDeg * DEG;
  const up = modelDirection(latitudeDeg, longitudeEastDeg);
  const east = new Vector3(-Math.sin(lon), 0, -Math.cos(lon));
  const north = new Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
  // Both bases are left-handed (east, up, north vs. +X, +Y, -Z), so the product is a proper rotation.
  const model = new Matrix4().makeBasis(east, up, north);
  const scene = new Matrix4().makeBasis(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, -1));
  return new Quaternion().setFromRotationMatrix(scene.multiply(model.transpose()));
}

/** Rotation that only points the model's north pole along the lunar spin axis (Sun and Earth, illustrative). */
export function northAlongLunarAxis(latitudeDeg: number): Quaternion {
  return new Quaternion().setFromUnitVectors(MODEL_NORTH, lunarNorthAxis(latitudeDeg));
}
