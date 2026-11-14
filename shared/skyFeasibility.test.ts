import { describe, expect, it } from 'vitest';
import { EARTH_ACCEPTED_ANGLE_DEG, impossibleBodies, isBodyBoxPossible, possibleSky, SUN_ACCEPTED_LATITUDE_DEG } from './skyFeasibility.js';

const NOBILE_RIM_1 = { latitudeDeg: -85.4381, longitudeEastDeg: 37.36667 };
const SHACKLETON_RIM = { latitudeDeg: -89.7668, longitudeEastDeg: -171.87 };
const NEAR_SIDE_CENTER = { latitudeDeg: 0, longitudeEastDeg: 0 };
const FAR_SIDE_CENTER = { latitudeDeg: 0, longitudeEastDeg: 180 };

const point = (value: number) => ({ min: value, max: value });

describe('bounds', () => {
  it('adds the margin and the Earth parallax to the Horizons bounds', () => {
    expect(SUN_ACCEPTED_LATITUDE_DEG).toBeCloseTo(1.8419, 4);
    expect(EARTH_ACCEPTED_ANGLE_DEG).toBeCloseTo(10.4612 + 0.27928 + 0.25, 4);
  });
});

/**
 * Values printed by JPL Horizons (quantity 4, AIRLESS, MEAN_ME), queried on
 * 2026-11-14 from the topocentric site (CENTER='coord@301', altitude 0 km).
 * The highest ones come from a 6-hourly table over 2010–2029.
 */
describe('Horizons values are possible', () => {
  it.each([
    // Nobile Rim 1, 2010-01-01 00:00 UT.
    ['sun', NOBILE_RIM_1, 317.871877, 3.699798],
    ['earth', NOBILE_RIM_1, 320.646021, 4.217347],
    // Nobile Rim 1, highest Sun (2023-02-02 12:00 UT) and highest Earth (2024-09-25 06:00 UT).
    ['sun', NOBILE_RIM_1, 1.026641, 6.143967],
    ['earth', NOBILE_RIM_1, 330.037734, 10.542722],
    // Shackleton Rim, 2010-01-01 00:00 UT.
    ['sun', SHACKLETON_RIM, 167.215906, 0.085394],
    // Limb site 0° N 90° E, 2010-01-01 00:00 UT: Earth near the horizon in the west.
    ['earth', { latitudeDeg: 0, longitudeEastDeg: 90 }, 269.037579, -2.126168],
  ] as const)('%s at %o: az %f, el %f', (body, site, azimuth, elevation) => {
    expect(isBodyBoxPossible(body, site, point(azimuth), point(elevation))).toBe(true);
  });
});

describe('isBodyBoxPossible', () => {
  it('bounds the Sun elevation by the site latitude', () => {
    expect(isBodyBoxPossible('sun', NOBILE_RIM_1, null, { min: 6, max: 10 })).toBe(true);
    expect(isBodyBoxPossible('sun', NOBILE_RIM_1, null, { min: 6.5, max: 10 })).toBe(false);
    expect(isBodyBoxPossible('sun', SHACKLETON_RIM, null, point(2))).toBe(true);
    expect(isBodyBoxPossible('sun', SHACKLETON_RIM, null, point(2.2))).toBe(false);
    expect(isBodyBoxPossible('sun', SHACKLETON_RIM, null, point(-2.2))).toBe(false);
    expect(isBodyBoxPossible('sun', NEAR_SIDE_CENTER, null, point(90))).toBe(true);
  });

  it('allows every Sun azimuth on its own, but not every azimuth/elevation pair', () => {
    for (const azimuth of [0, 90, 180, 270, 359.9999]) {
      expect(isBodyBoxPossible('sun', NOBILE_RIM_1, point(azimuth), null)).toBe(true);
    }
    // At the equator the Sun rises near 90° and sets near 270°: it is never low in the north.
    expect(isBodyBoxPossible('sun', NEAR_SIDE_CENTER, { min: 350, max: 10 }, { min: 0, max: 10 })).toBe(false);
    expect(isBodyBoxPossible('sun', NEAR_SIDE_CENTER, { min: 350, max: 10 }, { min: 85, max: 90 })).toBe(true);
    expect(isBodyBoxPossible('sun', NEAR_SIDE_CENTER, { min: 85, max: 95 }, { min: 0, max: 10 })).toBe(true);
  });

  it('keeps the Earth near its mean direction', () => {
    expect(isBodyBoxPossible('earth', NEAR_SIDE_CENTER, null, { min: 80, max: 90 })).toBe(true);
    expect(isBodyBoxPossible('earth', NEAR_SIDE_CENTER, null, { min: 0, max: 78 })).toBe(false);
    expect(isBodyBoxPossible('earth', FAR_SIDE_CENTER, null, { min: -10, max: 90 })).toBe(false);
    // From Nobile Rim 1 the Earth is low, roughly north-west.
    expect(isBodyBoxPossible('earth', NOBILE_RIM_1, { min: 319, max: 321 }, null)).toBe(true);
    expect(isBodyBoxPossible('earth', NOBILE_RIM_1, { min: 150, max: 200 }, null)).toBe(false);
    expect(isBodyBoxPossible('earth', NOBILE_RIM_1, point(320), point(40))).toBe(false);
    // A wrapping arc that covers the Earth's azimuths is possible.
    expect(isBodyBoxPossible('earth', NOBILE_RIM_1, { min: 300, max: 10 }, point(0))).toBe(true);
  });
});

describe('possibleSky', () => {
  it('matches the box check at its bounds', () => {
    for (const site of [NOBILE_RIM_1, SHACKLETON_RIM, NEAR_SIDE_CENTER, { latitudeDeg: 30, longitudeEastDeg: 60 }]) {
      const sky = possibleSky(site);
      for (const body of ['sun', 'earth'] as const) {
        const { min, max } = sky[body].elevation;
        expect(isBodyBoxPossible(body, site, null, point(min + 1e-6))).toBe(true);
        expect(isBodyBoxPossible(body, site, null, point(max - 1e-6))).toBe(true);
        if (min > -90) expect(isBodyBoxPossible(body, site, null, point(min - 1e-3))).toBe(false);
        if (max < 90) expect(isBodyBoxPossible(body, site, null, point(max + 1e-3))).toBe(false);
        const azimuth = sky[body].azimuth;
        if (azimuth !== null) {
          expect(isBodyBoxPossible(body, site, point(azimuth.min + 1e-3), null)).toBe(true);
          expect(isBodyBoxPossible(body, site, point(azimuth.max - 1e-3), null)).toBe(true);
          expect(isBodyBoxPossible(body, site, point((azimuth.min - 0.01 + 360) % 360), null)).toBe(false);
          expect(isBodyBoxPossible(body, site, point((azimuth.max + 0.01) % 360), null)).toBe(false);
        }
      }
    }
  });

  it('gives the Sun every azimuth and the near-side Earth every azimuth at the center', () => {
    expect(possibleSky(NOBILE_RIM_1).sun.azimuth).toBeNull();
    expect(possibleSky(NEAR_SIDE_CENTER).earth.azimuth).toBeNull();
    const earth = possibleSky(NOBILE_RIM_1).earth;
    expect(earth.azimuth?.min).toBeGreaterThan(310);
    expect(earth.azimuth?.max).toBeLessThan(335);
  });
});

describe('impossibleBodies', () => {
  it('checks each body with its own azimuth and elevation', () => {
    expect(impossibleBodies(NOBILE_RIM_1, {})).toEqual([]);
    expect(impossibleBodies(NOBILE_RIM_1, { sunElevation: { min: 0, max: 5 }, earthAzimuth: { min: 319, max: 321 } })).toEqual([]);
    expect(impossibleBodies(NOBILE_RIM_1, { sunElevation: point(20), earthAzimuth: { min: 319, max: 321 } })).toEqual(['sun']);
    expect(impossibleBodies(NOBILE_RIM_1, { earthAzimuth: point(320), earthElevation: point(40) })).toEqual(['earth']);
  });
});
