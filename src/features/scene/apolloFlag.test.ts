import { describe, expect, it } from 'vitest';
import { CANTON_HEIGHT_M, CANTON_WIDTH_M, STAR_DIAMETER_PER_CANTON_HEIGHT, flagStarCenters } from './apolloFlag';

describe('flagStarCenters', () => {
  const stars = flagStarCenters();

  it('lays out 50 stars in nine rows of alternately six and five', () => {
    expect(stars).toHaveLength(50);
    const rows = new Map<number, number>();
    for (const { y } of stars) rows.set(y, (rows.get(y) ?? 0) + 1);
    expect([...rows.values()]).toEqual([6, 5, 6, 5, 6, 5, 6, 5, 6]);
  });

  it('staggers the rows and keeps the stars inside the canton without touching', () => {
    const radius = STAR_DIAMETER_PER_CANTON_HEIGHT / 2;
    for (const { x, y } of stars) {
      expect(x * CANTON_WIDTH_M - radius * CANTON_HEIGHT_M).toBeGreaterThan(0);
      expect((1 - x) * CANTON_WIDTH_M - radius * CANTON_HEIGHT_M).toBeGreaterThan(0);
      expect(y - radius).toBeGreaterThan(0);
      expect(1 - y - radius).toBeGreaterThan(0);
    }
    expect(stars[0]!.x).toBeCloseTo(1 / 12);
    expect(stars[6]!.x).toBeCloseTo(2 / 12);
    let closest = Infinity;
    for (const a of stars) {
      for (const b of stars) {
        if (a === b) continue;
        closest = Math.min(closest, Math.hypot((a.x - b.x) * CANTON_WIDTH_M, (a.y - b.y) * CANTON_HEIGHT_M));
      }
    }
    expect(closest).toBeGreaterThan(STAR_DIAMETER_PER_CANTON_HEIGHT * CANTON_HEIGHT_M);
  });
});
