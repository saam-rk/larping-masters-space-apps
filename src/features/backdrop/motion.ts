/**
 * One shared animation loop for the background layers.
 *
 * It smooths the pointer position (for parallax) and the warp speed (for the
 * "jump to new coordinates" effect) and notifies subscribers. The loop stops
 * as soon as nothing changes, so an idle page costs no frames.
 */

export interface MotionFrame {
  /** Smoothed pointer position, -1..1 on each axis (0 = viewport center). */
  readonly pointerX: number;
  readonly pointerY: number;
  /** 0 = at rest, 1 = full warp speed. */
  readonly warp: number;
  /** Seconds since the previous frame (clamped). */
  readonly dt: number;
}

type Listener = (frame: MotionFrame) => void;

const POINTER_SMOOTHING = 5; // 1/s; lower is lazier.
const WARP_ACCEL = 1.6; // 1/s
const WARP_DECEL = 1.1; // 1/s
const EPSILON = 0.0005;

const listeners = new Set<Listener>();
let targetX = 0;
let targetY = 0;
let pointerX = 0;
let pointerY = 0;
let warpTarget = 0;
let warp = 0;
let parallaxEnabled = false;
let frameId: number | null = null;
let lastTime = 0;

function step(time: number) {
  const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 1 / 60);
  lastTime = time;

  const blend = 1 - Math.exp(-POINTER_SMOOTHING * dt);
  pointerX += (targetX - pointerX) * blend;
  pointerY += (targetY - pointerY) * blend;

  if (warp < warpTarget) warp = Math.min(warpTarget, warp + WARP_ACCEL * dt);
  else if (warp > warpTarget) warp = Math.max(warpTarget, warp - WARP_DECEL * dt);

  const frame: MotionFrame = { pointerX, pointerY, warp, dt };
  listeners.forEach((listener) => listener(frame));

  const settled =
    Math.abs(targetX - pointerX) < EPSILON && Math.abs(targetY - pointerY) < EPSILON && warp === warpTarget && warp === 0;
  if (settled) {
    frameId = null;
    lastTime = 0;
  } else {
    frameId = requestAnimationFrame(step);
  }
}

function wake() {
  if (frameId === null && listeners.size > 0) frameId = requestAnimationFrame(step);
}

function handlePointerMove(event: PointerEvent) {
  targetX = (event.clientX / window.innerWidth) * 2 - 1;
  targetY = (event.clientY / window.innerHeight) * 2 - 1;
  wake();
}

/** Enables or disables pointer parallax; disabled layers drift back to center. */
export function setParallaxEnabled(enabled: boolean) {
  if (enabled === parallaxEnabled) return;
  parallaxEnabled = enabled;
  if (enabled) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
  } else {
    window.removeEventListener('pointermove', handlePointerMove);
    targetX = 0;
    targetY = 0;
  }
  wake();
}

/** Starts (true) or ends (false) the warp; speed ramps smoothly either way. */
export function setWarp(active: boolean) {
  warpTarget = active ? 1 : 0;
  wake();
}

export function subscribeMotion(listener: Listener): () => void {
  listeners.add(listener);
  // Give new subscribers the current state right away.
  listener({ pointerX, pointerY, warp, dt: 0 });
  wake();
  return () => {
    listeners.delete(listener);
  };
}
