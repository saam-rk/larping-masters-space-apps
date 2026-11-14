import { describe, expect, it } from 'vitest';
import { horizontalToDirection, horizontalToPosition } from './geometry';

function expectClose(actual: readonly number[], expected: readonly number[]) {
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index] ?? NaN, 10));
}

describe('horizontalToDirection', () => {
  it.each([
    ['north', 0, 0, [0, 0, -1]],
    ['east', 90, 0, [1, 0, 0]],
    ['south', 180, 0, [0, 0, 1]],
    ['west', 270, 0, [-1, 0, 0]],
    ['zenith', 123, 90, [0, 1, 0]],
    ['nadir', 0, -90, [0, -1, 0]],
  ])('points %s', (_label, az, el, expected) => {
    expectClose(horizontalToDirection(az, el), expected);
  });

  it('returns unit vectors', () => {
    const [x, y, z] = horizontalToDirection(83.301542, 2.094722);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
  });

  it('places a body with negative elevation below the horizon plane', () => {
    const [, y] = horizontalToPosition(320.816668, -0.587903, 10);
    expect(y).toBeLessThan(0);
  });
});
