import { describe, expect, it } from 'vitest';
import { FIT_ASPECT, MAX_FIT_FOV_DEG, fittedFov } from './fitFov';

/** Horizontal field of view (degrees) for a vertical one and an aspect. */
function horizontal(verticalDeg: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((verticalDeg * Math.PI) / 360) * aspect) * 180) / Math.PI;
}

describe('fittedFov', () => {
  it('keeps the base angle on views at least as wide as the reference aspect', () => {
    expect(fittedFov(40, FIT_ASPECT)).toBe(40);
    expect(fittedFov(40, 2.2)).toBe(40);
  });

  it('widens narrow views so they show the horizontal angle of the reference aspect', () => {
    const fov = fittedFov(40, 0.95);
    expect(fov).toBeGreaterThan(40);
    expect(horizontal(fov, 0.95)).toBeCloseTo(horizontal(40, FIT_ASPECT), 6);
  });

  it('stops widening at the limit and ignores an unmeasured view', () => {
    expect(fittedFov(40, 0.2)).toBe(MAX_FIT_FOV_DEG);
    expect(fittedFov(40, 0)).toBe(40);
    expect(fittedFov(40, Number.NaN)).toBe(40);
  });
});
