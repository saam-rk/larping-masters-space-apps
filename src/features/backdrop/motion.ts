/**
 * One shared animation loop for the background layers.
 *
 * It smooths the pointer position (for parallax) and notifies subscribers.
 * The loop stops as soon as the layers settle, so an idle page costs no
 * frames. With parallax disabled (low performance) it never runs.
 */

export interface MotionFrame {
  /** Smoothed pointer position, -1..1 on each axis (0 = viewport center). */
  readonly pointerX: number;
  readonly pointerY: number;
}

type Listener = (frame: MotionFrame) => void;

const POINTER_SMOOTHING = 5; // 1/s; lower is lazier.
const EPSILON = 0.0005;

const listeners = new Set<Listener>();
let targetX = 0;
let targetY = 0;
let pointerX = 0;
let pointerY = 0;
let parallaxEnabled = false;
let frameId: number | null = null;
let lastTime = 0;

function step(time: number) {
  const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 1 / 60);
  lastTime = time;

  const blend = 1 - Math.exp(-POINTER_SMOOTHING * dt);
  pointerX += (targetX - pointerX) * blend;
  pointerY += (targetY - pointerY) * blend;

  const frame: MotionFrame = { pointerX, pointerY };
  listeners.forEach((listener) => listener(frame));

  const settled = Math.abs(targetX - pointerX) < EPSILON && Math.abs(targetY - pointerY) < EPSILON;
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

export function subscribeMotion(listener: Listener): () => void {
  listeners.add(listener);
  // Give new subscribers the current state right away.
  listener({ pointerX, pointerY });
  wake();
  return () => {
    listeners.delete(listener);
  };
}
