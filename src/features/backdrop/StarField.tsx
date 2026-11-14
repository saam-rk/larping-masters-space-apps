/**
 * Two star layers on one 2D canvas, with pointer parallax (near stars move
 * more than far ones) and the warp streaks shown while new coordinates load.
 * Redraws only when the shared motion loop reports a change.
 *
 * Warp look: streaks are dimmer than the resting stars, fade in as new stars
 * appear in the distance, and fade out toward the vanishing point in the
 * center, so the middle of the screen stays dark and calm.
 *
 * A mild barrel distortion is applied in the projection itself (no extra
 * pass), so the starfield bulges slightly like an old CRT tube.
 */

import { useEffect, useRef } from 'react';
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
const BARREL = 0.07;
const MAX_DPR = 1.5;
const MAX_STARS = 1400;
const PIXELS_PER_STAR = 1400;
/** Stars are scattered a bit beyond the screen so parallax never reveals an empty edge. */
const OVERSCAN = 1.2;
const NEAR_Z = [0.35, 0.55] as const;
const FAR_Z = [0.75, 1] as const;

const WARP_SPEED = 1.7; // Depth units per second at full warp.
const WARP_RESPAWN_Z = [0.9, 1.25] as const;
/** Peak streak opacity at full warp (kept low: the streaks are a backdrop). */
const WARP_ALPHA = { near: 0.5, far: 0.3 } as const;
const WARP_COLOR = { near: '200, 222, 240', far: '150, 182, 208' } as const;
/** Depth over which a respawned star fades in (from the far end inward). */
const WARP_FADE_IN_DEPTH = 0.6;
/** Opacity steps used to batch streaks into a few strokes. */
const WARP_BANDS = 5;
/**
 * Center fade, as fractions of the half-diagonal: fully erased inside
 * `inner`, fully visible beyond `outer`.
 */
const CENTER_FADE = { inner: 0.05, outer: 0.6 } as const;

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
    let bands: Uint8Array = new Uint8Array(0);
    let lastFrame: MotionFrame = { pointerX: 0, pointerY: 0, warp: 0, dt: 0 };

    function project(x: number, y: number, z: number, shiftX: number, shiftY: number): [number, number] {
      const cx = width / 2;
      const cy = height / 2;
      const depthShift = 0.35 / z;
      const dx = (x / z) * focal + shiftX * depthShift;
      const dy = (y / z) * focal + shiftY * depthShift;
      const r2 = (dx * dx + dy * dy) / (cx * cx + cy * cy);
      const k = 1 - BARREL * r2;
      return [cx + dx * k, cy + dy * k];
    }

    function drawWarp(frame: MotionFrame, speed: number, shiftX: number, shiftY: number) {
      if (!context) return;
      const { warp, dt } = frame;
      const streak = Math.min(0.5, speed * 0.16);

      // Move stars toward the viewer and bucket them by fade-in opacity.
      stars.forEach((star, index) => {
        star.z -= speed * dt;
        if (star.z < 0.04) scatter(star, random(...WARP_RESPAWN_Z), width, height, focal);
        const fadeIn = Math.min(1, Math.max(0, (WARP_RESPAWN_Z[1] - star.z) / WARP_FADE_IN_DEPTH));
        bands[index] = Math.round(fadeIn * WARP_BANDS);
      });

      context.lineCap = 'round';
      for (const near of [false, true]) {
        const layer = near ? 'near' : 'far';
        context.lineWidth = near ? 1.4 : 0.9;
        for (let band = 1; band <= WARP_BANDS; band++) {
          context.beginPath();
          stars.forEach((star, index) => {
            if (star.near !== near || bands[index] !== band) return;
            const [x1, y1] = project(star.x, star.y, star.z + streak * star.z, shiftX, shiftY);
            const [x2, y2] = project(star.x, star.y, star.z, shiftX, shiftY);
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
          });
          const alpha = WARP_ALPHA[layer] * (0.35 + 0.65 * warp) * (band / WARP_BANDS);
          context.strokeStyle = `rgba(${WARP_COLOR[layer]}, ${alpha.toFixed(3)})`;
          context.stroke();
        }
      }

      // Fade toward the vanishing point: erase with a radial gradient.
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.hypot(cx, cy) * CENTER_FADE.outer;
      const strength = Math.min(1, warp * 1.4);
      const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      gradient.addColorStop(CENTER_FADE.inner / CENTER_FADE.outer, `rgba(0, 0, 0, ${strength})`);
      gradient.addColorStop(0.55, `rgba(0, 0, 0, ${(strength * 0.45).toFixed(3)})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }

    function draw(frame: MotionFrame) {
      if (!context) return;
      const shiftX = -frame.pointerX * PARALLAX_PX;
      const shiftY = -frame.pointerY * PARALLAX_PX;
      const speed = frame.warp * frame.warp * WARP_SPEED;

      context.clearRect(0, 0, width, height);

      if (speed > 0.01) {
        drawWarp(frame, speed, shiftX, shiftY);
        return;
      }

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
      bands = new Uint8Array(stars.length);
      draw({ ...lastFrame, dt: 0 });
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
