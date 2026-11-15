import { describe, expect, it } from 'vitest';
import { formatMinutes } from '../../format';
import { DEFAULT_SAMPLES, playbackChunks, playbackPlan, presetStepMinutes } from './playback';

describe('presetStepMinutes', () => {
  it('spreads half a mean cycle over the samples, rounded to the minute', () => {
    expect(DEFAULT_SAMPLES).toBe(24);
    // 29.530589 d / 2 × 1440 / 23 = 924.4 min; 27.21222 d / 2 × 1440 / 23 = 851.9 min.
    expect(presetStepMinutes('sun', DEFAULT_SAMPLES)).toBe(924);
    expect(presetStepMinutes('earth', DEFAULT_SAMPLES)).toBe(852);
    expect(presetStepMinutes('sun', 2)).toBe(21_262);
  });
});

describe('playbackPlan', () => {
  it('derives the end from the start, the samples and the step', () => {
    expect(playbackPlan('2026-11-15T00:00:00Z', 16, 60)).toEqual({
      startUtc: '2026-11-15T00:00:00Z', endUtc: '2026-11-15T15:00:00Z', stepMinutes: 60, samples: 16,
    });
  });
  it.each([
    ['not a date', 16, 60],
    ['1968-12-31T00:00:00Z', 16, 60],
    ['2099-12-31T00:00:00Z', 16, 2880],
    ['2026-11-15T00:00:00Z', 1, 60],
    ['2026-11-15T00:00:00Z', 501, 60],
    ['2026-11-15T00:00:00Z', 16.5, 60],
    ['2026-11-15T00:00:00Z', 16, 0],
  ])('rejects %s, %s samples, %s min', (start, samples, step) => {
    expect(playbackPlan(start, samples, step)).toBeNull();
  });
});

describe('playbackChunks', () => {
  it('requests short intervals at once', () => {
    expect(playbackChunks(playbackPlan('2026-11-15T00:00:00Z', 16, 60)!)).toEqual([{ startUtc: '2026-11-15T00:00:00Z', count: 16 }]);
  });
  it('splits long intervals into consecutive chunks of at most 100 samples', () => {
    const chunks = playbackChunks(playbackPlan('2026-11-15T00:00:00Z', 201, 60)!);
    expect(chunks.map((chunk) => chunk.count)).toEqual([67, 67, 67]);
    expect(chunks.map((chunk) => chunk.startUtc)).toEqual(['2026-11-15T00:00:00Z', '2026-11-17T19:00:00Z', '2026-11-20T14:00:00Z']);
  });
});

describe('formatMinutes', () => {
  it('leaves out zero units', () => {
    expect(formatMinutes(2835)).toBe('1 d 23 h 15 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(1445)).toBe('1 d 5 min');
    expect(formatMinutes(0)).toBe('0 min');
  });
});
