import { describe, expect, it } from 'vitest';
import { matchesConditions, type SkyConditions, type SkyTarget } from '../../shared/skySearch.js';
import type { ObserverStep } from '../horizons/query.js';
import { findCandidates, searchStages, searchSky, segmentFeasibility, type Sampler, type SearchInput } from './search.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.parse('2026-11-14T12:00:00Z');
const SUPPORTED = { startMs: Date.parse('2000-01-01T00:00:00Z'), endMs: Date.parse('2099-12-31T23:59:59Z') };

/**
 * Synthetic sky: the Sun turns once around the horizon every 708 h (about
 * 0.51°/h, as seen from the lunar south pole) and its elevation oscillates
 * ±1.5° with the same period. Values are rounded to 6 decimals like Horizons.
 */
const MODEL: { [K in SkyTarget]: (ms: number) => number } = {
  sunAzimuth: (ms) => (((83.3 - ((ms - T0) / HOUR) * (360 / 708)) % 360) + 360) % 360,
  sunElevation: (ms) => 1.5 * Math.sin((2 * Math.PI * (ms - T0)) / (708 * HOUR)),
  earthAzimuth: (ms) => 320 + 3 * Math.sin((2 * Math.PI * (ms - T0)) / (27.3 * DAY)),
  earthElevation: (ms) => -0.6 + 6 * Math.sin((2 * Math.PI * (ms - T0)) / (27.2 * DAY)),
};

function modelSampler(targets: readonly SkyTarget[] = ['sunAzimuth', 'sunElevation', 'earthAzimuth', 'earthElevation']) {
  const calls: { startMs: number; stopMs: number; step: ObserverStep }[] = [];
  const sampler: Sampler = async (startMs, stopMs, step) => {
    calls.push({ startMs, stopMs, step });
    const stepMs = step.kind === 'hours' ? step.hours * HOUR : (stopMs - startMs) / step.count;
    const times: number[] = [];
    for (let time = startMs; time <= stopMs + 1e-6; time += stepMs) times.push(Math.round(time));
    const values = Object.fromEntries(
      targets.map((target) => [target, times.map((time) => Number(MODEL[target](time).toFixed(6)))]),
    );
    return { ok: true, series: { times, values } };
  };
  return Object.assign(sampler, { calls });
}

function input(conditions: SkyConditions, direction: SearchInput['direction'] = 'nearest', referenceMs = T0): SearchInput {
  return { referenceMs, direction, conditions, supportedRange: SUPPORTED };
}

const LIMITS = { maxSamples: 40, deadlineMs: Number.POSITIVE_INFINITY };

function valuesAt(ms: number) {
  return Object.fromEntries((Object.keys(MODEL) as SkyTarget[]).map((target) => [target, Number(MODEL[target](ms).toFixed(6))]));
}

describe('searchSky', () => {
  it('returns the reference itself when it already matches', async () => {
    const result = await searchSky(input({ sunAzimuth: { min: 80, max: 90 } }), modelSampler(), LIMITS);
    expect(result.ok && result.outcome).toMatchObject({ status: 'found', complete: true, match: { utc: '2026-11-14T12:00:00Z', offsetSeconds: 0 } });
  });

  it('finds an exact 4-decimal value to the second and verifies it on the sampled values', async () => {
    const conditions = { sunAzimuth: { min: 80, max: 80 } };
    const result = await searchSky(input(conditions, 'after'), modelSampler(), LIMITS);
    expect(result.ok).toBe(true);
    if (!result.ok || result.outcome.status !== 'found') throw new Error('expected a match');
    const matchMs = Date.parse(result.outcome.match.utc);
    // 83.3° - 80° = 3.3° at 360/708 °/h -> about 6.49 h after the reference.
    expect(Math.abs(matchMs - T0 - 6.49 * HOUR)).toBeLessThan(0.01 * HOUR);
    expect(matchesConditions(conditions, valuesAt(matchMs))).toBe(true);
    expect(result.outcome.match.offsetSeconds).toBe((matchMs - T0) / 1000);
    // The second just before does not match: the first matching second was returned.
    expect(matchesConditions(conditions, valuesAt(matchMs - 1000))).toBe(false);
  });

  it('honors the direction and picks the closer side for "nearest"', async () => {
    // Azimuth 90° was passed (90 - 83.3) / (360 / 708) ≈ 13.2 h before the reference; it comes back ≈ 694.8 h later.
    const conditions = { sunAzimuth: { min: 90, max: 90 } };
    const nearest = await searchSky(input(conditions), modelSampler(), LIMITS);
    const after = await searchSky(input(conditions, 'after'), modelSampler(), LIMITS);
    if (!nearest.ok || nearest.outcome.status !== 'found' || !after.ok || after.outcome.status !== 'found') {
      throw new Error('expected matches');
    }
    expect(nearest.outcome.match.offsetSeconds).toBeLessThan(0);
    expect(nearest.outcome.match.offsetSeconds).toBeGreaterThan(-13.3 * 3600);
    expect(after.outcome.match.offsetSeconds).toBeGreaterThan(694 * 3600);
  });

  it('handles azimuth ranges that wrap through north', async () => {
    const conditions = { sunAzimuth: { min: 359.5, max: 0.5 } };
    const result = await searchSky(input(conditions, 'after'), modelSampler(['sunAzimuth']), LIMITS);
    if (!result.ok || result.outcome.status !== 'found') throw new Error('expected a match');
    const value = Number(MODEL.sunAzimuth(Date.parse(result.outcome.match.utc)).toFixed(4));
    expect(value >= 359.5 || value <= 0.5).toBe(true);
  });

  it('combines conditions on both bodies', async () => {
    const conditions = { sunElevation: { min: 1, max: 1.5 }, earthElevation: { min: 2, max: 3 } };
    const result = await searchSky(input(conditions), modelSampler(), LIMITS);
    if (!result.ok || result.outcome.status !== 'found') throw new Error('expected a match');
    expect(matchesConditions(conditions, valuesAt(Date.parse(result.outcome.match.utc)))).toBe(true);
    expect(result.outcome.complete).toBe(true);
  });

  it('reports no match after sampling the whole window', async () => {
    const sampler = modelSampler(['sunElevation']);
    const result = await searchSky(input({ sunElevation: { min: 40, max: 50 } }), sampler, LIMITS);
    expect(result).toEqual({
      ok: true,
      outcome: { status: 'not-found', reason: 'no-match' },
      searched: { startMs: T0 - 366 * DAY, endMs: T0 + 366 * DAY },
    });
    expect(sampler.calls.every((call) => call.step.kind === 'hours')).toBe(true);
  });

  it('says when the request budget ran out instead of claiming there is no match', async () => {
    const result = await searchSky(input({ sunAzimuth: { min: 80, max: 80 } }, 'after'), modelSampler(), { ...LIMITS, maxSamples: 1 });
    expect(result.ok && result.outcome).toEqual({ status: 'not-found', reason: 'budget' });
  });

  it('propagates upstream failures', async () => {
    const failing: Sampler = async () => ({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'down' } });
    expect(await searchSky(input({ sunElevation: { min: 0, max: 90 } }), failing, LIMITS)).toEqual({
      ok: false,
      error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'down' },
    });
  });
});

describe('searchStages', () => {
  it('searches the near window first, then the rest of the year, on the allowed sides', () => {
    expect(searchStages(input({}, 'nearest'))).toEqual([
      [[T0 - 32 * DAY, T0 + 32 * DAY]],
      [
        [T0 - 366 * DAY, T0 - 32 * DAY],
        [T0 + 32 * DAY, T0 + 366 * DAY],
      ],
    ]);
    expect(searchStages(input({}, 'before'))).toEqual([[[T0 - 32 * DAY, T0]], [[T0 - 366 * DAY, T0 - 32 * DAY]]]);
  });

  it('clips to the supported range on whole hours from the reference', () => {
    const reference = Date.parse('2000-01-05T00:30:00Z');
    const [first] = searchStages(input({}, 'nearest', reference));
    expect(first?.[0]?.[0]).toBe(Date.parse('2000-01-01T00:30:00Z'));
  });
});

describe('segmentFeasibility', () => {
  it('solves elevation ranges with the margin and rounding tolerance', () => {
    const [interval] = segmentFeasibility('elevation', { min: 1, max: 1 }, 0, 2, 0);
    expect(interval?.[0]).toBeCloseTo(0.499975, 6);
    expect(interval?.[1]).toBeCloseTo(0.500025, 6);
  });

  it('follows azimuth across north', () => {
    expect(segmentFeasibility('azimuth', { min: 0, max: 0 }, 359.5, 0.5, 0)).toHaveLength(1);
    expect(segmentFeasibility('azimuth', { min: 180, max: 181 }, 359.5, 0.5, 0)).toEqual([]);
  });

  it('keeps the whole interval when the azimuth jumps (body near the zenith)', () => {
    expect(segmentFeasibility('azimuth', { min: 0, max: 1 }, 100, 160, 0)).toEqual([[0, 1]]);
  });

  it('treats missing values as unmatched', () => {
    expect(segmentFeasibility('elevation', { min: -90, max: 90 }, null, 1, 0)).toEqual([]);
  });
});

describe('findCandidates', () => {
  it('keeps intervals where the condition could hold and bounds their distance from the reference', () => {
    const series = { times: [T0, T0 + HOUR, T0 + 2 * HOUR], values: { sunElevation: [0, 1, 2] } };
    const candidates = findCandidates(series, { sunElevation: { min: 1.5, max: 1.5 } }, 0, T0);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.startMs).toBe(T0 + HOUR);
    // 1.5° is reached halfway through the second hour; the rounding tolerance moves it by < 1 s.
    expect(Math.abs((candidates[0]?.distanceMs ?? 0) - 1.5 * HOUR)).toBeLessThan(1000);
  });
});
