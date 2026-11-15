import { describe, expect, it } from 'vitest';
import type { EphemerisSeriesResponse } from '../../shared/ephemerisSeries.js';
import type { FetchLike } from '../horizons/client.js';
import { buildObserverSeriesParameters } from '../horizons/query.js';
import { createEphemerisSeriesHandler, parseSeriesQuery } from './series.js';

const BASE = 'http://localhost/api/ephemeris-series';

const HEADER = [
  'Target body name: Sun (10)                        {source: DE441}',
  'Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}',
  ' Date__(UT)__HR:MN:SC.fff, , ,Azi_(a-app), Elev_(a-app),  Ang-diam,             delta,     deldot,',
];
/** Rows as Horizons printed them for Nobile Rim 1 (Sun, 6 h step, 2026-11-14). */
const SUN_ROWS = [
  ' 2026-Nov-14 12:00:00.000,*,i,  83.301542,     2.094722,  1941.825,  0.98796880248943,  0.3494014,',
  ' 2026-Nov-14 18:00:00.000,*,i,  80.263471,     2.334406,  1941.722,  0.98802100766100,  0.3734446,',
  ' 2026-Nov-15 00:00:00.000,*,i,  77.225067,     2.571829,  1941.613,  0.98807656113231,  0.3957734,',
];

function payload(rows: readonly string[]) {
  return JSON.stringify({ result: [...HEADER, '$$SOE', ...rows, '$$EOE'].join('\n'), signature: { version: '1.2' } });
}

function seriesFetch(rows: { sun: readonly string[]; earth: readonly string[] | 'error' }): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const reply = url.includes('COMMAND=%27399%27') ? rows.earth : rows.sun;
    return reply === 'error' ? new Response('', { status: 503 }) : new Response(payload(reply), { status: 200 });
  };
  return Object.assign(fetch, { calls });
}

describe('buildObserverSeriesParameters', () => {
  it('keeps the single-instant quantities and replaces TLIST with START/STOP and a unitless step', () => {
    const parameters = Object.fromEntries(
      buildObserverSeriesParameters({
        body: 'sun', latitudeDeg: -85.4381, longitudeEastDeg: 37.36667, altitudeKm: 0,
        start: new Date('2026-11-14T12:00:00Z'), stop: new Date('2026-11-15T00:00:00Z'), intervals: 2,
      }),
    );
    expect(parameters).toMatchObject({
      QUANTITIES: "'4,13,20'",
      RANGE_UNITS: "'AU'",
      APPARENT: "'AIRLESS'",
      START_TIME: "'2026-11-14 12:00:00'",
      STOP_TIME: "'2026-11-15 00:00:00'",
      STEP_SIZE: "'2'",
    });
    expect(parameters).not.toHaveProperty('TLIST');
  });
});

describe('parseSeriesQuery', () => {
  it('validates start, step and count', () => {
    expect(parseSeriesQuery(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=360&count=3`).ok).toBe(true);
    expect(parseSeriesQuery(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=0&count=3`).ok).toBe(false);
    expect(parseSeriesQuery(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=60&count=1`).ok).toBe(false);
    expect(parseSeriesQuery(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=60&count=101`).ok).toBe(false);
    expect(parseSeriesQuery(`${BASE}?site=nobile-rim-1&start=2099-12-31T00:00Z&step=1440&count=3`).ok).toBe(false);
  });
});

describe('ephemeris series handler', () => {
  it('makes one Horizons request per body and returns one frame per sample', async () => {
    const fetch = seriesFetch({ sun: SUN_ROWS, earth: SUN_ROWS });
    const handler = createEphemerisSeriesHandler({ horizons: { fetch } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=360&count=3`));

    expect(response.status).toBe(200);
    expect(fetch.calls).toHaveLength(2);
    const body = JSON.parse(await response.text()) as EphemerisSeriesResponse;
    expect(body.frames.map((frame) => frame.requestedUtc)).toEqual([
      '2026-11-14T12:00:00Z', '2026-11-14T18:00:00Z', '2026-11-15T00:00:00Z',
    ]);
    const sun = body.frames[0]!.bodies.sun;
    expect(sun.status === 'ok' && sun.observation).toMatchObject({
      azimuthDeg: 83.301542, elevationDeg: 2.094722, angularDiameterArcsec: 1941.825, rangeAu: 0.98796880248943,
    });
    expect(body.frames.every((frame) => frame.provenance === 'live' && frame.warnings.length === 0)).toBe(true);
  });

  it('fails a body whose rows do not match the requested instants', async () => {
    const handler = createEphemerisSeriesHandler({ horizons: { fetch: seriesFetch({ sun: SUN_ROWS.slice(0, 2), earth: SUN_ROWS }) } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=360&count=3`));
    const body = JSON.parse(await response.text()) as EphemerisSeriesResponse;
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.frames.every((frame) => frame.bodies.sun.status === 'error' && frame.warnings.includes('PARTIAL_RESULT'))).toBe(true);
  });

  it('returns 502 when every body fails', async () => {
    const handler = createEphemerisSeriesHandler({ horizons: { fetch: seriesFetch({ sun: [], earth: 'error' }) } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&start=2026-11-14T12:00Z&step=360&count=3`));
    expect(response.status).toBe(502);
  });
});
