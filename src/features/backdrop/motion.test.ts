import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MotionFrame } from './motion';

type FrameCallback = (time: number) => void;

let pending: FrameCallback[] = [];
let now = 0;
let pointerListener: ((event: { clientX: number; clientY: number }) => void) | null = null;

/** Runs queued animation frames, 16 ms apart, until the loop sleeps or `limit` is hit. */
function runFrames(limit = 1000): number {
  let count = 0;
  while (pending.length > 0 && count < limit) {
    const callbacks = pending;
    pending = [];
    now += 16;
    callbacks.forEach((callback) => callback(now));
    count++;
  }
  return count;
}

beforeEach(() => {
  vi.resetModules();
  pending = [];
  now = 0;
  pointerListener = null;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameCallback) => {
    pending.push(callback);
    return pending.length;
  });
  vi.stubGlobal('window', {
    innerWidth: 1000,
    innerHeight: 500,
    addEventListener: (_type: string, listener: typeof pointerListener) => {
      pointerListener = listener;
    },
    removeEventListener: () => {
      pointerListener = null;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('motion loop', () => {
  it('eases toward the pointer and stops when settled', async () => {
    const motion = await import('./motion');
    const frames: MotionFrame[] = [];
    motion.subscribeMotion((frame) => frames.push(frame));
    motion.setParallaxEnabled(true);
    runFrames();

    pointerListener?.({ clientX: 1000, clientY: 0 }); // right edge, top edge
    runFrames(2);
    const early = frames.at(-1)!;
    expect(early.pointerX).toBeGreaterThan(0);
    expect(early.pointerX).toBeLessThan(0.5); // smoothed, not a jump

    runFrames();
    expect(frames.at(-1)?.pointerX).toBeCloseTo(1, 2);
    expect(frames.at(-1)?.pointerY).toBeCloseTo(-1, 2);
    expect(pending.length).toBe(0);
  });
});
