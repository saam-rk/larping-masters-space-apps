/**
 * Tiny "hand-drawn" path generator for the background schematics: lines and
 * ellipses are drawn twice with small random bows and overshoots, like chalk
 * or pencil strokes. Seeded so the drawings are identical on every load.
 */

export type Rng = () => number;

/** Deterministic PRNG (mulberry32). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (value: number) => value.toFixed(1);
const jitter = (rng: Rng, amount: number) => (rng() * 2 - 1) * amount;

/** Two slightly different strokes between the same points. */
export function roughLine(rng: Rng, x1: number, y1: number, x2: number, y2: number, wobble = 1.4, passes = 2): string {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / length;
  const ny = (x2 - x1) / length;
  let d = '';
  for (let pass = 0; pass < passes; pass++) {
    const bow = jitter(rng, length * 0.012 + wobble);
    const midX = (x1 + x2) / 2 + nx * bow;
    const midY = (y1 + y2) / 2 + ny * bow;
    const overshoot = pass === 0 ? 0 : jitter(rng, 0.03);
    const ex = x2 + (x2 - x1) * overshoot;
    const ey = y2 + (y2 - y1) * overshoot;
    d += `M${fmt(x1 + jitter(rng, wobble))} ${fmt(y1 + jitter(rng, wobble))}Q${fmt(midX)} ${fmt(midY)} ${fmt(ex + jitter(rng, wobble))} ${fmt(ey + jitter(rng, wobble))}`;
  }
  return d;
}

/** Ellipse drawn as a little more than one loop, with a wobbling radius. */
export function roughEllipse(
  rng: Rng,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDeg = 0,
  passes = 2,
): string {
  const rotation = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const segments = Math.max(24, Math.round((rx + ry) / 6));
  let d = '';
  for (let pass = 0; pass < passes; pass++) {
    const start = rng() * Math.PI * 2;
    const sweep = Math.PI * 2 + 0.15 + rng() * 0.35;
    const phase = rng() * Math.PI * 2;
    const amplitude = 0.012 + rng() * 0.012;
    for (let i = 0; i <= segments; i++) {
      const angle = start + (sweep * i) / segments;
      const wobble = 1 + amplitude * Math.sin(angle * 2 + phase);
      const px = Math.cos(angle) * rx * wobble;
      const py = Math.sin(angle) * ry * wobble;
      const x = cx + px * cos - py * sin;
      const y = cy + px * sin + py * cos;
      d += `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`;
    }
  }
  return d;
}

/** Open arc between two angles (degrees, clockwise from +x in SVG space). */
export function roughArc(rng: Rng, cx: number, cy: number, radius: number, fromDeg: number, toDeg: number): string {
  const segments = Math.max(8, Math.round(Math.abs(toDeg - fromDeg) / 6));
  let d = '';
  for (let i = 0; i <= segments; i++) {
    const angle = ((fromDeg + ((toDeg - fromDeg) * i) / segments) * Math.PI) / 180;
    const r = radius + jitter(rng, radius * 0.01);
    d += `${i === 0 ? 'M' : 'L'}${fmt(cx + Math.cos(angle) * r)} ${fmt(cy + Math.sin(angle) * r)}`;
  }
  return d;
}

/** Parallel hatching strokes clipped to a circle (shaded spheres). */
export function hatchCircle(rng: Rng, cx: number, cy: number, radius: number, angleDeg: number, spacing: number): string {
  const angle = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let d = '';
  for (let offset = -radius + spacing / 2; offset < radius; offset += spacing) {
    const half = Math.sqrt(radius * radius - offset * offset) * (0.88 + rng() * 0.1);
    const ox = cx - dy * offset;
    const oy = cy + dx * offset;
    d += roughLine(rng, ox - dx * half, oy - dy * half, ox + dx * half, oy + dy * half, 0.6, 1);
  }
  return d;
}

/** Short ticks perpendicular to a segment, `count` evenly spaced. */
export function ticks(rng: Rng, x1: number, y1: number, x2: number, y2: number, count: number, size: number): string {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / length) * size;
  const ny = ((x2 - x1) / length) * size;
  let d = '';
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    d += roughLine(rng, x - nx / 2, y - ny / 2, x + nx / 2, y + ny / 2, 0.5, 1);
  }
  return d;
}
