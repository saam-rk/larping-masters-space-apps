/**
 * Physical plausibility of inverse-search conditions (`shared/skySearch.ts`):
 * whether the Sun or the Earth can ever be at the requested azimuth/elevation
 * seen from a given lunar site. This is a necessary condition only. Accepted
 * conditions may still have no match in the searched window; rejected ones
 * cannot occur at that site in the supported date range.
 *
 * Geometry (lunar body-fixed frame, Horizons `MOON_ME`; spherical Moon):
 *   - Sun: seen from the Moon it always stays close to the lunar equator, so
 *     its lunar latitude (declination over the lunar equator) is bounded.
 *     Over a synodic month it passes through every hour angle.
 *   - Earth: seen from the Moon it stays close to the mean sub-Earth point
 *     (0° N, 0° E); libration moves it at most a small angle away.
 * A direction (azimuth A clockwise from north, elevation h) is turned into a
 * unit vector of the site's local north/east/up frame, and the range of its
 * dot product with the lunar pole (Sun) or with the mean sub-Earth direction
 * (Earth) over the requested azimuth/elevation box is computed exactly.
 *
 * Bounds were measured with JPL Horizons on 2026-11-14 (API 1.2, DE441,
 * target pole MOON_ME): COMMAND='301', CENTER='500@399', QUANTITIES='14,15,20',
 * 2000-01-01 to 2100-01-01 UT, STEP_SIZE='12h' (73,051 rows).
 *   - max |SunSub-LAT|                       = 1.591900°
 *   - max angle of ObsSub (sub-Earth point) from 0° N 0° E = 10.461192°
 *   - min Earth–Moon distance (delta)        = 356,437.0 km
 * The same query for 1969-01-01 through 2000-01-01 (22,645 rows), checked
 * on 2026-11-15, gave 1.586397°, 10.436261°, and 356,522.33383 km, all
 * within the bounds above.
 */

import type { BodyId } from './ephemeris.js';
import { SKY_TARGET_INFO, SKY_TARGETS, type AngleRange, type SkyConditions } from './skySearch.js';

/** Largest lunar latitude of the sub-solar point, 2000–2100 (Horizons, see above), degrees. */
export const SUN_MAX_LUNAR_LATITUDE_DEG = 1.5919;
/** Largest angle between the geocentric sub-Earth point and 0° N 0° E, 2000–2100, degrees. */
export const EARTH_MAX_SUB_POINT_ANGLE_DEG = 10.4612;
/** Horizons lunar reference radius, km. */
export const MOON_RADIUS_KM = 1737.4;
/** Smallest Earth–Moon center distance, 2000–2100 (Horizons, see above), km. */
export const MIN_EARTH_MOON_DISTANCE_KM = 356_437;
/**
 * Largest shift of the Earth direction between the Moon's center and a site on
 * its surface (topocentric parallax), degrees.
 */
export const EARTH_MAX_PARALLAX_DEG = (Math.asin(MOON_RADIUS_KM / MIN_EARTH_MOON_DISTANCE_KM) * 180) / Math.PI;
/**
 * Extra tolerance on both bounds, degrees. It covers the 12 h sampling of the
 * bounds, aberration and light time, the Sun's parallax (< 0.001°) and the
 * 4-decimal comparison, with room to spare: a condition is only rejected when
 * it is clearly impossible.
 */
export const FEASIBILITY_MARGIN_DEG = 0.25;

/** Sun: largest declination over the lunar equator that is still accepted. */
export const SUN_ACCEPTED_LATITUDE_DEG = SUN_MAX_LUNAR_LATITUDE_DEG + FEASIBILITY_MARGIN_DEG;
/** Earth: largest angle from the mean sub-Earth direction that is still accepted. */
export const EARTH_ACCEPTED_ANGLE_DEG = EARTH_MAX_SUB_POINT_ANGLE_DEG + EARTH_MAX_PARALLAX_DEG + FEASIBILITY_MARGIN_DEG;

export interface SiteCoordinates {
  /** Planetocentric latitude, degrees (negative south). */
  readonly latitudeDeg: number;
  /** East longitude, degrees. */
  readonly longitudeEastDeg: number;
}

/** Unit vector in the site's local frame. */
interface LocalVector {
  readonly north: number;
  readonly east: number;
  readonly up: number;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function normalizeAzimuth(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Whether azimuth `value` lies on the arc `range` (`min > max` wraps through north). */
function arcContains(range: AngleRange, value: number): boolean {
  if (range.max - range.min >= 360) return true;
  const azimuth = normalizeAzimuth(value);
  const min = normalizeAzimuth(range.min);
  const max = range.max === 360 ? 360 : normalizeAzimuth(range.max);
  return min <= max ? azimuth >= min && azimuth <= max : azimuth >= min || azimuth <= max;
}

function dot(vector: LocalVector, azimuthDeg: number, elevationDeg: number): number {
  const a = azimuthDeg * RAD;
  const h = elevationDeg * RAD;
  return Math.cos(h) * (vector.north * Math.cos(a) + vector.east * Math.sin(a)) + vector.up * Math.sin(h);
}

/**
 * Exact range of the dot product between `vector` and every direction of the
 * box (azimuth arc, or every azimuth for `null`; elevation interval). The box
 * is connected, so the image is the interval between the smallest and the
 * largest value at the candidate points: corners, the extremes along each
 * edge and the box points along `±vector` (the only interior critical points).
 */
export function dotRange(vector: LocalVector, azimuth: AngleRange | null, elevation: AngleRange): readonly [number, number] {
  const inAzimuth = (value: number) => azimuth === null || arcContains(azimuth, value);
  const inElevation = (value: number) => value >= elevation.min && value <= elevation.max;
  const towards = Math.atan2(vector.east, vector.north) * DEG;
  const horizontal = Math.hypot(vector.north, vector.east);
  const candidates: number[] = [];
  const add = (az: number, el: number) => {
    if (inAzimuth(az) && inElevation(el)) candidates.push(dot(vector, az, el));
  };

  const edgeAzimuths = azimuth === null ? [] : [azimuth.min, azimuth.max];
  for (const el of [elevation.min, elevation.max]) {
    // Along a fixed elevation the dot product is extreme towards or away from the vector.
    for (const az of [...edgeAzimuths, towards, towards + 180]) add(az, el);
  }
  for (const az of edgeAzimuths) {
    // Along a fixed azimuth, k cos h + up sin h is extreme at h = atan2(up, k) ± 180°.
    const a = az * RAD;
    const k = vector.north * Math.cos(a) + vector.east * Math.sin(a);
    const peak = Math.atan2(vector.up, k) * DEG;
    for (const el of [peak, peak - 180, peak + 180]) if (el >= -90 && el <= 90) add(az, el);
  }
  const vectorElevation = Math.atan2(vector.up, horizontal) * DEG;
  add(towards, vectorElevation);
  add(towards + 180, -vectorElevation);

  return [Math.max(-1, Math.min(...candidates)), Math.min(1, Math.max(...candidates))];
}

function poleVector(site: SiteCoordinates): LocalVector {
  const latitude = site.latitudeDeg * RAD;
  return { north: Math.cos(latitude), east: 0, up: Math.sin(latitude) };
}

/** Direction of the mean sub-Earth point (0° N, 0° E) from the site. */
function subEarthVector(site: SiteCoordinates): LocalVector {
  const latitude = site.latitudeDeg * RAD;
  const longitude = site.longitudeEastDeg * RAD;
  return {
    north: -Math.sin(latitude) * Math.cos(longitude),
    east: -Math.sin(longitude),
    up: Math.cos(latitude) * Math.cos(longitude),
  };
}

const FULL_ELEVATION: AngleRange = { min: -90, max: 90 };

/** Whether some direction of the box can be occupied by `body` at `site`. */
export function isBodyBoxPossible(body: BodyId, site: SiteCoordinates, azimuth: AngleRange | null, elevation: AngleRange | null): boolean {
  if (body === 'sun') {
    const [low, high] = dotRange(poleVector(site), azimuth, elevation ?? FULL_ELEVATION);
    const limit = Math.sin(SUN_ACCEPTED_LATITUDE_DEG * RAD);
    return high >= -limit && low <= limit;
  }
  const [, high] = dotRange(subEarthVector(site), azimuth, elevation ?? FULL_ELEVATION);
  return high >= Math.cos(EARTH_ACCEPTED_ANGLE_DEG * RAD);
}

/** Bodies whose conditions (azimuth and elevation together) cannot occur at `site`. */
export function impossibleBodies(site: SiteCoordinates, conditions: SkyConditions): BodyId[] {
  const bodies: BodyId[] = [];
  for (const body of ['sun', 'earth'] as const) {
    // Single-body quantities only: the Sun–Earth separation is not checked (it sweeps from near 0° to near 180° every synodic month at any site).
    const targets = SKY_TARGETS.filter(
      (target) => SKY_TARGET_INFO[target].angle !== 'separation' && SKY_TARGET_INFO[target].bodies[0] === body && conditions[target] !== undefined,
    );
    if (targets.length === 0) continue;
    const azimuth = targets.find((target) => SKY_TARGET_INFO[target].angle === 'azimuth');
    const elevation = targets.find((target) => SKY_TARGET_INFO[target].angle === 'elevation');
    const possible = isBodyBoxPossible(
      body,
      site,
      azimuth === undefined ? null : (conditions[azimuth] ?? null),
      elevation === undefined ? null : (conditions[elevation] ?? null),
    );
    if (!possible) bodies.push(body);
  }
  return bodies;
}

export interface PossibleSky {
  /** Accepted elevations, degrees. */
  readonly elevation: AngleRange;
  /** Accepted azimuth arc (`min > max` wraps through north), or `null` for every azimuth. */
  readonly azimuth: AngleRange | null;
}

/**
 * Accepted elevation interval and azimuth arc of each body at `site`, each on
 * its own (a combination inside both can still be impossible).
 */
export function possibleSky(site: SiteCoordinates): { readonly [K in BodyId]: PossibleSky } {
  const latitude = Math.abs(site.latitudeDeg);
  const sunTop = 90 - Math.max(0, latitude - SUN_ACCEPTED_LATITUDE_DEG);

  // Angle between the site and the mean sub-Earth point.
  const cosDistance = Math.cos(site.latitudeDeg * RAD) * Math.cos(site.longitudeEastDeg * RAD);
  const distance = Math.acos(Math.max(-1, Math.min(1, cosDistance))) * DEG;
  const radius = EARTH_ACCEPTED_ANGLE_DEG;
  const earthElevation = { min: 90 - Math.min(180, distance + radius), max: 90 - Math.max(0, distance - radius) };
  let earthAzimuth: AngleRange | null = null;
  if (distance > radius && distance < 180 - radius) {
    const vector = subEarthVector(site);
    const center = Math.atan2(vector.east, vector.north) * DEG;
    const half = Math.asin(Math.sin(radius * RAD) / Math.sin(distance * RAD)) * DEG;
    earthAzimuth = { min: normalizeAzimuth(center - half), max: normalizeAzimuth(center + half) };
  }

  return {
    sun: { elevation: { min: -sunTop, max: sunTop }, azimuth: null },
    earth: { elevation: earthElevation, azimuth: earthAzimuth },
  };
}
