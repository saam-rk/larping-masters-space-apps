/**
 * Angle guides of the third-person visual scale: azimuth and elevation arcs
 * per body and the Sun–Earth differences. Pure geometry on the azimuth and
 * elevation shown in the results panel (no new data): the angular separation
 * is the great-circle distance between both directions (haversine form,
 * well conditioned for small angles).
 *
 * Scene frame and azimuth convention as in `geometry.ts`. Kept free of
 * three.js imports so it can be tested.
 */

import { horizontalToDirection, horizontalToPosition, type Vector3Tuple } from './geometry';

const DEG_TO_RAD = Math.PI / 180;

/** Azimuth in [0, 360). */
export function normalizeAzimuth(azimuthDeg: number): number {
  const wrapped = azimuthDeg % 360;
  const positive = wrapped < 0 ? wrapped + 360 : wrapped;
  // A tiny negative input rounds up to exactly 360.
  return positive >= 360 ? 0 : positive;
}

/** Signed shortest turn from `fromDeg` to `toDeg`, in (-180, 180]; positive is clockwise (toward east). */
export function azimuthDifferenceDeg(fromDeg: number, toDeg: number): number {
  const difference = normalizeAzimuth(toDeg - fromDeg);
  return difference > 180 ? difference - 360 : difference;
}

export interface Horizontal {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
}

/** Great-circle angle between two horizontal directions, degrees in [0, 180]. */
export function angularSeparationDeg(a: Horizontal, b: Horizontal): number {
  const el1 = a.elevationDeg * DEG_TO_RAD;
  const el2 = b.elevationDeg * DEG_TO_RAD;
  const halfDel = (el2 - el1) / 2;
  const halfDaz = (azimuthDifferenceDeg(a.azimuthDeg, b.azimuthDeg) * DEG_TO_RAD) / 2;
  const h = Math.sin(halfDel) ** 2 + Math.cos(el1) * Math.cos(el2) * Math.sin(halfDaz) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG_TO_RAD;
}

/** Number of segments for an arc of `sweepDeg`: about one per 2°, at least 2. */
function segments(sweepDeg: number): number {
  return Math.max(2, Math.ceil(Math.abs(sweepDeg) / 2));
}

/** Arc on the horizon plane at `radius`, from `fromAzimuthDeg` turning `sweepDeg` (positive clockwise). */
export function azimuthArc(fromAzimuthDeg: number, sweepDeg: number, radius: number): Vector3Tuple[] {
  const steps = segments(sweepDeg);
  return Array.from({ length: steps + 1 }, (_, i) => horizontalToPosition(fromAzimuthDeg + (sweepDeg * i) / steps, 0, radius));
}

/** Vertical arc at `radius` along the azimuth, from the horizon (elevation 0) to `elevationDeg`. */
export function elevationArc(azimuthDeg: number, elevationDeg: number, radius: number): Vector3Tuple[] {
  return verticalArc(azimuthDeg, 0, elevationDeg, radius);
}

function verticalArc(azimuthDeg: number, fromDeg: number, toDeg: number, radius: number): Vector3Tuple[] {
  const steps = segments(toDeg - fromDeg);
  return Array.from({ length: steps + 1 }, (_, i) =>
    horizontalToPosition(azimuthDeg, fromDeg + ((toDeg - fromDeg) * i) / steps, radius),
  );
}

/**
 * Great-circle arc at `radius` between two horizontal directions (spherical
 * linear interpolation). For opposite directions the arc is not unique; it
 * then passes through the zenith.
 */
export function separationArc(a: Horizontal, b: Horizontal, radius: number): Vector3Tuple[] {
  const p = horizontalToDirection(a.azimuthDeg, a.elevationDeg);
  const q = horizontalToDirection(b.azimuthDeg, b.elevationDeg);
  const omega = angularSeparationDeg(a, b) * DEG_TO_RAD;
  const steps = segments(omega / DEG_TO_RAD);
  const sinOmega = Math.sin(omega);
  if (sinOmega < 1e-9) {
    if (omega < 1) return [scale(p, radius), scale(q, radius)];
    // Opposite directions: go over the zenith.
    return [
      ...verticalArc(a.azimuthDeg, a.elevationDeg, 90, radius),
      ...verticalArc(b.azimuthDeg, 90, b.elevationDeg, radius).slice(1),
    ];
  }
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const wp = Math.sin((1 - t) * omega) / sinOmega;
    const wq = Math.sin(t * omega) / sinOmega;
    return [(wp * p[0] + wq * q[0]) * radius, (wp * p[1] + wq * q[1]) * radius, (wp * p[2] + wq * q[2]) * radius];
  });
}

/** Middle point of a polyline by index (good enough for evenly sampled arcs). */
export function midpoint(points: readonly Vector3Tuple[]): Vector3Tuple {
  if (points.length % 2 === 1) return points[(points.length - 1) / 2]!;
  const a = points[points.length / 2 - 1]!;
  const b = points[points.length / 2]!;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

/** Circular mean of azimuths, degrees in [0, 360); 0 for an empty list or cancelling directions. */
export function meanAzimuthDeg(azimuthsDeg: readonly number[]): number {
  let x = 0;
  let y = 0;
  for (const az of azimuthsDeg) {
    x += Math.cos(az * DEG_TO_RAD);
    y += Math.sin(az * DEG_TO_RAD);
  }
  if (Math.hypot(x, y) < 1e-9) return 0;
  return normalizeAzimuth(Math.atan2(y, x) / DEG_TO_RAD);
}

function scale(v: Vector3Tuple, s: number): Vector3Tuple {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Vertical exaggeration factors of the visual scale. Near the lunar poles the
 * Sun and the Earth stay within a few degrees of the horizon, too low to read
 * on a dome, so the drawn elevation is stretched by one of these factors.
 */
export const ELEVATION_EXAGGERATIONS = [1, 2, 3, 5, 10] as const;
/** The highest body should be drawn at least this high, degrees (when the largest factor allows it). */
const TARGET_DRAWN_ELEVATION_DEG = 35;

/** Largest listed factor that keeps the highest |elevation| drawn at or below the target; 1 when bodies are already high. */
export function elevationExaggeration(elevationsDeg: readonly number[]): number {
  if (elevationsDeg.length === 0) return 1;
  const highest = Math.min(89.9, Math.max(...elevationsDeg.map((el) => Math.abs(el))));
  const wanted = Math.tan(TARGET_DRAWN_ELEVATION_DEG * DEG_TO_RAD) / Math.tan(Math.max(highest, 1e-6) * DEG_TO_RAD);
  return ELEVATION_EXAGGERATIONS.filter((factor) => factor <= wanted).at(-1) ?? 1;
}

/**
 * Drawn elevation for a vertical stretch by `factor`: the direction's height
 * is multiplied by `factor` before renormalizing, so 0° and ±90° stay put and
 * the order of elevations is kept. Azimuth is unchanged.
 */
export function exaggerateElevation(elevationDeg: number, factor: number): number {
  const el = elevationDeg * DEG_TO_RAD;
  return Math.atan2(factor * Math.sin(el), Math.cos(el)) / DEG_TO_RAD;
}
