import { describe, expect, it } from 'vitest';
import {
  SOLAR_ECLIPSE_MAX_SEPARATION_DEG,
  solarEclipseMaxSeparationDeg,
  TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG,
  terrestrialEclipseMinSeparationDeg,
} from './eclipses.js';

const DEG = 180 / Math.PI;

describe('eclipse thresholds', () => {
  it('rounds the derived bounds inward to the values typed in the examples', () => {
    expect(solarEclipseMaxSeparationDeg()).toBeCloseTo(1.15291, 5);
    expect(SOLAR_ECLIPSE_MAX_SEPARATION_DEG).toBe(1.15);
    expect(terrestrialEclipseMinSeparationDeg()).toBeCloseTo(178.88785, 5);
    expect(TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG).toBe(178.89);
  });

  it('stays inside the eclipse limits at mean distances', () => {
    // Mean Earth–Moon distance 384,400 km, Moon–Sun 1 au: the Earth and the
    // Sun look larger than in the worst case, so the true limits are wider.
    const meanEarth = Math.asin(6378.137 / 384_400) * DEG;
    const meanSun = Math.asin(695_700 / 149_597_870.7) * DEG;
    expect(SOLAR_ECLIPSE_MAX_SEPARATION_DEG).toBeLessThan(meanEarth + meanSun);
    const alpha = Math.asin((695_700 + 1737.4) / 149_597_870.7);
    const meanTheta = (alpha + Math.asin((6378.137 * Math.cos(alpha) + 1737.4) / 384_400)) * DEG;
    expect(180 - TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG).toBeLessThan(meanTheta);
  });
});
