import { describe, expect, it } from 'vitest';
import {
  angularSeparationDeg,
  azimuthArc,
  azimuthDifferenceDeg,
  elevationArc,
  elevationExaggeration,
  exaggerateElevation,
  meanAzimuthDeg,
  midpoint,
  normalizeAzimuth,
  separationArc,
} from './angles';
import { horizontalToDirection } from './geometry';

const length = ([x, y, z]: readonly number[]) => Math.hypot(x!, y!, z!);

describe('azimuth helpers', () => {
  it('normalizes azimuths to [0, 360)', () => {
    expect(normalizeAzimuth(-10)).toBe(350);
    expect(normalizeAzimuth(360)).toBe(0);
    expect(normalizeAzimuth(725)).toBe(5);
  });

  it('takes the shortest signed turn, positive clockwise', () => {
    expect(azimuthDifferenceDeg(10, 50)).toBe(40);
    expect(azimuthDifferenceDeg(50, 10)).toBe(-40);
    expect(azimuthDifferenceDeg(350, 10)).toBe(20);
    expect(azimuthDifferenceDeg(10, 350)).toBe(-20);
    expect(azimuthDifferenceDeg(0, 180)).toBe(180);
  });

  it('averages azimuths on the circle', () => {
    expect(meanAzimuthDeg([350, 10])).toBeCloseTo(0, 9);
    expect(meanAzimuthDeg([80, 100])).toBeCloseTo(90, 9);
    expect(meanAzimuthDeg([])).toBe(0);
  });
});

describe('angular separation', () => {
  it('is the azimuth difference on the horizon and the elevation difference on one azimuth', () => {
    expect(angularSeparationDeg({ azimuthDeg: 10, elevationDeg: 0 }, { azimuthDeg: 100, elevationDeg: 0 })).toBeCloseTo(90, 9);
    expect(angularSeparationDeg({ azimuthDeg: 40, elevationDeg: 1.5 }, { azimuthDeg: 40, elevationDeg: 6 })).toBeCloseTo(4.5, 9);
  });

  it('matches the angle between the direction vectors', () => {
    const a = { azimuthDeg: 123.4, elevationDeg: 1.2 };
    const b = { azimuthDeg: 31.7, elevationDeg: 5.9 };
    const [p, q] = [horizontalToDirection(a.azimuthDeg, a.elevationDeg), horizontalToDirection(b.azimuthDeg, b.elevationDeg)];
    const expected = (Math.acos(p[0] * q[0] + p[1] * q[1] + p[2] * q[2]) * 180) / Math.PI;
    expect(angularSeparationDeg(a, b)).toBeCloseTo(expected, 9);
  });

  it('is accurate for small angles and symmetric', () => {
    const a = { azimuthDeg: 0, elevationDeg: 0 };
    const b = { azimuthDeg: 0.001, elevationDeg: 0 };
    expect(angularSeparationDeg(a, b)).toBeCloseTo(0.001, 12);
    expect(angularSeparationDeg(b, a)).toBeCloseTo(angularSeparationDeg(a, b), 12);
  });
});

describe('guide arcs', () => {
  it('runs the azimuth arc on the plane from the start azimuth through the sweep', () => {
    const arc = azimuthArc(0, 90, 2);
    expect(arc[0]![0]).toBeCloseTo(0, 9);
    expect(arc[0]![2]).toBeCloseTo(-2, 9); // North is -Z.
    expect(arc.at(-1)![0]).toBeCloseTo(2, 9); // East is +X.
    for (const point of arc) {
      expect(point[1]).toBeCloseTo(0, 9);
      expect(length(point)).toBeCloseTo(2, 9);
    }
  });

  it('rises the elevation arc from the plane to the elevation', () => {
    const arc = elevationArc(45, -3, 10);
    expect(arc[0]![1]).toBeCloseTo(0, 9);
    expect(arc.at(-1)![1]).toBeCloseTo(10 * Math.sin((-3 * Math.PI) / 180), 9);
  });

  it('joins both directions along the dome', () => {
    const a = { azimuthDeg: 100, elevationDeg: 2 };
    const b = { azimuthDeg: 20, elevationDeg: 7 };
    const arc = separationArc(a, b, 10);
    const [pa, pb] = [horizontalToDirection(100, 2), horizontalToDirection(20, 7)];
    expect(arc[0]!.map((v, i) => v - pa[i]! * 10).every((d) => Math.abs(d) < 1e-9)).toBe(true);
    expect(arc.at(-1)!.map((v, i) => v - pb[i]! * 10).every((d) => Math.abs(d) < 1e-9)).toBe(true);
    for (const point of arc) expect(length(point)).toBeCloseTo(10, 9);
    expect(length(midpoint(arc))).toBeCloseTo(10, 2);
  });

  it('goes over the zenith for opposite directions', () => {
    const arc = separationArc({ azimuthDeg: 0, elevationDeg: 0 }, { azimuthDeg: 180, elevationDeg: 0 }, 1);
    expect(Math.max(...arc.map((point) => point[1]))).toBeCloseTo(1, 9);
  });
});

describe('elevation exaggeration', () => {
  it('stretches low polar elevations the most and leaves high ones alone', () => {
    expect(elevationExaggeration([2.1, -0.6])).toBe(10);
    expect(elevationExaggeration([8, 1])).toBe(3);
    expect(elevationExaggeration([40, 10])).toBe(1);
    expect(elevationExaggeration([])).toBe(1);
    expect(elevationExaggeration([0, 0])).toBe(10);
  });

  it('keeps the horizon, the zenith, the sign and the order', () => {
    expect(exaggerateElevation(0, 10)).toBe(0);
    expect(exaggerateElevation(90, 10)).toBeCloseTo(90, 9);
    expect(exaggerateElevation(-2, 10)).toBeCloseTo(-exaggerateElevation(2, 10), 12);
    expect(exaggerateElevation(1, 10)).toBeLessThan(exaggerateElevation(2, 10));
    expect(exaggerateElevation(2, 10)).toBeCloseTo((Math.atan(10 * Math.tan((2 * Math.PI) / 180)) * 180) / Math.PI, 9);
    expect(exaggerateElevation(25, 1)).toBeCloseTo(25, 12);
  });
});
