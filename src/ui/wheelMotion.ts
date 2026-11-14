/**
 * Motion of a number wheel's reel, kept free of React and the DOM so it can be
 * tested on its own.
 *
 * The reel position is a real number in value units (`12.4` is 40% of the way
 * from 12 to 13) and is not wrapped: a cyclic wheel can sit at 61 or -3 and
 * shows the equivalent value. Two kinds of motion bring it to rest on a whole
 * number:
 *
 * - a critically damped spring towards a target, which keeps the current
 *   velocity (so retargeting mid-motion stays smooth) and never overshoots
 *   when starting from rest;
 * - a fling: after a swipe the reel keeps the release velocity and slows down
 *   exponentially (constant friction), ending exactly on a whole number.
 */

export interface Motion {
  readonly position: number;
  /** Rows per second. */
  readonly velocity: number;
}

/** Spring stiffness (rad/s): higher settles faster. */
export const SPRING_OMEGA = 13;
/** Slower spring for rolls set from outside (LIVE, a picked value), so the travel stays visible. */
export const ROLL_OMEGA = 8;
/** Time constant of the fling friction, s: a swipe released at v rows/s travels about v × this. */
export const FLING_TAU = 0.32;
/** Below this speed (rows/s) a release only snaps to the nearest row. */
export const FLING_MIN_SPEED = 1.5;
/** Fastest fling, rows/s. */
export const FLING_MAX_SPEED = 45;
/** Fraction of a drag past the end of a non-cyclic wheel that still moves the reel. */
export const OVERSCROLL_RESISTANCE = 0.3;

/** Angle between neighboring rows on the drum. */
const DRUM_ROW_ANGLE = Math.PI / 7;

/** Close enough to the target to stop. */
const REST_DISTANCE = 0.002;
const REST_SPEED = 0.05;

/** Advances a critically damped spring towards `target` by `dt` seconds (exact solution, stable for any step). */
export function springStep(motion: Motion, target: number, dt: number, omega = SPRING_OMEGA): Motion {
  const offset = motion.position - target;
  const b = motion.velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  return {
    position: target + (offset + b * dt) * decay,
    velocity: (motion.velocity - omega * b * dt) * decay,
  };
}

export function atRest(motion: Motion, target: number): boolean {
  return Math.abs(motion.position - target) < REST_DISTANCE && Math.abs(motion.velocity) < REST_SPEED;
}

export interface Fling {
  readonly from: number;
  /** Signed distance to travel, ending on a whole number. */
  readonly distance: number;
  /** Friction time constant, s. */
  readonly tau: number;
}

/**
 * Plans the coast after a swipe released at `position` with `velocity`, or
 * returns null when a plain snap (spring) suits better: too slow, or the
 * nearest stop is behind the motion.
 */
export function planFling(
  position: number,
  velocity: number,
  bounds: { readonly min: number; readonly max: number } | null,
): Fling | null {
  const speed = Math.min(Math.abs(velocity), FLING_MAX_SPEED);
  if (speed < FLING_MIN_SPEED) return null;
  const v = Math.sign(velocity) * speed;
  let stop = Math.round(position + v * FLING_TAU);
  if (bounds) stop = Math.min(bounds.max, Math.max(bounds.min, stop));
  const distance = stop - position;
  if (Math.sign(distance) !== Math.sign(v) || Math.abs(distance) < 0.5) return null;
  // Friction chosen so the coast starts at the release velocity and ends on `stop`.
  const tau = distance / v;
  return { from: position, distance, tau };
}

/** Position and velocity of a fling `elapsed` seconds after release; `done` once it is on its stop. */
export function flingAt(fling: Fling, elapsed: number): Motion & { readonly done: boolean } {
  const decay = Math.exp(-elapsed / fling.tau);
  const remaining = fling.distance * decay;
  const done = Math.abs(remaining) < REST_DISTANCE;
  return {
    position: done ? fling.from + fling.distance : fling.from + fling.distance - remaining,
    velocity: done ? 0 : remaining / fling.tau,
    done,
  };
}

/** The value a whole reel position shows: wrapped into `[min, max]` for a cyclic wheel. */
export function wrapValue(position: number, min: number, max: number): number {
  const count = max - min + 1;
  return min + ((((position - min) % count) + count) % count);
}

/**
 * Reel position for `value` closest to `from`: a cyclic wheel takes the
 * shortest way round (59 → 01 goes forward through 00), a non-cyclic one goes
 * straight there.
 */
export function nearestPosition(value: number, from: number, min: number, max: number, wrap: boolean): number {
  if (!wrap) return value;
  const count = max - min + 1;
  return value + Math.round((from - value) / count) * count;
}

/** Drag position with resistance past the ends of a non-cyclic wheel. */
export function resistOverscroll(position: number, min: number, max: number): number {
  if (position < min) return min - (min - position) * OVERSCROLL_RESISTANCE;
  if (position > max) return max + (position - max) * OVERSCROLL_RESISTANCE;
  return position;
}

/** Estimates velocity (units/s) from recent samples, ignoring those older than `window` ms before the last. */
export function sampleVelocity(samples: readonly { readonly t: number; readonly p: number }[], window = 90): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find((sample) => last.t - sample.t <= window) ?? last;
  const dt = (last.t - first.t) / 1000;
  return dt > 0 ? (last.p - first.p) / dt : 0;
}

/**
 * Look of a row `offset` rows from the center slot, as on a drum seen from
 * the front: rows bend away (closer together, flattened) towards the edges,
 * and only the centered row is full size and lit. `focus` is 1 in the slot
 * and 0 one row away, varying continuously as the reel turns.
 */
export function rowAppearance(offset: number): {
  /** Distance from the center, in rows. */
  readonly y: number;
  readonly scaleY: number;
  readonly focus: number;
  readonly opacity: number;
} {
  const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, offset * DRUM_ROW_ANGLE));
  const distance = Math.abs(offset);
  return {
    y: Math.sin(angle) / Math.sin(DRUM_ROW_ANGLE),
    scaleY: Math.cos(angle),
    focus: Math.max(0, 1 - distance),
    opacity: 1 - Math.min(1, Math.max(0, distance - 1)),
  };
}
