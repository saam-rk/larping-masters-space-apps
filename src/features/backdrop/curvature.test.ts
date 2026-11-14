import { describe, expect, it } from 'vitest';
import {
  barrelFit,
  barrelShift,
  CURVATURE_STRENGTH,
  encodeShift,
  evaluateProbe,
  isCalm,
  isFirefox,
  mapChannels,
  maxShift,
  PROBE,
} from './curvature';

describe('barrelFit', () => {
  it('keeps the top and bottom edge midpoints in place', () => {
    const fit = barrelFit(1920, 1080);
    const radius2 = (540 * 540) / (960 * 960 + 540 * 540);
    expect(fit * (1 + CURVATURE_STRENGTH * radius2)).toBeCloseTo(1);
  });

  it('is 1 without curvature', () => {
    expect(barrelFit(1920, 1080, 0)).toBe(1);
  });
});

describe('barrelShift', () => {
  it('does not move the center', () => {
    const [shiftX, shiftY] = barrelShift(0, 0, 1600, 900);
    expect(shiftX).toBeCloseTo(0);
    expect(shiftY).toBeCloseTo(0);
  });

  it('keeps the top and bottom edge midpoints in place', () => {
    const [, shiftY] = barrelShift(0, 450, 1600, 900);
    expect(shiftY).toBeCloseTo(0);
  });

  it('is point-symmetric and never exceeds maxShift', () => {
    const [x, y] = barrelShift(700, 300, 1600, 900);
    const [mx, my] = barrelShift(-700, -300, 1600, 900);
    expect(mx).toBeCloseTo(-x);
    expect(my).toBeCloseTo(-y);
    expect(Math.abs(barrelShift(800, 450, 1600, 900)[0])).toBeLessThanOrEqual(maxShift(1600, 900) + 1e-9);
  });

  it('samples farther out toward the corners (the interface is drawn pulled in)', () => {
    expect(barrelShift(800, 450, 1600, 900)[0]).toBeGreaterThan(barrelShift(400, 225, 1600, 900)[0]);
  });
});

describe('mapChannels', () => {
  it('puts the longer axis in the grey channel and the other in alpha', () => {
    expect(mapChannels(1600, 900)).toEqual({ x: 'R', y: 'A' });
    expect(mapChannels(900, 1600)).toEqual({ x: 'A', y: 'R' });
  });
});

describe('encodeShift', () => {
  it('maps no shift to the middle and the extremes to the ends', () => {
    expect(encodeShift(0, 100)).toBe(128);
    expect(encodeShift(-50, 100)).toBe(0);
    expect(encodeShift(50, 100)).toBe(255);
  });

  it('clamps and round-trips to well under a pixel', () => {
    expect(encodeShift(500, 100)).toBe(255);
    const scale = 150;
    for (const shift of [-70, -33.3, 0, 12.5, 69]) {
      const decoded = (encodeShift(shift, scale) / 255 - 0.5) * scale;
      expect(Math.abs(decoded - shift)).toBeLessThan(0.5);
    }
  });
});

describe('isFirefox', () => {
  it('detects Firefox and not Chromium browsers', () => {
    expect(isFirefox('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0')).toBe(true);
    expect(isFirefox('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0')).toBe(false);
  });
});

describe('maxShift', () => {
  it('is zero without curvature', () => {
    expect(maxShift(1920, 1080, 0)).toBe(0);
  });

  it('bounds the displacement of every pixel', () => {
    const width = 1600;
    const height = 900;
    const fit = barrelFit(width, height);
    const half = width / 2;
    const halfDiagonal2 = half * half + (height / 2) * (height / 2);
    let largest = 0;
    for (let dx = -half; dx <= half; dx += 20) {
      for (let dy = -height / 2; dy <= height / 2; dy += 20) {
        const sampleScale = fit * (1 + (CURVATURE_STRENGTH * (dx * dx + dy * dy)) / halfDiagonal2) - 1;
        largest = Math.max(largest, Math.abs(dx * sampleScale), Math.abs(dy * sampleScale));
      }
    }
    expect(largest).toBeLessThanOrEqual(maxShift(width, height) + 1e-9);
  });
});

describe('isCalm', () => {
  it('needs a full run of short frames', () => {
    expect(isCalm(Array(PROBE.calmFrames - 1).fill(16.7))).toBe(false);
    expect(isCalm(Array(PROBE.calmFrames).fill(16.7))).toBe(true);
  });

  it('ignores slow frames from the load once they are out of the window', () => {
    const load = [300, 120, 90];
    expect(isCalm([...load, ...Array(PROBE.calmFrames).fill(16.7)])).toBe(true);
    expect(isCalm([...Array(PROBE.calmFrames).fill(16.7), ...load])).toBe(false);
  });
});

describe('evaluateProbe', () => {
  it('waits for a complete sample of fast frames', () => {
    expect(evaluateProbe([])).toBe('pending');
    expect(evaluateProbe(Array(PROBE.sampleFrames - 1).fill(16.7))).toBe('pending');
    expect(evaluateProbe(Array(PROBE.sampleFrames).fill(16.7))).toBe('fast');
  });

  it('fails as soon as enough slow frames are seen', () => {
    // Firefox with the filter: about 140 ms per frame.
    expect(evaluateProbe(Array(PROBE.slowFramesToFail).fill(140))).toBe('slow');
  });

  it('tolerates isolated slow frames', () => {
    const deltas = [16.7, 80, 16.7, 16.7, 60, 16.7, 16.7, 16.7];
    expect(deltas).toHaveLength(PROBE.sampleFrames);
    expect(evaluateProbe(deltas)).toBe('fast');
  });

  it('does not treat 60 Hz frames as slow', () => {
    expect(evaluateProbe(Array(PROBE.sampleFrames).fill(33))).toBe('fast');
  });
});
