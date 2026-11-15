import { describe, expect, it } from 'vitest';
import { MAX_RENDER_DPR, MAX_RENDER_PIXELS, MIN_RENDER_DPR, renderDpr } from './renderDpr';

describe('renderDpr', () => {
  it('follows the device pixel ratio at ordinary sizes', () => {
    expect(renderDpr(1, 900, 500)).toBe(1);
    expect(renderDpr(1.25, 900, 500)).toBe(1.25);
  });

  it('is not raised to 1 when the page is zoomed out', () => {
    // 50 % zoom on a standard display: the canvas covers twice the CSS pixels, at half the device pixels each.
    expect(renderDpr(0.5, 1800, 1000)).toBe(0.5);
    expect(renderDpr(1 / 3, 2700, 1500)).toBeCloseTo(1 / 3);
  });

  it('keeps the drawing buffer the same size in device pixels across zoom levels', () => {
    const deviceWidth = 900;
    const deviceHeight = 500;
    for (const zoom of [0.5, 0.75, 1]) {
      const ratio = renderDpr(zoom, deviceWidth / zoom, deviceHeight / zoom);
      expect((deviceWidth / zoom) * ratio).toBeCloseTo(deviceWidth);
    }
  });

  it('caps the ratio when zoomed in or on high-density displays', () => {
    expect(renderDpr(2, 900, 500)).toBe(MAX_RENDER_DPR);
    expect(renderDpr(3, 400, 300)).toBe(MAX_RENDER_DPR);
  });

  it('keeps large canvases under the pixel budget, in steps', () => {
    const ratio = renderDpr(1.5, 2560, 1440);
    expect(2560 * 1440 * ratio * ratio).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
    expect(ratio).toBe(1);
    // A slightly different size keeps the same step, so the buffer is not reallocated.
    expect(renderDpr(1.5, 2550, 1430)).toBe(ratio);
  });

  it('never goes below the minimum or breaks on missing values', () => {
    expect(renderDpr(0.1, 100, 100)).toBe(MIN_RENDER_DPR);
    expect(renderDpr(Number.NaN, 0, 0)).toBe(1);
    expect(renderDpr(0, 800, 600)).toBe(1);
    expect(renderDpr(1, 1e6, 1e6)).toBe(MIN_RENDER_DPR);
  });
});
