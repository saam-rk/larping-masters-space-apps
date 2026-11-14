/**
 * Turns an ephemeris result into what both 3D views draw for the Sun and the
 * Earth: direction (from the same azimuth/elevation as the results panel),
 * apparent angular diameter and observer range.
 *
 * Diameter and range come from the same Horizons row (quantities 13 and 20).
 * When Horizons omits them, nominal values are used and `nominalSize` /
 * `nominalRange` say so; a body without azimuth or elevation is not drawn.
 */

import { BODY_IDS, type BodyId, type EphemerisResponse } from '../../../shared/ephemeris';
import { horizontalToDirection, type Vector3Tuple } from './geometry';

/** IAU 2012 Resolution B2: astronomical unit, km. */
export const AU_KM = 149_597_870.7;
/** Mean lunar radius, km; the reference sphere of the LOLA terrain and of Horizons topocentric sites. */
export const MOON_RADIUS_KM = 1737.4;

/**
 * Fallbacks only when Horizons gives no diameter or range: IAU 2015
 * Resolution B3 nominal solar radius (695,700 km) and nominal equatorial
 * Earth radius (6,378.1 km); 1 au for the Sun and the mean Earth–Moon
 * distance (384,400 km) for the Earth.
 */
const NOMINAL: Readonly<Record<BodyId, { radiusKm: number; rangeKm: number }>> = {
  sun: { radiusKm: 695_700, rangeKm: AU_KM },
  earth: { radiusKm: 6378.1, rangeKm: 384_400 },
};

export interface SceneBody {
  readonly body: BodyId;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  /** Unit vector in the scene frame of `geometry.ts`. */
  readonly direction: Vector3Tuple;
  /** Full apparent angular diameter, degrees. */
  readonly angularDiameterDeg: number;
  /** Observer-to-body range, km. */
  readonly rangeKm: number;
  /** True when the angular diameter is a nominal value, not from Horizons. */
  readonly nominalSize: boolean;
  /** True when the range is a nominal value, not from Horizons. */
  readonly nominalRange: boolean;
}

export interface PlacedBodies {
  readonly placed: readonly SceneBody[];
  /** Bodies without azimuth or elevation: not drawn. */
  readonly missing: readonly BodyId[];
}

function positive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function placeBodies(data: EphemerisResponse): PlacedBodies {
  const placed: SceneBody[] = [];
  const missing: BodyId[] = [];
  for (const body of BODY_IDS) {
    const result = data.bodies[body];
    const observation = result.status === 'ok' ? result.observation : null;
    const az = observation?.azimuthDeg ?? null;
    const el = observation?.elevationDeg ?? null;
    if (observation === null || az === null || el === null) {
      missing.push(body);
      continue;
    }
    const nominal = NOMINAL[body];
    const rangeKm = positive(observation.rangeAu) ? observation.rangeAu * AU_KM : nominal.rangeKm;
    const angularDiameterDeg = positive(observation.angularDiameterArcsec)
      ? observation.angularDiameterArcsec / 3600
      : 2 * Math.atan(nominal.radiusKm / rangeKm) * (180 / Math.PI);
    placed.push({
      body,
      azimuthDeg: az,
      elevationDeg: el,
      direction: horizontalToDirection(az, el),
      angularDiameterDeg,
      rangeKm,
      nominalSize: !positive(observation.angularDiameterArcsec),
      nominalRange: !positive(observation.rangeAu),
    });
  }
  return { placed, missing };
}

/** Radius of a sphere at `distance` that subtends `angularDiameterDeg` (same units as `distance`). */
export function radiusForAngularDiameter(angularDiameterDeg: number, distance: number): number {
  return distance * Math.tan(((angularDiameterDeg / 2) * Math.PI) / 180);
}

/** True when the upper limb is above the geometric horizon plane. */
export function upperLimbAboveHorizon(body: SceneBody): boolean {
  return body.elevationDeg + body.angularDiameterDeg / 2 > 0;
}
