/** Uniform circular solar disk approximation; fractions are not irradiance. */
import { Box3, Matrix4, Vector3 } from 'three';
import type { SceneBody } from './bodies';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { observerAltitudeKm, terrainObserver } from '../../../shared/observer';

/** Saved sphere samples are not silently reinterpreted as surface observations. */
export function surfaceSnapshotReady(data: EphemerisResponse): boolean {
  return terrainObserver(data.site) !== null
    && Math.abs(data.site.altitudeKm - observerAltitudeKm(data.site)) < 1e-9
    && data.ephemerisUtc !== null && Date.parse(data.ephemerisUtc) === Date.parse(data.requestedUtc)
    && data.source.observerFrame === 'MEAN_ME (high precision)'
    && data.source.planetaryEphemeris === 'DE441'
    && data.method.refraction === 'AIRLESS' && data.method.timeScale === 'UT'
    && !data.warnings.includes('HORIZONS_API_VERSION_UNVERIFIED');
}

const RAD = Math.PI / 180;
const clamp = (x: number) => Math.max(-1, Math.min(1, x));

/** Circular segment above a straight horizon, all angles in degrees. */
export function diskAboveHorizon(elevation: number, radius: number, horizon = 0): number {
  if (![elevation, radius, horizon].every(Number.isFinite) || radius <= 0) throw new RangeError('Invalid solar disk');
  const q = clamp((elevation - horizon) / radius);
  return (Math.acos(-q) + q * Math.sqrt(Math.max(0, 1 - q * q))) / Math.PI;
}

/** Planar angular-circle overlap, using spherical separation of apparent centers. */
export function eclipseTransmission(sun: SceneBody, earth: SceneBody): number {
  if (earth.rangeKm >= sun.rangeKm) return 1;
  const a = sun.angularDiameterDeg / 2;
  const b = earth.angularDiameterDeg / 2;
  const u = new Vector3(...sun.direction);
  const v = new Vector3(...earth.direction);
  const d = Math.atan2(u.clone().cross(v).length(), u.dot(v)) / RAD;
  if (d >= a + b) return 1;
  if (d <= Math.abs(a - b)) return b >= a ? 0 : 1 - b * b / (a * a);
  const area = a * a * Math.acos(clamp((d * d + a * a - b * b) / (2 * d * a)))
    + b * b * Math.acos(clamp((d * d + b * b - a * a) / (2 * d * b)))
    - 0.5 * Math.sqrt(Math.max(0, (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)));
  return Math.max(0, Math.min(1, 1 - area / (Math.PI * a * a)));
}

export function solarLightingState(bodies: readonly SceneBody[]) {
  const sun = bodies.find((body) => body.body === 'sun');
  const earth = bodies.find((body) => body.body === 'earth');
  const valid = (body: SceneBody | undefined): body is SceneBody => !!body
    && !body.nominalSize && !body.nominalRange
    && [body.azimuthDeg, body.elevationDeg, body.angularDiameterDeg, body.rangeKm, ...body.direction].every(Number.isFinite)
    && body.angularDiameterDeg > 0 && body.rangeKm > 0;
  const known = valid(sun) && valid(earth);
  const transmission = known ? eclipseTransmission(sun, earth) : null;
  // Horizon and terrain are evaluated at each receiver, never at the camera.
  return { known, sun, earth, transmission, intensity: known && transmission !== 0 ? 3.2 : 0 };
}

/** Conservative crop-wide orthographic coverage including remote ridge casters. */
export const LOCAL_SHADOW_HALF_SIZE_M = 128;

export function shadowCoverage(bounds: Box3, direction: Vector3, local = false) {
  const cropCenter = bounds.getCenter(new Vector3());
  const center = local ? new Vector3() : cropCenter;
  const radius = Math.max(10, bounds.getSize(new Vector3()).length() / 2 + cropCenter.distanceTo(center));
  const halfSize = local ? LOCAL_SHADOW_HALF_SIZE_M : radius + 10;
  const position = center.clone().addScaledVector(direction, 2 * radius + 20);
  const view = new Matrix4().lookAt(position, center, new Vector3(0, 1, 0));
  view.setPosition(position).invert();
  return { center, position, view, halfSize, near: 1, far: 4 * radius + 40, mapSize: local ? 2048 : 4096 };
}
