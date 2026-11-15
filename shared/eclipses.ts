/**
 * Sun–Earth separation thresholds (seen from a lunar site) that guarantee an
 * eclipse, for the inverse-search examples (`sunEarthSep`, see
 * `shared/skySearch.ts`). Seen from the Moon there are two kinds:
 *
 *   - Solar eclipse: the Earth covers at least part of the Sun as seen from
 *     the site. On Earth the same event is a lunar eclipse (penumbral or
 *     deeper). It holds when the separation is below the sum of the apparent
 *     radii of the Earth and the Sun.
 *   - Terrestrial eclipse: the Moon's shadow (penumbra) reaches the Earth. On
 *     Earth the same event is a solar eclipse (partial or deeper). The Earth
 *     is then nearly opposite the Sun, so the separation is close to 180°.
 *
 * Both thresholds are sufficient, not necessary: they use the smallest
 * possible apparent sizes and the largest distances in 1969–2100, so every
 * instant inside them is an eclipse, while the first and last minutes of a
 * grazing eclipse can fall outside. Terrain and the Earth's atmosphere
 * (refraction, which reddens and enlarges the shadow) are not modeled; the
 * Earth is taken as a sphere of its polar radius.
 *
 * Radii from the Horizons "Target radii" headers (DE441): Sun 695,700 km,
 * Earth 6,378.137 × 6,356.752 km, Moon 1,737.4 km. Distances measured with
 * JPL Horizons on 2026-11-15 (API 1.2, DE441), QUANTITIES='20', 1969-01-01 to
 * 2100-01-01 UT:
 *   - Moon from Earth (COMMAND='301', CENTER='500@399', STEP_SIZE='12h',
 *     95,696 rows): min 356,437.0 km (as in `skyFeasibility.ts`), max
 *     406,709.4 km.
 *   - Sun from the Moon (COMMAND='10', CENTER='500@301', STEP_SIZE='1d',
 *     47,849 rows): min 146,697,820 km, max 152,498,247 km.
 * The bounds below are rounded outward by more than the error of those
 * sampling steps (under 50 km for the Moon at 12 h, under 3,000 km for the
 * Sun at 1 d).
 */

import { MIN_EARTH_MOON_DISTANCE_KM, MOON_RADIUS_KM } from './skyFeasibility.js';

export const SUN_RADIUS_KM = 695_700;
export const EARTH_POLAR_RADIUS_KM = 6_356.752;
/** Largest Earth–Moon center distance, 1969–2100, rounded up (measured 406,709.4 km). */
export const MAX_EARTH_MOON_DISTANCE_KM = 406_800;
/** Smallest and largest Moon–Sun center distance, 1969–2100, rounded outward. */
export const MIN_MOON_SUN_DISTANCE_KM = 146_690_000;
export const MAX_MOON_SUN_DISTANCE_KM = 152_510_000;
/**
 * Allowance for the difference between the apparent directions the search
 * compares (aberration, under 0.006° for the Sun; light time) and the
 * geometric alignment that casts the Moon's shadow, degrees.
 */
export const APPARENT_DIRECTION_ALLOWANCE_DEG = 0.01;

const DEG = 180 / Math.PI;

/**
 * Largest separation (deg) at which the Earth surely covers part of the Sun:
 * the smallest apparent Earth radius (polar radius at the largest site–Earth
 * distance) plus the smallest apparent Sun radius. The separation is measured
 * from the site itself, so no parallax term is needed.
 */
export function solarEclipseMaxSeparationDeg(): number {
  const earth = Math.asin(EARTH_POLAR_RADIUS_KM / (MAX_EARTH_MOON_DISTANCE_KM + MOON_RADIUS_KM));
  const sun = Math.asin(SUN_RADIUS_KM / (MAX_MOON_SUN_DISTANCE_KM + MOON_RADIUS_KM));
  return (earth + sun) * DEG;
}

/**
 * Smallest separation (deg) at which the Moon's penumbra surely reaches the
 * Earth. The penumbral cone has half-angle α = asin((R☉ + R☾) / D) and radius
 * R☾ / cos α + z tan α at a distance z behind the Moon's center. The Earth, at
 * distance L and angle θ from the shadow axis seen from the Moon's center, is
 * reached when L sin θ < R⊕ + R☾ / cos α + L cos θ tan α, that is when
 * θ < α + asin((R⊕ cos α + R☾) / L). Taking the smallest α and the largest L
 * gives a θ that always works; the site sees the Earth up to asin(R☾ / L_min)
 * away from where the Moon's center sees it (and the Sun up to
 * asin(R☾ / D_min)), and apparent directions add
 * `APPARENT_DIRECTION_ALLOWANCE_DEG`.
 */
export function terrestrialEclipseMinSeparationDeg(): number {
  const alpha = Math.asin((SUN_RADIUS_KM + MOON_RADIUS_KM) / MAX_MOON_SUN_DISTANCE_KM);
  const theta = alpha + Math.asin((EARTH_POLAR_RADIUS_KM * Math.cos(alpha) + MOON_RADIUS_KM) / MAX_EARTH_MOON_DISTANCE_KM);
  const parallax = Math.asin(MOON_RADIUS_KM / MIN_EARTH_MOON_DISTANCE_KM) + Math.asin(MOON_RADIUS_KM / MIN_MOON_SUN_DISTANCE_KM);
  return 180 - (theta - parallax) * DEG + APPARENT_DIRECTION_ALLOWANCE_DEG;
}

/** Thresholds as typed in the example fields: rounded inward to 2 decimals, so they stay sufficient. */
export const SOLAR_ECLIPSE_MAX_SEPARATION_DEG = Math.floor(solarEclipseMaxSeparationDeg() * 100) / 100;
export const TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG = Math.ceil(terrestrialEclipseMinSeparationDeg() * 100) / 100;
