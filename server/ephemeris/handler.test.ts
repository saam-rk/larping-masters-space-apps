import { describe, expect, it } from 'vitest';
import { isApiErrorResponse, type EphemerisResponse } from '../../shared/ephemeris.js';
import { createEphemerisHandler, parseEphemerisQuery } from './handler.js';
import { fixtureFetch } from './testing.js';

const BASE = 'http://localhost/api/ephemeris';

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}

describe('ephemeris handler', () => {
  it('returns 200 with both bodies and a CDN cache header', async () => {
    const handler = createEphemerisHandler({ horizons: { fetch: fixtureFetch() } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&utc=2026-11-14T12:00Z`));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=86400');
    const body = (await readJson(response)) as EphemerisResponse;
    expect(body.requestedUtc).toBe('2026-11-14T12:00:00Z');
    expect(body.bodies.sun.status).toBe('ok');
    expect(body.bodies.earth.status).toBe('ok');
  });

  it('returns 200 without caching when one body fails', async () => {
    const handler = createEphemerisHandler({ horizons: { fetch: fixtureFetch({ earth: 'network-error' }) } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&utc=2026-11-14T12:00:00Z`));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await readJson(response)) as EphemerisResponse;
    expect(body.bodies.earth.status).toBe('error');
  });

  it('returns 502 when every body fails', async () => {
    const handler = createEphemerisHandler({
      horizons: { fetch: fixtureFetch({ sun: { status: 503, body: '' }, earth: { status: 503, body: '' } }) },
    });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&utc=2026-11-14T12:00:00Z`));

    expect(response.status).toBe(502);
    const body = await readJson(response);
    expect(isApiErrorResponse(body) && body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('rejects other methods with 405 and an Allow header', async () => {
    const handler = createEphemerisHandler({ horizons: { fetch: fixtureFetch() } });
    const response = await handler(new Request(`${BASE}?site=nobile-rim-1&utc=2026-11-14T12:00Z`, { method: 'POST' }));

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('rejects invalid parameters with 400 without calling Horizons', async () => {
    const fetch = fixtureFetch();
    const handler = createEphemerisHandler({ horizons: { fetch } });
    const response = await handler(new Request(`${BASE}?site=moon-base&utc=2026-11-14T12:00Z`));

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await readJson(response);
    expect(isApiErrorResponse(body) && body.error.code).toBe('INVALID_REQUEST');
    expect(fetch.calls).toHaveLength(0);
  });
});

describe('parseEphemerisQuery', () => {
  it('accepts a known site and UTC instant', () => {
    const result = parseEphemerisQuery(`${BASE}?site=shackleton-rim&utc=2030-01-02T03:04:05Z`);
    expect(result.ok && result.site.name).toBe('Shackleton Rim');
    expect(result.ok && result.instant.toISOString()).toBe('2030-01-02T03:04:05.000Z');
  });

  it.each([
    ['missing site', '?utc=2026-11-14T12:00Z', '"site" must be one of'],
    ['missing utc', '?site=nobile-rim-1', '"utc" is required'],
    ['local time', '?site=nobile-rim-1&utc=2026-11-14T12:00', 'format'],
    ['offset time', '?site=nobile-rim-1&utc=2026-11-14T12:00%2B01:00', 'format'],
    ['impossible date', '?site=nobile-rim-1&utc=2026-02-30T12:00Z', 'invalid-date'],
    ['out of range', '?site=nobile-rim-1&utc=2150-01-01T00:00Z', 'must be within'],
  ])('rejects %s', (_label, search, detail) => {
    const result = parseEphemerisQuery(`${BASE}${search}`);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.detail).toContain(detail);
  });
});
