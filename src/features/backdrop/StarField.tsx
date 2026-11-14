/**
 * Two star layers on one 2D canvas, with pointer parallax (near stars move
 * more than far ones). Redraws only when the shared motion loop reports a
 * change; with parallax off (low performance) it is drawn once per resize.
 *
 * A barrel distortion (`STAR_BARREL`) is applied in the projection itself (no extra
 * pass), so the starfield bulges like an old CRT tube.
 */

import { useEffect, useRef } from 'react';
import { STAR_BARREL } from './curvature';
import { subscribeMotion, type MotionFrame } from './motion';

interface Star {
  x: number;
  y: number;
  z: number;
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
function scatter(star: Star, z: number, width: number, height: number, focal: number) {
  star.z = z;
  star.x = random(-1, 1) * ((z * width) / 2 / focal) * OVERSCAN;
  star.y = random(-1, 1) * ((z * height) / 2 / focal) * OVERSCAN;
}

function createStars(count: number, width: number, height: number, focal: number): Star[] {
  return Array.from({ length: count }, (_, index) => {
    const near = index % 10 < 3;
    const star: Star = {
      x: 0,
      y: 0,
      z: 1,
      near,
      size: near ? random(1.1, 1.9) : random(0.6, 1.1),
      alpha: near ? random(0.55, 0.95) : random(0.25, 0.6),
    };
    scatter(star, near ? random(...NEAR_Z) : random(...FAR_Z), width, height, focal);
    return star;
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
    let stars: Star[] = [];
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
      if (!canvas || !context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      focal = Math.max(width, height) / 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(Math.min(MAX_STARS, Math.round((width * height) / PIXELS_PER_STAR)), width, height, focal);
      draw(lastFrame);
    }

    resize();
    window.addEventListener('resize', resize);

    const unsubscribe = subscribeMotion((frame) => {
      lastFrame = frame;
      draw(frame);
    });

    return () => {
      window.removeEventListener('resize', resize);
      unsubscribe();
    };
  }, []);

  return <canvas ref={canvasRef} className="backdrop__stars" aria-hidden="true" />;
}
