import { describe, expect, it } from 'vitest';
import { findSite } from '../../../../shared/sites';
import { glbToSceneDirection, projectSouthPolar, projectedToGlb } from './nobileRim2';

const site = findSite('nobile-rim-2');

function normalize([x, y, z]: readonly number[]): number[] {
  const length = Math.hypot(x ?? 0, y ?? 0, z ?? 0);
  return [(x ?? 0) / length, (y ?? 0) / length, (z ?? 0) / length];
}

describe('Nobile Rim 2 terrain frame', () => {
  it('projects the site as in the terrain metadata', () => {
    // docs/research/site-terrain/nobile-rim-2/README.md: X=157000.451965 m, Y=95000.253401 m.
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    expect(x).toBeCloseTo(157000.451965, 4);
    expect(y).toBeCloseTo(95000.253401, 4);
  });

  it.each([
    // A small step in latitude (north) or longitude (east) from the site.
    ['north', 0.01, 0, [0, 0, -1]],
    ['east', 0, 0.05, [1, 0, 0]],
  ])('turns geographic %s into the scene axis', (_label, dLat, dLon, expected) => {
    const from = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    const to = projectSouthPolar(site.latitudeDeg + dLat, site.longitudeEastDeg + dLon);
    const a = projectedToGlb(from.x, from.y, 0);
    const b = projectedToGlb(to.x, to.y, 0);
    const direction = normalize(glbToSceneDirection([b[0] - a[0], 0, b[2] - a[2]]));
    direction.forEach((value, i) => expect(value).toBeCloseTo(expected[i] ?? NaN, 3));
  });
});
