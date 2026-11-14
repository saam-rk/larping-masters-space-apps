import { describe, expect, it } from 'vitest';
import { FIXTURES, loadFixtureText } from '../horizons/__fixtures__/load.js';
import { createHorizonsSampler } from './sampler.js';

describe('Horizons sampler', () => {
  it('uses a single-instant query for a singleton search window', async () => {
    const calls: URL[] = [];
    const sampler = createHorizonsSampler(
      { latitudeDeg: -85.4381, longitudeEastDeg: 37.36667, altitudeKm: 0 },
      ['sun', 'earth'],
      { fetch: async (url) => {
        const parsed = new URL(url);
        calls.push(parsed);
        return new Response(loadFixtureText(parsed.searchParams.get('COMMAND') === "'10'" ? FIXTURES.nobileSun : FIXTURES.nobileEarth));
      } },
    );
    const time = Date.parse('2026-11-14T12:00:00Z');
    const result = await sampler.sample(time, time, { kind: 'intervals', count: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.series.times).toEqual([time]);
    expect(result.series.values.sunAzimuth).toEqual([83.301542]);
    expect(result.series.values.earthAzimuth).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect(calls.every(url => url.searchParams.has('TLIST') && !url.searchParams.has('STOP_TIME'))).toBe(true);
    expect(sampler.requests()).toBe(2);
  });
});
