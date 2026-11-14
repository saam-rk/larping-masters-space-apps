/**
 * Pure parts of the CRT screen curvature: the barrel strength shared by the
 * displacement filter and the star field, and the performance probe that
 * decides whether the browser can afford the filter.
 */

/**
 * Barrel strength: a pixel at normalized radius r (distance from the center
 * over the half-diagonal) samples the source at `fit·(1 + STRENGTH·r²)` times
 * its distance from the center, with `fit` from `barrelFit`. At 1920×1080 the
 * interface is drawn up to ~100 px away from where it reacts at the corners
 * (see `maxShift`), which is the price of the exaggerated bulge.
 */
export const CURVATURE_STRENGTH = 0.12;

/** The star field bends a little more than the filter so the stars hug the bulging glass. */
export const STAR_BARREL = 0.2;

/**
 * Uniform scale applied to the sampling radius so that the top and bottom edge
 * midpoints keep their place: without it the barrel would pull content in from
 * outside the frame and crop the edge rows of the interface. The sides, which
 * are wider, show a dark gap instead, hidden by the bezel.
 */
export function barrelFit(width: number, height: number, strength = CURVATURE_STRENGTH): number {
  const radius2 = (height * height) / (width * width + height * height);
  return 1 / (1 + strength * radius2);
}

/**
 * Where the filter takes the pixel at offset (dx, dy) from the frame center
 * from, as an offset from that pixel: `[dx, dy] * (fit·(1 + strength·r²) - 1)`.
 * This is the single definition of the distortion: the displacement map and the
 * pointer remapping (`curvaturePointer.ts`) both use it, so a control is
 * clickable exactly where it is drawn.
 */
export function barrelShift(
  dx: number,
  dy: number,
  width: number,
  height: number,
  strength = CURVATURE_STRENGTH,
): readonly [number, number] {
  const halfDiagonal2 = (width * width + height * height) / 4;
  const sampleScale = barrelFit(width, height, strength) * (1 + (strength * (dx * dx + dy * dy)) / halfDiagonal2) - 1;
  return [dx * sampleScale, dy * sampleScale];
}

/**
 * Which channel of the displacement map carries which axis.
 *
 * The map must survive the browser's colour management: a PNG used by
 * `feImage` is converted from sRGB to the display profile, and on a wide-gamut
 * or profiled screen that mixes the colour channels (measured on a Display P3
 * screen: the R channel comes out at ~0.82 of its value, G at ~0.97), so the
 * shifts near the screen edges were up to ~30% smaller than computed and the
 * hit areas no longer matched what was drawn. Neutral greys are unchanged by
 * such conversions and alpha is never converted, so one axis is stored as a
 * grey (R = G = B, read through `R`) and the other in alpha (read through
 * `A`). The axis with the larger shifts takes the grey: alpha stays near 0.5
 * for the smaller one, which keeps the premultiplied grey precise.
 */
export interface MapChannels {
  readonly x: 'R' | 'A';
  readonly y: 'R' | 'A';
}

export function mapChannels(width: number, height: number): MapChannels {
  return width >= height ? { x: 'R', y: 'A' } : { x: 'A', y: 'R' };
}

/** Byte of the displacement map for a shift: 0.5 means no shift and ±0.5 reaches ±scale / 2. */
export function encodeShift(shift: number, scale: number): number {
  return Math.min(255, Math.max(0, Math.round(255 * (0.5 + shift / scale))));
}

/**
 * Firefox cannot afford the curvature filter: its WebRender engine has no
 * accelerated path for `feDisplacementMap` and `feImage`, so the whole frame
 * is filtered on the CPU on every repaint (see `PROBE`). Chromium browsers
 * (Edge, Chrome) run it on the GPU.
 */
export function isFirefox(userAgent: string): boolean {
  return /\bFirefox\/\d/.test(userAgent);
}

/** Largest displacement of the filter for a viewport, px, along the longer axis. */
export function maxShift(width: number, height: number, strength = CURVATURE_STRENGTH): number {
  const fit = barrelFit(width, height, strength);
  const sampleScale = Math.max(Math.abs(fit - 1), Math.abs(fit * (1 + strength) - 1));
  return (Math.max(width, height) / 2) * sampleScale;
}

/**
 * Performance probe. With the filter on, the page repaints a tiny element
 * once per animation frame and records the frame intervals.
 *
 * Why: Chromium (Edge, Chrome) runs `feDisplacementMap` on the GPU, so each
 * repaint inside the filtered frame is cheap. Firefox has no GPU path for it
 * and runs the displacement on the CPU over the whole frame: measured on
 * Firefox 160 at 1601×815 CSS px (device pixel ratio 1.5) it took ~140 ms per
 * repaint (8 fps) against ~6 ms without the filter. Any change inside the
 * frame (hover, typing, the pulsing update button, orbiting the 3D view)
 * repaints it, so the whole interface lagged.
 */
export const PROBE = {
  /** Frame intervals ignored while the filter warms up (map decode, first raster). */
  warmupFrames: 4,
  /** Frame intervals evaluated after the warm-up. */
  sampleFrames: 8,
  /** An interval above this (about 22 fps) counts as slow. */
  slowFrameMs: 45,
  /** This many slow intervals mean the filter is too expensive here. */
  slowFramesToFail: 4,
  /**
   * The probe waits for the page to settle: the page load itself (3D library
   * parse, WebGL and shader setup, fonts) produces slow frames that have
   * nothing to do with the filter and used to switch the curvature off a
   * moment after it appeared. Settled means this many consecutive frames
   * shorter than `calmFrameMs`, or `settleTimeoutMs` since the probe started.
   */
  calmFrames: 10,
  calmFrameMs: 34,
  settleTimeoutMs: 4000,
} as const;

/** True when the latest frame intervals show a quiet main thread (`PROBE.calmFrames` short frames in a row). */
export function isCalm(deltasMs: readonly number[]): boolean {
  if (deltasMs.length < PROBE.calmFrames) return false;
  return deltasMs.slice(-PROBE.calmFrames).every((delta) => delta <= PROBE.calmFrameMs);
}

export type ProbeVerdict = 'pending' | 'fast' | 'slow';

/**
 * Verdict from the frame intervals measured so far (warm-up already removed):
 * `slow` as soon as enough slow frames are seen, `fast` once the sample is
 * complete, `pending` otherwise.
 */
export function evaluateProbe(deltasMs: readonly number[]): ProbeVerdict {
  const slow = deltasMs.filter((delta) => delta > PROBE.slowFrameMs).length;
  if (slow >= PROBE.slowFramesToFail) return 'slow';
  return deltasMs.length >= PROBE.sampleFrames ? 'fast' : 'pending';
}
