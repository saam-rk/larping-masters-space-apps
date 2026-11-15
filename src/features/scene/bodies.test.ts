import { describe, expect, it } from 'vitest';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { AU_KM, placeBodies, radiusForAngularDiameter, upperLimbAboveHorizon } from './bodies';
import { createStars } from './stars';
import { hasFirstPersonView } from './viewMode';

describe('placeBodies', () => {
  it('uses the Horizons diameter and range of the saved sample', () => {
    const { placed, missing } = placeBodies(SAVED_SAMPLE);
    expect(missing).toEqual([]);
    const sun = placed.find((body) => body.body === 'sun');
    const earth = placed.find((body) => body.body === 'earth');
    expect(sun?.angularDiameterDeg).toBeCloseTo(1941.825 / 3600, 9);
    expect(sun?.rangeKm).toBeCloseTo(0.98796880248943 * AU_KM, 3);
    expect(sun?.nominalSize || sun?.nominalRange).toBe(false);
    // Physical radii recovered from diameter and range match the "Target radii" of the
    // Horizons headers (Sun 695,700.0 km; Earth equatorial 6,378.137 km), within the
    // rounding of the printed diameter.
    expect(radiusForAngularDiameter(sun!.angularDiameterDeg, sun!.rangeKm)).toBeCloseTo(695_700, 0);
    expect(radiusForAngularDiameter(earth!.angularDiameterDeg, earth!.rangeKm)).toBeCloseTo(6378.137, 2);
  });

  it('flags the Earth upper limb above the plane while its center is below', () => {
    const earth = placeBodies(SAVED_SAMPLE).placed.find((body) => body.body === 'earth')!;
    expect(earth.elevationDeg).toBeLessThan(0);
    expect(upperLimbAboveHorizon(earth)).toBe(true);
  });

  it('marks nominal values and skips bodies without az/el instead of using zero', () => {
    const sunResult = SAVED_SAMPLE.bodies.sun;
    if (sunResult.status !== 'ok') throw new Error('sample changed');
    const data: EphemerisResponse = {
      ...SAVED_SAMPLE,
      bodies: {
        sun: { status: 'ok', observation: { ...sunResult.observation, angularDiameterArcsec: null, rangeAu: null } },
        earth: { status: 'error', body: 'earth', error: { code: 'UPSTREAM_FORMAT', detail: 'test' } },
      },
    };
    const { placed, missing } = placeBodies(data);
    expect(missing).toEqual(['earth']);
    expect(placed[0]?.nominalSize).toBe(true);
    expect(placed[0]?.nominalRange).toBe(true);
    expect(placed[0]?.angularDiameterDeg).toBeCloseTo(0.533, 2);
    // The nominal diameter and the radius formula invert each other.
    expect(radiusForAngularDiameter(placed[0]!.angularDiameterDeg, placed[0]!.rangeKm)).toBeCloseTo(695_700, 6);
  });
});

describe('createStars', () => {
  it('is deterministic and returns unit vectors', () => {
    const a = createStars(50);
    expect(a.positions).toEqual(createStars(50).positions);
    for (let i = 0; i < 50; i += 1) {
      const [x, y, z] = a.positions.slice(i * 3, i * 3 + 3);
      expect(Math.hypot(x!, y!, z!)).toBeCloseTo(1, 5);
    }
  });
});

describe('hasFirstPersonView', () => {
  it('is only available where a terrain model exists', () => {
    expect(hasFirstPersonView('nobile-rim-2')).toBe(true);
    expect(hasFirstPersonView('nobile-rim-1')).toBe(true);
    expect(hasFirstPersonView('shackleton-rim')).toBe(true);
    expect(hasFirstPersonView('amundsen-rim')).toBe(true);
    expect(hasFirstPersonView('custom')).toBe(false);
  });
});
