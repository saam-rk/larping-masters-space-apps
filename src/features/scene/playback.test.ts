import { describe, expect, it } from 'vitest';
import { playbackInstants } from './playback';

describe('playbackInstants', () => {
  it('includes both endpoints and distributes whole-second samples', () => {
    expect(playbackInstants('2026-11-15T00:00', '2026-11-16T00:00', 25)).toEqual(
      Array.from({ length: 25 }, (_, index) => new Date(Date.UTC(2026, 10, 15, index)).toISOString().replace('.000', '')),
    );
  });
  it('does not duplicate instants in intervals shorter than the sample count', () => {
    expect(playbackInstants('2026-11-15T00:00:00', '2026-11-15T00:00:02', 121)).toEqual([
      '2026-11-15T00:00:00Z', '2026-11-15T00:00:01Z', '2026-11-15T00:00:02Z',
    ]);
  });
  it.each([
    ['', '2026-11-16T00:00', 25],
    ['2026-02-30T00:00', '2026-11-16T00:00', 25],
    ['1968-12-31T00:00', '2026-11-16T00:00', 25],
    ['2026-11-15T00:00', '2100-01-01T00:00', 25],
    ['2026-11-15T00:00', '2026-11-15T00:00', 25],
    ['2026-11-16T00:00', '2026-11-15T00:00', 25],
    ['2026-11-15T00:00', '2026-11-16T00:00', 122],
  ])('rejects invalid interval %s — %s (%s samples)', (start, end, count) => {
    expect(playbackInstants(start, end, count)).toBeNull();
  });
});
