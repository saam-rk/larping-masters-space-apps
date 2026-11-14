import { describe, expect, it } from 'vitest';
import { isApiErrorResponse } from '../../shared/ephemeris.js';
import type { SkySearchResponse } from '../../shared/skySearch.js';
import type { FetchLike } from '../horizons/client.js';
import { createSkySearchHandler, parseSkySearchQuery } from './handler.js';

const BASE = 'http://localhost/api/sky-search';
const HOUR = 3_600_000;
const T0 = Date.parse('2026-11-14T12:00:00Z');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Synthetic Az/El: the Sun turns at 360/708 °/h; the Earth stays near 320° az, -0.6° el. */
function azEl(command: string, ms: number): [number, number] {
  const hours = (ms - T0) / HOUR;
  if (command === '10') return [(((83.3 - hours * (360 / 708)) % 360) + 360) % 360, 1.5 * Math.sin((2 * Math.PI * hours) / 708)];
  return [320 + 0.001 * hours, -0.6];
}

function rowTime(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${MONTHS[date.getUTCMonth()]}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.000`;
}

/** Answers Horizons range requests with a table built from `azEl`, in the format the API prints. */
function syntheticHorizons(): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fetch = async (url: string): Promise<Response> => {
    calls.push(url);
    const params = new URL(url).searchParams;
    const value = (key: string) => (params.get(key) ?? '').replace(/'/g, '');
    const start = Date.parse(`${value('START_TIME').replace(' ', 'T')}Z`);
    const stop = Date.parse(`${value('STOP_TIME').replace(' ', 'T')}Z`);
    const step = value('STEP_SIZE');
    const stepMs = step.endsWith('h') ? Number(step.slice(0, -1)) * HOUR : (stop - start) / Number(step);
    const rows: string[] = [];
    for (let time = start; time <= stop; time += stepMs) {
      const [azimuth, elevation] = azEl(value('COMMAND'), time);
      rows.push(` ${rowTime(time)}, , , ${azimuth.toFixed(6)}, ${elevation.toFixed(6)},`);
    }
    const result = [
      `Target body name: ${value('COMMAND') === '10' ? 'Sun (10)' : 'Earth (399)'}   {source: DE441}`,
      'Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}',
      ' Date__(UT)__HR:MN:SC.fff, , ,Azi_(a-app), Elev_(a-app),',
      '$$SOE',
      ...rows,
      '$$EOE',
    ].join('\n');
    return new Response(JSON.stringify({ result, signature: { version: '1.2', source: 'NASA/JPL Horizons API' } }), { status: 200 });
  };
  return Object.assign(fetch, { calls });
}

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}

describe('sky-search handler', () => {
  it('finds a match through Horizons range requests, one body at a time', async () => {
    const fetch = syntheticHorizons();
    const handler = createSkySearchHandler({ horizons: { fetch }, cache: null });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&from=2026-11-14T12:00Z&direction=after&sunAz=80`));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=86400');
    const body = (await readJson(response)) as SkySearchResponse;
    expect(body.outcome.status).toBe('found');
    if (body.outcome.status !== 'found') return;
    expect(body.outcome.match.values.sunAzimuth).toBeCloseTo(80, 4);
    expect(body.referenceUtc).toBe('2026-11-14T12:00:00Z');
    expect(body.site.id).toBe('nobile-rim-1');
    expect(body.source).toMatchObject({ apiVersion: '1.2', planetaryEphemeris: 'DE441', observerFrame: 'MEAN_ME (high precision)' });
    expect(body.method.terrainModeled).toBe(false);
    // Only the Sun has a condition, so the Earth is never requested; steps go hours -> minutes -> seconds.
    expect(fetch.calls.every((url) => url.includes('COMMAND=%2710%27'))).toBe(true);
    expect(fetch.calls.map((url) => new URL(url).searchParams.get('STEP_SIZE'))).toEqual(["'1h'", "'60'", "'60'"]);
    expect(body.horizonsRequests).toBe(3);
  });

  it('queries both bodies when both have conditions', async () => {
    const fetch = syntheticHorizons();
    const handler = createSkySearchHandler({ horizons: { fetch }, cache: null });
    const response = await handler(new Request(`${BASE}?lat=-85.4381&lon=37.36667&from=2026-11-14T12:00Z&sunEl=-90,90&earthAz=319,321`));

    const body = (await readJson(response)) as SkySearchResponse;
    expect(body.outcome).toMatchObject({ status: 'found', match: { utc: '2026-11-14T12:00:00Z', offsetSeconds: 0 } });
    expect(fetch.calls.some((url) => url.includes('COMMAND=%27399%27'))).toBe(true);
  });

  it('returns 502 when Horizons fails', async () => {
    const handler = createSkySearchHandler({ horizons: { fetch: async () => new Response('', { status: 503 }) }, cache: null });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&from=2026-11-14T12:00Z&sunEl=0,10`));
    expect(response.status).toBe(502);
    const body = await readJson(response);
    expect(isApiErrorResponse(body) && body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('rejects invalid requests with 400 without calling Horizons', async () => {
    const fetch = syntheticHorizons();
    const handler = createSkySearchHandler({ horizons: { fetch }, cache: null });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&from=2026-11-14T12:00Z`));
    expect(response.status).toBe(400);
    expect(fetch.calls).toHaveLength(0);
  });
});

describe('parseSkySearchQuery', () => {
  const parse = (query: string) => parseSkySearchQuery(`${BASE}?${query}`);

  it('reads ranges, exact values and the default direction', () => {
    const result = parse('site=shackleton-rim&from=2026-11-14T12:00Z&sunAz=350,10&earthEl=1.2345');
    expect(result).toMatchObject({
      ok: true,
      direction: 'nearest',
      conditions: { sunAzimuth: { min: 350, max: 10 }, earthElevation: { min: 1.2345, max: 1.2345 } },
    });
  });

  it.each([
    ['site=nobile-rim-1&sunEl=0,1', '"from" is required'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z', 'at least one condition'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&sunEl=1.23456', 'at most 4 decimals'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&sunEl=5,1', 'min must not exceed max'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&earthAz=361', 'within [0, 360]'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&sunEl=0&direction=sideways', '"direction"'],
    ['site=moon-base&from=2026-11-14T12:00Z&sunEl=0', '"site"'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&sunEl=30,40', '"sunEl": the sun never reaches these values at this site'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&earthAz=150,200&sunEl=0', '"earthAz": the earth never reaches'],
    ['site=nobile-rim-1&from=2026-11-14T12:00Z&earthAz=320&earthEl=40', '"earthAz" + "earthEl": the earth never reaches'],
  ])('rejects %s', (query, detail) => {
    const result = parse(query);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain(detail);
  });
});
