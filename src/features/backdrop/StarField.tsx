/**
 * Two star layers on one 2D canvas, with pointer parallax (near stars move
 * more than far ones). Redraws only when the shared motion loop reports a
 * change; with parallax off (low performance) it is drawn once per resize.
 *
 * Resizes (browser zoom, window size) are applied once per frame and keep the
 * same stars: each star is placed in viewport-relative coordinates once, and
 * a resize only rescales them and shows more or fewer of them for the new area.
 *
 * A barrel distortion (`STAR_BARREL`) is applied in the projection itself (no extra
 * pass), so the starfield bulges like an old CRT tube.
 */

import { useEffect, useRef } from 'react';
import { STAR_BARREL } from './curvature';
import { subscribeMotion, type MotionFrame } from './motion';

interface Star {
  /** Position across the (overscanned) viewport, -1 … 1; fixed for the visit. */
  readonly u: number;
  readonly v: number;
  /** Position in the current viewport, from `u`, `v` and `z` (see `place`). */
  x: number;
  y: number;
  readonly z: number;
  readonly near: boolean;
  readonly size: number;
  readonly alpha: number;
}

const PARALLAX_PX = 38; // Max shift of the nearest stars, in CSS pixels.
const MAX_DPR = 1.5;
const MAX_STARS = 1400;
const PIXELS_PER_STAR = 1400;
/** Stars are scattered a bit beyond the screen so parallax never reveals an empty edge. */
const OVERSCAN = 1.2;
const NEAR_Z = [0.35, 0.55] as const;
const FAR_Z = [0.75, 1] as const;

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Places a star at depth `z` so its projection lands uniformly on screen. */
function place(star: Star, width: number, height: number, focal: number) {
  star.x = star.u * ((star.z * width) / 2 / focal) * OVERSCAN;
  star.y = star.v * ((star.z * height) / 2 / focal) * OVERSCAN;
}

/** Every star the field can show; the first ones fill smaller viewports (30 % near in any prefix). */
function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const near = index % 10 < 3;
    return {
      u: random(-1, 1),
      v: random(-1, 1),
      x: 0,
      y: 0,
      z: near ? random(...NEAR_Z) : random(...FAR_Z),
      near,
      size: near ? random(1.1, 1.9) : random(0.6, 1.1),
      alpha: near ? random(0.55, 0.95) : random(0.25, 0.6),
    };
  });
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let focal = 1;
    const allStars = createStars(MAX_STARS);
    let stars: Star[] = [];
    let resizeFrame: number | null = null;
    let lastFrame: MotionFrame = { pointerX: 0, pointerY: 0 };

    function project(x: number, y: number, z: number, shiftX: number, shiftY: number): [number, number] {
      const cx = width / 2;
      const cy = height / 2;
      const depthShift = 0.35 / z;
      const dx = (x / z) * focal + shiftX * depthShift;
      const dy = (y / z) * focal + shiftY * depthShift;
      const r2 = (dx * dx + dy * dy) / (cx * cx + cy * cy);
      const k = 1 - STAR_BARREL * r2;
      return [cx + dx * k, cy + dy * k];
    }

    function draw(frame: MotionFrame) {
      if (!context) return;
      const shiftX = -frame.pointerX * PARALLAX_PX;
      const shiftY = -frame.pointerY * PARALLAX_PX;

      context.clearRect(0, 0, width, height);

      for (const near of [false, true]) {
        context.fillStyle = near ? '#e6fff0' : '#b9d8c4';
        for (const star of stars) {
          if (star.near !== near) continue;
          const [x, y] = project(star.x, star.y, star.z, shiftX, shiftY);
          if (x < -2 || y < -2 || x > width + 2 || y > height + 2) continue;
          context.globalAlpha = star.alpha;
          context.fillRect(x, y, star.size, star.size);
        }
      }
      context.globalAlpha = 1;
    }

    function resize() {
      resizeFrame = null;
      if (!canvas || !context) return;
      // Device pixels, capped: below 1 when zoomed out, so the buffer never exceeds the screen.
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const bufferWidth = Math.round(window.innerWidth * dpr);
      const bufferHeight = Math.round(window.innerHeight * dpr);
      if (window.innerWidth === width && window.innerHeight === height && canvas.width === bufferWidth && canvas.height === bufferHeight) return;
      width = window.innerWidth;
      height = window.innerHeight;
      focal = Math.max(width, height) / 2;
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = allStars.slice(0, Math.min(MAX_STARS, Math.round((width * height) / PIXELS_PER_STAR)));
      for (const star of stars) place(star, width, height, focal);
      draw(lastFrame);
    }

    // One resize per frame, however many resize events arrive in it.
    const onResize = () => {
      if (resizeFrame === null) resizeFrame = requestAnimationFrame(resize);
    };

    resize();
    window.addEventListener('resize', onResize);

    const unsubscribe = subscribeMotion((frame) => {
      lastFrame = frame;
      draw(frame);
    });

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      unsubscribe();
    };
  }, []);

  return <canvas ref={canvasRef} className="backdrop__stars" aria-hidden="true" />;
}
