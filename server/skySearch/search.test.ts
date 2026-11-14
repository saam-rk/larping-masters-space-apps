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
    const stepMs = startMs === stopMs ? 1000 : step.kind === 'hours' ? step.hours * HOUR : (stopMs - startMs) / step.count;
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

  it('combines conditions on both bodies without certifying unverified closer intervals', async () => {
    const conditions = { sunElevation: { min: 1, max: 1.5 }, earthElevation: { min: 2, max: 3 } };
    const result = await searchSky(input(conditions), modelSampler(), LIMITS);
    if (!result.ok || result.outcome.status !== 'found') throw new Error('expected a match');
    expect(matchesConditions(conditions, valuesAt(Date.parse(result.outcome.match.utc)))).toBe(true);
    expect(result.outcome.complete).toBe(false);
  });

  it('reports no match only after checking every whole second of the supported window', async () => {
    const sampler = modelSampler(['sunElevation']);
    const supportedRange = { startMs: T0 - HOUR, endMs: T0 + HOUR };
    const result = await searchSky({ ...input({ sunElevation: { min: 40, max: 50 } }), supportedRange }, sampler, LIMITS);
    expect(result).toEqual({
      ok: true,
      outcome: { status: 'not-found', reason: 'no-match' },
      searched: supportedRange,
    });
    expect(sampler.calls.filter(call => call.step.kind === 'intervals')).toHaveLength(2);
  });

  it('does not turn heuristic rejections into a false no-match when verification exceeds the budget', async () => {
    const result = await searchSky(input({ sunElevation: { min: 40, max: 50 } }), modelSampler(), { ...LIMITS, maxSamples: 4 });
    expect(result.ok && result.outcome).toEqual({ status: 'not-found', reason: 'budget' });
  });

  it('finds an interior near-zenith peak rejected by hourly interpolation', async () => {
    // Regression shape from JPL Horizons, DE441, AIRLESS, quantity 4:
    // lat=-1.52, lon=-0.25, 2026-11-24 at 10:00 / 10:30 / 11:00 UTC.
    const referenceMs = Date.parse('2026-11-24T10:00:00Z');
    const elevations = [89.763376, 89.983830, 89.731334];
    const sampler: Sampler = async (start, stop, step) => {
      const count = step.kind === 'hours' ? (stop - start) / HOUR : step.count;
      const times = Array.from({ length: count + 1 }, (_, i) => start + i * (stop - start) / count);
      const values = times.map(time => {
        const x = (time - referenceMs) / HOUR;
        return (elevations[0] as number) + 0.913858 * x - 0.9459 * x * x;
      });
      return { ok: true, series: { times, values: { sunElevation: values } } };
    };
    const conditions = { sunElevation: { min: 89.98, max: 89.99 } };
    expect(segmentFeasibility('elevation', conditions.sunElevation, elevations[0]!, elevations[2]!, 0.002)).toEqual([]);
    const result = await searchSky({ ...input(conditions, 'after', referenceMs), supportedRange: { startMs: referenceMs, endMs: referenceMs + HOUR } }, sampler, LIMITS);
    expect(result.ok && result.outcome).toMatchObject({ status: 'found', complete: true });
    if (!result.ok || result.outcome.status !== 'found') return;
    expect(matchesConditions(conditions, result.outcome.match.values)).toBe(true);
    expect(result.outcome.match.offsetSeconds).toBeGreaterThan(0);
    expect(result.outcome.match.offsetSeconds).toBeLessThan(1800);
  });

  it('marks a distant match incomplete when closer rejected intervals remain unverified', async () => {
    const result = await searchSky(input({ sunAzimuth: { min: 80, max: 80 } }, 'after'), modelSampler(), { ...LIMITS, maxSamples: 3 });
    expect(result.ok && result.outcome).toMatchObject({ status: 'found', complete: false });
  });

  it('says when the request budget ran out instead of claiming there is no match', async () => {
    const result = await searchSky(input({ sunAzimuth: { min: 80, max: 80 } }, 'after'), modelSampler(), { ...LIMITS, maxSamples: 1 });
    expect(result.ok && result.outcome).toEqual({ status: 'not-found', reason: 'budget' });
  });

  it('includes the reference at either supported boundary for a one-sided search', async () => {
    for (const [reference, direction] of [[SUPPORTED.startMs, 'before'], [SUPPORTED.endMs, 'after']] as const) {
      const result = await searchSky(input({ sunElevation: { min: -90, max: 90 } }, direction, reference), modelSampler(), LIMITS);
      expect(result.ok && result.outcome).toMatchObject({ status: 'found', match: { utc: new Date(reference).toISOString().replace('.000Z', 'Z'), offsetSeconds: 0 } });
    }
  });

  it('finds matches in the partial hour next to the supported boundary', async () => {
    const reference = SUPPORTED.startMs + HOUR + 37_000;
    const target = SUPPORTED.startMs + 10_000;
    const sampler: Sampler = async (start, stop, step) => {
      const count = start === stop ? 0 : step.kind === 'intervals' ? step.count : (stop - start) / HOUR;
      const times = Array.from({ length: count + 1 }, (_, i) => count === 0 ? start : start + i * (stop - start) / count);
      expect(times.every(t => t % 1000 === 0)).toBe(true);
      return { ok: true, series: { times, values: { sunElevation: times.map(t => (t - target) / HOUR) } } };
    };
    const result = await searchSky(input({ sunElevation: { min: 0, max: 0 } }, 'before', reference), sampler, LIMITS);
    expect(result.ok && result.outcome).toMatchObject({ status: 'found', match: { utc: '2000-01-01T00:00:10Z' } });
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

  it('keeps the partial hour at the supported boundary', () => {
    const reference = Date.parse('2000-01-05T00:30:00Z');
    const [first] = searchStages(input({}, 'nearest', reference));
    expect(first?.[0]).toEqual([SUPPORTED.startMs, Date.parse('2000-01-01T00:30:00Z')]);
    expect(first?.[1]?.[0]).toBe(Date.parse('2000-01-01T00:30:00Z'));
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
    // The full interval, not the interpolated crossing, bounds true distance.
    expect(candidates[0]?.distanceMs).toBe(HOUR);
  });
});
