/**
 * Elevation of the assumed horizon beyond the edge of a terrain crop, per
 * azimuth, for the first-person view.
 *
 * The terrain model is a 10 x 10 km crop (12 x 14 km at Haworth, 12 x 12 km
 * at Shoemaker Rim A); there is no relief data beyond it.
 * The view used to hide everything below the eye's horizontal plane
 * (elevation 0) with a dark "floor". Where the terrain falls away from the
 * viewer (a rim), that hid the parts of the Sun or the Earth that sit between
 * the green line and the actual relief. The floor is now depth-only: it hides
 * the Sun and the Earth below this assumed horizon, but the star background
 * shows through it.
 *
 * Assumption (illustrative, not terrain data): beyond the crop, the ground
 * continues as a smooth sphere of the reference radius passing through the
 * crop edge in that direction. Seen from the eye, the highest point of that
 * surface is the classic dip of the horizon for the eye's height above it,
 * `sqrt(2 H / R)`, or the edge itself when the edge is closer than the
 * tangent point. The eye height (1.60 m above the local ground) is part of H.
 * Real relief beyond the crop can block more or less than this.
 *
 * Heights are relative to the eye in the flat scene frame; the crop itself is
 * a projected height field without curvature, so the drop is only applied
 * beyond the edge. Parabolic sphere drop d^2 / (2R) (error < 1e-6 relative at
 * these distances).
 */

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Highest elevation angle (degrees, at most 0) of the smooth continuation
 * beyond a crop edge that is `edgeDistanceM` away horizontally and
 * `edgeHeightM` above (positive) or below (negative) the eye.
 */
export function beyondEdgeElevationDeg(edgeHeightM: number, edgeDistanceM: number, radiusM: number): number {
  if (!(edgeDistanceM > 0)) return 0;
  // y(d) = edgeHeight - (d^2 - d0^2) / 2R; elevation tangent f(d) = y(d) / d = C / d - d / 2R.
  const c = edgeHeightM + (edgeDistanceM * edgeDistanceM) / (2 * radiusM);
  let tangent = edgeHeightM / edgeDistanceM;
  if (c < 0) {
    // f has its maximum at the tangent point d* = sqrt(-2 R C), if that lies beyond the edge.
    const tangentPoint = Math.sqrt(-2 * radiusM * c);
    if (tangentPoint > edgeDistanceM) tangent = -Math.sqrt((-2 * c) / radiusM);
  }
  return Math.min(0, Math.atan(tangent) * RAD_TO_DEG);
}

/** A terrain sample relative to the eye: azimuth (deg, clockwise from north), horizontal distance and height (m). */
export interface HorizonSample {
  readonly azimuthDeg: number;
  readonly distanceM: number;
  readonly heightM: number;
}

/**
 * Assumed horizon elevation for `bins` equal azimuth sectors (sector i
 * centered on `i * 360 / bins`). Each sector uses its farthest sample as the
 * crop edge. Empty sectors take the value of the nearest filled one; with no
 * samples at all, every sector is 0 (the geometric horizon).
 */
export function horizonProfile(samples: Iterable<HorizonSample>, bins: number, radiusM: number): number[] {
  const width = 360 / bins;
  const farthest: (HorizonSample | null)[] = Array.from({ length: bins }, () => null);
  for (const sample of samples) {
    if (!Number.isFinite(sample.azimuthDeg) || !Number.isFinite(sample.distanceM) || !Number.isFinite(sample.heightM)) continue;
    const bin = Math.round((((sample.azimuthDeg % 360) + 360) % 360) / width) % bins;
    const current = farthest[bin];
    if (!current || sample.distanceM > current.distanceM) farthest[bin] = sample;
  }

  const profile = farthest.map((edge) => (edge ? beyondEdgeElevationDeg(edge.heightM, edge.distanceM, radiusM) : null));
  if (profile.every((value) => value === null)) return profile.map(() => 0);
  return profile.map((value, i) => {
    if (value !== null) return value;
    for (let step = 1; step < bins; step += 1) {
      const next = profile[(i + step) % bins] ?? null;
      if (next !== null) return next;
      const previous = profile[(i - step + bins) % bins] ?? null;
      if (previous !== null) return previous;
    }
    return 0;
  });
}
