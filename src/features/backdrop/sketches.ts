/**
 * Background schematics: orbits, angles and calculations drawn in a
 * hand-sketched style. Decorative only; the few numbers shown are real
 * reference values (IAU mean lunar radius, mean Earth-Moon distance, lunar
 * orbital inclination, synodic month, and the demo's reference sites), and
 * the formula is the standard altitude relation sin h = sin φ sin δ + cos φ cos δ cos H.
 * Text is language-neutral (symbols, numbers, proper names) so it needs no translation.
 */

import { createRng, hatchCircle, roughArc, roughEllipse, roughLine, ticks, type Rng } from './roughPath';

export interface SketchText {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly text: string;
  readonly rotate?: number;
}

export interface SketchDrawing {
  readonly width: number;
  readonly height: number;
  /** Stroked paths (`d` attributes). */
  readonly strokes: readonly string[];
  /** Small filled dots: [cx, cy, r]. */
  readonly dots: readonly (readonly [number, number, number])[];
  readonly texts: readonly SketchText[];
}

type Builder = (rng: Rng) => Omit<SketchDrawing, 'width' | 'height'>;

function roughRect(rng: Rng, x: number, y: number, w: number, h: number): string {
  return (
    roughLine(rng, x, y, x + w, y) +
    roughLine(rng, x + w, y, x + w, y + h) +
    roughLine(rng, x + w, y + h, x, y + h) +
    roughLine(rng, x, y + h, x, y)
  );
}

function dashed(rng: Rng, x1: number, y1: number, x2: number, y2: number, dashes: number): string {
  let d = '';
  for (let i = 0; i < dashes; i++) {
    const a = i / dashes;
    const b = (i + 0.55) / dashes;
    d += roughLine(rng, x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b, 0.5, 1);
  }
  return d;
}

const orbits: Builder = (rng) => ({
  strokes: [
    roughLine(rng, 20, 215, 680, 215),
    roughEllipse(rng, 350, 215, 290, 120),
    roughEllipse(rng, 355, 215, 118, 32, 12),
    roughEllipse(rng, 355, 212, 40, 40, 0, 2),
    hatchCircle(rng, 355, 212, 38, 72, 5),
    roughLine(rng, 225, 100, 490, 325),
    roughLine(rng, 218, 92, 232, 108, 0.5, 1),
    roughLine(rng, 483, 318, 497, 333, 0.5, 1),
    roughEllipse(rng, 632, 215, 10, 10, 0, 2),
    `M265 45Q520 5 452 392M268 47Q522 9 456 390`,
  ],
  dots: [[470, 50, 4]],
  texts: [
    { x: 415, y: 188, size: 28, text: 'T+03:22:17' },
    { x: 640, y: 196, size: 22, text: '⊕' },
    { x: 60, y: 120, size: 20, text: '1 AU ≈ 1.496·10⁸ km' },
  ],
});

const horizon: Builder = (rng) => {
  const sunX = 400;
  const sunY = 70;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return roughLine(rng, sunX + Math.cos(a) * 19, sunY + Math.sin(a) * 19, sunX + Math.cos(a) * 28, sunY + Math.sin(a) * 28, 0.5, 1);
  }).join('');
  return {
    strokes: [
      roughLine(rng, 20, 240, 420, 240),
      ticks(rng, 20, 240, 420, 240, 10, 8),
      roughLine(rng, 102, 240, 110, 226, 0.4, 1) + roughLine(rng, 110, 226, 118, 240, 0.4, 1),
      roughLine(rng, 110, 240, sunX, sunY),
      dashed(rng, sunX, sunY + 16, sunX, 240, 9),
      roughArc(rng, 110, 240, 82, -30.4, 0),
      roughLine(rng, 110, 240, 110, 60),
      roughLine(rng, 110, 60, 102, 74, 0.5, 1) + roughLine(rng, 110, 60, 118, 74, 0.5, 1),
      roughEllipse(rng, sunX, sunY, 14, 14),
      rays,
    ],
    dots: [],
    texts: [
      { x: 200, y: 232, size: 24, text: 'el' },
      { x: 118, y: 56, size: 22, text: 'Z' },
      { x: 220, y: 128, size: 22, text: 'el = 30.4°', rotate: -30 },
      { x: 330, y: 268, size: 20, text: 'h = 0 km' },
    ],
  };
};

const formula: Builder = (rng) => ({
  strokes: [
    roughLine(rng, 16, 64, 488, 58),
    roughRect(rng, 292, 160, 120, 46),
    roughLine(rng, 190, 186, 282, 184) + roughLine(rng, 282, 184, 270, 176, 0.5, 1) + roughLine(rng, 282, 184, 270, 193, 0.5, 1),
  ],
  dots: [],
  texts: [
    { x: 18, y: 50, size: 30, text: 'sin h = sin φ sin δ + cos φ cos δ cos H' },
    { x: 24, y: 112, size: 28, text: 'φ = −85.44°' },
    { x: 250, y: 112, size: 28, text: 'R☾ = 1737.4 km' },
    { x: 24, y: 192, size: 28, text: 'T = 29.53 d' },
    { x: 306, y: 192, size: 28, text: 'h > 0 ?' },
  ],
});

const earthMoon: Builder = (rng) => ({
  strokes: [
    roughEllipse(rng, 90, 150, 52, 52),
    hatchCircle(rng, 90, 150, 50, 60, 6),
    roughEllipse(rng, 470, 110, 16, 16),
    hatchCircle(rng, 470, 110, 15, 60, 4),
    roughEllipse(rng, 140, 150, 390, 70, -6, 1),
    roughLine(rng, 20, 172, 560, 190),
    roughLine(rng, 90, 150, 520, 104),
    roughArc(rng, 90, 150, 160, -6, 2.5),
    roughLine(rng, 90, 236, 470, 236),
    roughLine(rng, 90, 226, 90, 246, 0.5, 1) + roughLine(rng, 470, 226, 470, 246, 0.5, 1),
  ],
  dots: [],
  texts: [
    { x: 262, y: 150, size: 24, text: 'i = 5.14°' },
    { x: 210, y: 228, size: 26, text: '384 400 km' },
    { x: 66, y: 82, size: 22, text: '⊕' },
    { x: 462, y: 82, size: 22, text: '☾' },
  ],
});

const ladder: Builder = (rng) => {
  const rungs = Array.from({ length: 10 }, (_, i) => {
    const x = 510 - 500 * 0.78 ** i;
    const t = (x - 10) / 500;
    return roughLine(rng, x, 20 + 100 * t, x, 150 - 10 * t, 0.8, 1);
  }).join('');
  return {
    strokes: [roughLine(rng, 10, 20, 510, 120), roughLine(rng, 10, 150, 510, 140), rungs],
    dots: [],
    texts: [],
  };
};

const protractor: Builder = (rng) => {
  let tickPath = '';
  for (let deg = 0; deg <= 180; deg += 10) {
    const a = ((180 + deg) * Math.PI) / 180;
    const inner = deg % 30 === 0 ? 148 : 158;
    tickPath += roughLine(rng, 190 + Math.cos(a) * inner, 190 + Math.sin(a) * inner, 190 + Math.cos(a) * 170, 190 + Math.sin(a) * 170, 0.4, 1);
  }
  const ray = ((180 + 130) * Math.PI) / 180;
  return {
    strokes: [
      roughArc(rng, 190, 190, 170, 180, 360),
      roughArc(rng, 190, 190, 120, 180, 360),
      roughLine(rng, 10, 190, 370, 190),
      tickPath,
      roughLine(rng, 190, 190, 190 + Math.cos(ray) * 178, 190 + Math.sin(ray) * 178),
      roughArc(rng, 190, 190, 46, 310, 360),
      roughLine(rng, 182, 190, 198, 190, 0.3, 1) + roughLine(rng, 190, 182, 190, 198, 0.3, 1),
    ],
    dots: [],
    texts: [
      { x: 350, y: 182, size: 20, text: '0' },
      { x: 180, y: 58, size: 20, text: '90' },
      { x: 14, y: 182, size: 20, text: '180' },
      { x: 246, y: 172, size: 24, text: 'θ' },
    ],
  };
};

const southPole: Builder = (rng) => {
  const nobileAngle = (37.37 * Math.PI) / 180;
  const nx = 160 + Math.sin(nobileAngle) * 70;
  const ny = 160 - Math.cos(nobileAngle) * 70;
  return {
    strokes: [
      roughEllipse(rng, 160, 160, 140, 140),
      roughEllipse(rng, 160, 160, 70, 70),
      roughLine(rng, 160, 12, 160, 308),
      roughLine(rng, 12, 160, 308, 160),
      roughLine(rng, 60, 60, 260, 260, 1, 1),
      roughLine(rng, 260, 60, 60, 260, 1, 1),
      roughEllipse(rng, 162, 158, 13, 12),
      roughEllipse(rng, 104, 118, 12, 10, 20),
      roughEllipse(rng, 214, 232, 10, 9),
      roughLine(rng, nx - 6, ny - 6, nx + 6, ny + 6, 0.4, 1) + roughLine(rng, nx + 6, ny - 6, nx - 6, ny + 6, 0.4, 1),
    ],
    dots: [],
    texts: [
      { x: 168, y: 10, size: 18, text: '0°' },
      { x: 236, y: 154, size: 16, text: '−85°' },
      { x: 268, y: 196, size: 16, text: '−80°' },
      { x: 150, y: 196, size: 20, text: 'Shackleton' },
      { x: nx + 8, y: ny - 6, size: 18, text: 'Nobile' },
    ],
  };
};

const triangle: Builder = (rng) => ({
  strokes: [
    roughLine(rng, 30, 200, 280, 200),
    roughLine(rng, 280, 200, 280, 50),
    roughLine(rng, 280, 50, 30, 200),
    roughLine(rng, 262, 200, 262, 182, 0.4, 1) + roughLine(rng, 262, 182, 280, 182, 0.4, 1),
    roughArc(rng, 30, 200, 56, -31, 0),
  ],
  dots: [],
  texts: [
    { x: 96, y: 192, size: 24, text: 'α' },
    { x: 150, y: 226, size: 22, text: 'a' },
    { x: 290, y: 134, size: 22, text: 'b' },
    { x: 134, y: 112, size: 22, text: 'c' },
    { x: 24, y: 40, size: 26, text: 'tan α = b / a' },
  ],
});

function build(seed: number, width: number, height: number, builder: Builder): SketchDrawing {
  return { width, height, ...builder(createRng(seed)) };
}

/** Depth 0 = far (thin, small shift), 1 = mid (sharp), 2 = near (large, out of focus, larger shift). */
export type SketchDepth = 0 | 1 | 2;

export interface PlacedSketch {
  readonly id: string;
  readonly drawing: SketchDrawing;
  /** Position of the top-left corner, % of the viewport. */
  readonly left: number;
  readonly top: number;
  /** Width in vw (clamped to a minimum in px by the layer). */
  readonly widthVw: number;
  readonly rotate: number;
  readonly depth: SketchDepth;
}

export const SKETCHES: readonly PlacedSketch[] = [
  { id: 'formula', drawing: build(11, 500, 230, formula), left: 3, top: 5, widthVw: 30, rotate: -4, depth: 1 },
  { id: 'south-pole', drawing: build(23, 320, 320, southPole), left: 36, top: 14, widthVw: 17, rotate: 8, depth: 0 },
  { id: 'horizon', drawing: build(37, 440, 280, horizon), left: 64, top: 3, widthVw: 30, rotate: 3, depth: 1 },
  { id: 'protractor', drawing: build(41, 380, 210, protractor), left: 80, top: 34, widthVw: 24, rotate: 16, depth: 2 },
  { id: 'orbits', drawing: build(53, 700, 400, orbits), left: -4, top: 52, widthVw: 48, rotate: -7, depth: 1 },
  { id: 'earth-moon', drawing: build(67, 560, 270, earthMoon), left: 56, top: 63, widthVw: 38, rotate: 4, depth: 0 },
  { id: 'ladder', drawing: build(71, 520, 170, ladder), left: 34, top: 80, widthVw: 44, rotate: -14, depth: 2 },
  { id: 'triangle', drawing: build(83, 320, 230, triangle), left: 30, top: 44, widthVw: 16, rotate: -10, depth: 0 },
];
