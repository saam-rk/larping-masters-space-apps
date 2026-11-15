import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { lunarNorthAxis, modelDirection, moonOrientation, northAlongLunarAxis } from './celestialOrientation';

function expectClose(actual: Vector3, expected: Vector3) {
  expect(actual.distanceTo(expected)).toBeLessThan(1e-9);
}

const SITES = [
  { name: 'Apollo 11', lat: 0.67416, lon: 23.47314 },
  { name: 'south polar rim', lat: -89.45, lon: -137.31 },
  { name: 'far side, west', lat: 35, lon: -160 },
];

describe('moonOrientation', () => {
  it.each(SITES)('puts $name under the observer with north along the spin axis', ({ lat, lon }) => {
    const q = moonOrientation(lat, lon);
    expectClose(modelDirection(lat, lon).applyQuaternion(q), new Vector3(0, 1, 0));
    expectClose(new Vector3(0, 1, 0).applyQuaternion(q), lunarNorthAxis(lat));
  });

  it('turns a point slightly east of the site toward +X', () => {
    const q = moonOrientation(10, 40);
    const east = modelDirection(10, 41).applyQuaternion(q);
    expect(east.x).toBeGreaterThan(0);
    expect(Math.abs(east.z)).toBeLessThan(1e-3);
  });

  it('turns a point slightly north of the site toward -Z', () => {
    const q = moonOrientation(10, 40);
    expect(modelDirection(11, 40).applyQuaternion(q).z).toBeLessThan(0);
  });
});

describe('northAlongLunarAxis', () => {
  it('points the model north pole along the lunar spin axis', () => {
    expectClose(new Vector3(0, 1, 0).applyQuaternion(northAlongLunarAxis(-89.45)), lunarNorthAxis(-89.45));
  });
});
