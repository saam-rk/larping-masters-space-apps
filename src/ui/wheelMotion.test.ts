import { describe, expect, it } from 'vitest';
import {
  atRest,
  FLING_MAX_SPEED,
  FLING_TAU,
  flingAt,
  nearestPosition,
  planFling,
  resistOverscroll,
  rowAppearance,
  sampleVelocity,
  springStep,
  wrapValue,
  type Motion,
} from './wheelMotion';

/** Runs a spring at 60 fps until it rests, returning every position. */
function runSpring(start: Motion, target: number, omega?: number): number[] {
  const positions: number[] = [];
  let motion = start;
  for (let frame = 0; frame < 600 && !atRest(motion, target); frame += 1) {
    motion = springStep(motion, target, 1 / 60, omega);
    positions.push(motion.position);
  }
  return positions;
}

describe('wheel motion', () => {
  it('springs from rest to the target without overshooting, easing in and out', () => {
    const positions = runSpring({ position: 12, velocity: 0 }, 4);
    expect(positions.at(-1)).toBeCloseTo(4, 2);
    expect(positions.length).toBeLessThan(90); // Settles well within 1.5 s.
    for (const position of positions) expect(position).toBeGreaterThanOrEqual(4 - 1e-9);
    const steps = positions.map((position, index) => Math.abs(position - (positions[index - 1] ?? 12)));
    expect(steps[0]).toBeLessThan(Math.max(...steps)); // Starts slowly…
    expect(steps.at(-1)).toBeLessThan(Math.max(...steps)); // …and settles slowly.
  });

  it('keeps the current velocity when retargeted', () => {
    const moving = springStep({ position: 0, velocity: 10 }, 5, 0);
    expect(moving).toEqual({ position: 0, velocity: 10 });
    const next = springStep({ position: 0, velocity: 10 }, 5, 1 / 60);
    expect(next.position).toBeGreaterThan(0.15);
  });

  it('plans a fling that starts at the release velocity and stops on a whole row', () => {
    const fling = planFling(30.4, 20, null)!;
    expect(fling.from + fling.distance).toBe(Math.round(30.4 + 20 * FLING_TAU));
    const start = flingAt(fling, 0);
    expect(start.position).toBeCloseTo(30.4);
    expect(start.velocity).toBeCloseTo(20);
    const later = flingAt(fling, 0.2);
    expect(later.velocity).toBeLessThan(20);
    expect(later.velocity).toBeGreaterThan(0);
    const end = flingAt(fling, 10);
    expect(end).toEqual({ position: fling.from + fling.distance, velocity: 0, done: true });
  });

  it('caps the fling speed, stops at the ends of a bounded wheel and leaves slow releases to a snap', () => {
    const fast = planFling(0, 1000, null)!;
    expect(fast.distance).toBe(Math.round(FLING_MAX_SPEED * FLING_TAU));
    expect(planFling(2095, 40, { min: 2000, max: 2099 })!.distance).toBe(4);
    expect(planFling(2099, 40, { min: 2000, max: 2099 })).toBeNull();
    expect(planFling(10, 1, null)).toBeNull();
    expect(planFling(10.6, 2, null)).toBeNull(); // Less than half a row to go: a snap is enough.
  });

  it('wraps cyclic values and finds the shortest way round', () => {
    expect(wrapValue(60, 0, 59)).toBe(0);
    expect(wrapValue(-1, 0, 59)).toBe(59);
    expect(wrapValue(13, 1, 12)).toBe(1);
    expect(wrapValue(0, 1, 12)).toBe(12);
    expect(nearestPosition(2, 58, 0, 59, true)).toBe(62);
    expect(nearestPosition(55, 3, 0, 59, true)).toBe(-5);
    expect(nearestPosition(4, 12, 1, 31, true)).toBe(4);
    expect(nearestPosition(2000, 2099, 2000, 2099, false)).toBe(2000);
  });

  it('resists dragging past the ends of a bounded wheel', () => {
    expect(resistOverscroll(2050, 2000, 2099)).toBe(2050);
    expect(resistOverscroll(2102, 2000, 2099)).toBeCloseTo(2099.9);
    expect(resistOverscroll(1990, 2000, 2099)).toBeCloseTo(1997);
  });

  it('estimates release velocity from recent samples only', () => {
    expect(sampleVelocity([])).toBe(0);
    expect(sampleVelocity([{ t: 0, p: 0 }])).toBe(0);
    expect(sampleVelocity([{ t: 0, p: 100 }, { t: 500, p: 0 }, { t: 550, p: 1 }, { t: 600, p: 2 }])).toBeCloseTo(20);
  });

  it('lights and enlarges only the centered row, varying continuously', () => {
    expect(rowAppearance(0)).toMatchObject({ y: 0, scaleY: 1, focus: 1, opacity: 1 });
    expect(rowAppearance(1).y).toBeCloseTo(1);
    expect(rowAppearance(-1).y).toBeCloseTo(-1);
    expect(rowAppearance(1).focus).toBe(0);
    expect(rowAppearance(0.25).focus).toBeCloseTo(0.75);
    expect(rowAppearance(1.5).y).toBeLessThan(1.5); // Rows bend away towards the edges.
    expect(rowAppearance(1.5).opacity).toBeCloseTo(0.5);
    expect(rowAppearance(2).opacity).toBe(0);
  });
});
