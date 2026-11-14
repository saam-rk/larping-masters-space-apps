/**
 * Hyperspace streaks drawn inside the local horizon box while new
 * coordinates load or the view switches: stars rush toward the viewer, fade
 * in from the distance and fade out toward the vanishing point so the center
 * stays calm. In reverse (pulling back, first to third person) the same
 * stream runs backward: stars come in from the edges and recede into the
 * distance. `tempo` scales how fast the jump builds up and settles.
 *
 * The canvas has its own animation loop that runs only while the jump is
 * active or slowing down; at rest it is cleared and costs no frames.
 */

import { useEffect, useRef } from 'react';

interface Streak {
  x: number;
  y: number;
  z: number;
  readonly near: boolean;
}

const MAX_DPR = 1.5;
const PIXELS_PER_STAR = 900;
const MAX_STARS = 900;
const OVERSCAN = 1.15;
const SPEED = 1.7; // Depth units per second at full speed.
const ACCEL = 1.6; // 1/s
const DECEL = 1.3; // 1/s
const RESPAWN_Z = [0.9, 1.25] as const;
/** Closest depth before a star is recycled (forward) or where it reappears (reverse). */
const NEAR_Z = 0.04;
const FADE_IN_DEPTH = 0.6;
/** Opacity steps used to batch streaks into a few strokes. */
const BANDS = 5;
const ALPHA = { near: 0.75, far: 0.45 } as const;
const COLOR = { near: '205, 255, 225', far: '120, 220, 160' } as const;
/** Center fade, as fractions of the half-diagonal. */
const CENTER_FADE = { inner: 0.04, outer: 0.55 } as const;

function random(min: number, max: number) {
  return min + Math.random() * (max - min);
}

interface HyperspaceProps {
  readonly active: boolean;
  /** Stars recede toward the vanishing point instead of rushing past. */
  readonly reverse?: boolean;
  /** Multiplies acceleration and deceleration (1 = coordinate update). */
  readonly tempo?: number;
}

export function Hyperspace({ active, reverse = false, tempo = 1 }: HyperspaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(0);
  const styleRef = useRef({ reverse, tempo });
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let focal = 1;
    let stars: Streak[] = [];
    let bands = new Uint8Array(0);
    let speed = 0;
    let frameId: number | null = null;
    let lastTime = 0;

    function scatter(star: Streak, z: number) {
      star.z = z;
      star.x = random(-1, 1) * ((z * width) / 2 / focal) * OVERSCAN;
      star.y = random(-1, 1) * ((z * height) / 2 / focal) * OVERSCAN;
    }

    function resize() {
      if (!canvas || !context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      focal = Math.max(width, height) / 2;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_STARS, Math.round((width * height) / PIXELS_PER_STAR));
      stars = Array.from({ length: count }, (_, index) => {
        const star: Streak = { x: 0, y: 0, z: 1, near: index % 10 < 3 };
        scatter(star, random(0.3, 1.2));
        return star;
      });
      bands = new Uint8Array(stars.length);
    }

    function draw(dt: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      if (speed <= 0) return;

      const velocity = speed * speed * SPEED;
      const streak = Math.min(0.5, 0.02 + velocity * 0.16);
      const cx = width / 2;
      const cy = height / 2;

      const { reverse } = styleRef.current;
      stars.forEach((star, index) => {
        if (reverse) {
          star.z += velocity * dt;
          // Mirror of the forward recycle: reappear close by (mostly off-screen) and flow inward.
          if (star.z > RESPAWN_Z[1]) {
            scatter(star, random(...RESPAWN_Z));
            star.z = NEAR_Z;
          }
        } else {
          star.z -= velocity * dt;
          if (star.z < NEAR_Z) scatter(star, random(...RESPAWN_Z));
        }
        const fadeIn = Math.min(1, Math.max(0, (RESPAWN_Z[1] - star.z) / FADE_IN_DEPTH));
        bands[index] = Math.round(fadeIn * BANDS);
      });

      context.lineCap = 'round';
      for (const near of [false, true]) {
        const layer = near ? 'near' : 'far';
        context.lineWidth = near ? 1.5 : 1;
        for (let band = 1; band <= BANDS; band++) {
          context.beginPath();
          stars.forEach((star, index) => {
            if (star.near !== near || bands[index] !== band) return;
            // The tail points back where the star came from: farther (forward) or closer (reverse).
            const tail = reverse ? star.z * (1 - streak) : star.z * (1 + streak);
            context.moveTo(cx + (star.x / tail) * focal, cy + (star.y / tail) * focal);
            context.lineTo(cx + (star.x / star.z) * focal, cy + (star.y / star.z) * focal);
          });
          const alpha = ALPHA[layer] * Math.min(1, speed * 1.6) * (band / BANDS);
          context.strokeStyle = `rgba(${COLOR[layer]}, ${alpha.toFixed(3)})`;
          context.stroke();
        }
      }

      const radius = Math.hypot(cx, cy) * CENTER_FADE.outer;
      const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(CENTER_FADE.inner / CENTER_FADE.outer, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }

    function step(time: number) {
      const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 1 / 60);
      lastTime = time;
      const target = targetRef.current;
      const { tempo } = styleRef.current;
      if (speed < target) speed = Math.min(target, speed + ACCEL * tempo * dt);
      else if (speed > target) speed = Math.max(target, speed - DECEL * tempo * dt);
      draw(dt);
      if (speed === 0 && target === 0) {
        frameId = null;
        lastTime = 0;
      } else {
        frameId = requestAnimationFrame(step);
      }
    }

    wakeRef.current = () => {
      if (frameId === null) frameId = requestAnimationFrame(step);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (targetRef.current > 0) wakeRef.current();

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
      wakeRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    styleRef.current = { reverse, tempo };
  }, [reverse, tempo]);

  useEffect(() => {
    targetRef.current = active ? 1 : 0;
    wakeRef.current();
  }, [active]);

  return <canvas ref={canvasRef} className="hyperspace" aria-hidden="true" />;
}
