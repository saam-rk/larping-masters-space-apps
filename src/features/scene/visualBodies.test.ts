import { describe, expect, it } from 'vitest';
import { horizontalToPosition } from './geometry';
import { ALIGNED_GAP, BODY_DOME_RADIUS, BODY_RADIUS } from './visualBodies';

describe('visual-scale bodies', () => {
  it('draws the Sun slightly larger and just behind the Earth', () => {
    expect(BODY_RADIUS.sun).toBeGreaterThan(BODY_RADIUS.earth);
    expect(BODY_DOME_RADIUS.sun).toBeGreaterThan(BODY_DOME_RADIUS.earth);
  });

  it('keeps the spheres apart at any separation, including a solar eclipse seen from the Moon', () => {
    for (const separationDeg of [0, 0.3, 1.15, 5, 30, 90, 180]) {
      const sun = horizontalToPosition(270, 70, BODY_DOME_RADIUS.sun);
      const earth = horizontalToPosition(270 + separationDeg, 70, BODY_DOME_RADIUS.earth);
      const distance = Math.hypot(sun[0] - earth[0], sun[1] - earth[1], sun[2] - earth[2]);
      expect(distance).toBeGreaterThanOrEqual(BODY_RADIUS.sun + BODY_RADIUS.earth + ALIGNED_GAP - 1e-9);
    }
  });
});
