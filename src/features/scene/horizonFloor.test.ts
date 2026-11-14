import { describe, expect, it } from 'vitest';
import { beyondEdgeElevationDeg, horizonProfile } from './horizonFloor';

const R = 1_737_400;
const DEG = 180 / Math.PI;

describe('beyondEdgeElevationDeg', () => {
  it('is the classic horizon dip for an eye above a smooth sphere', () => {
    // Edge at eye level minus the eye height, close to the viewer: dip = sqrt(2h/R).
    const eyeHeight = 1.6;
    expect(beyondEdgeElevationDeg(-eyeHeight, 1, R)).toBeCloseTo(-Math.sqrt((2 * eyeHeight) / R) * DEG, 4);
  });

  it('dips further when the terrain at the edge is far below the eye (a rim)', () => {
    // 300 m below at 5 km: H = 300 - 25e6 / 2R; about -1.05 degrees.
    const h = 300 - 25e6 / (2 * R);
    const expected = Math.atan(-Math.sqrt((2 * h) / R)) * DEG;
    expect(beyondEdgeElevationDeg(-300, 5000, R)).toBeCloseTo(expected, 6);
    expect(expected).toBeLessThan(-1);
  });

  it('uses the edge itself when the edge is beyond the tangent point', () => {
    // 1 m below at 5 km: the sphere already falls away faster than the line of sight.
    expect(beyondEdgeElevationDeg(-1, 5000, R)).toBeCloseTo(Math.atan(-1 / 5000) * DEG, 9);
  });

  it('never rises above the geometric horizon', () => {
    expect(beyondEdgeElevationDeg(200, 5000, R)).toBe(0);
    expect(beyondEdgeElevationDeg(-10, 0, R)).toBe(0);
  });
});

describe('horizonProfile', () => {
  it('uses the farthest sample of each sector and fills empty sectors from neighbors', () => {
    const profile = horizonProfile(
      [
        { azimuthDeg: 0, distanceM: 100, heightM: 50 },
        { azimuthDeg: 1, distanceM: 5000, heightM: -300 },
        { azimuthDeg: 181, distanceM: 4000, heightM: -1 },
      ],
      4,
      R,
    );
    expect(profile[0]).toBeCloseTo(beyondEdgeElevationDeg(-300, 5000, R), 9);
    expect(profile[2]).toBeCloseTo(beyondEdgeElevationDeg(-1, 4000, R), 9);
    // Sector 1 (90 deg) is empty: nearest filled neighbor (180 deg, searched forward first).
    expect(profile[1]).toBe(profile[2]);
    expect(profile[3]).toBe(profile[0]);
  });

  it('falls back to the geometric horizon without samples', () => {
    expect(horizonProfile([], 3, R)).toEqual([0, 0, 0]);
  });
});
