import { describe, expect, it } from 'vitest';
import { findSite } from '../../shared/sites.js';
import { TtlCache } from './cache.js';
import { computeEphemeris } from './service.js';
import { fixtureFetch } from './testing.js';
import type { EphemerisResponse } from '../../shared/ephemeris.js';
import { observerAltitudeKm } from '../../shared/observer.js';

const NOBILE = findSite('nobile-rim-1');
const INSTANT = new Date('2026-11-14T12:00:00Z');
const NOW = new Date('2026-11-14T08:38:36Z');

describe('computeEphemeris', () => {
  it('combines the Sun and Earth results with provenance and method', async () => {
    const fetch = fixtureFetch();
    const response = await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch, now: () => NOW } });

    expect(fetch.calls).toHaveLength(2);
    expect(response.provenance).toBe('live');
    expect(response.requestedUtc).toBe('2026-11-14T12:00:00Z');
    expect(response.ephemerisUtc).toBe('2026-11-14T12:00:00Z');
    expect(response.site).toMatchObject({ id: 'nobile-rim-1', altitudeKm: observerAltitudeKm(NOBILE) });
    // Fixture angles test assembly, not scientific validation at the new height.
    for (const url of fetch.calls) {
      expect(new URL(url).searchParams.get('SITE_COORD')).toContain(String(observerAltitudeKm(NOBILE)));
    }
    expect(response.bodies.sun).toMatchObject({ status: 'ok', observation: { azimuthDeg: 83.301542 } });
    expect(response.bodies.earth).toMatchObject({ status: 'ok', observation: { elevationDeg: -0.587903 } });
    expect(response.source).toEqual({
      name: 'NASA/JPL Horizons API',
      url: 'https://ssd.jpl.nasa.gov/api/horizons.api',
      apiVersion: '1.2',
      planetaryEphemeris: 'DE441',
      observerFrame: 'MEAN_ME (high precision)',
      retrievedAt: '2026-11-14T08:38:36.000Z',
    });
    expect(response.method.terrainModeled).toBe(false);
    expect(response.warnings).toEqual([]);
  });

  it('keeps a failed body explicit and flags a partial result', async () => {
    const fetch = fixtureFetch({ earth: { status: 503, body: '' } });
    const response = await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch } });

    expect(response.bodies.sun.status).toBe('ok');
    expect(response.bodies.earth).toEqual({
      status: 'error',
      body: 'earth',
      error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'Horizons HTTP 503' },
    });
    expect(response.warnings).toEqual(['PARTIAL_RESULT']);
  });

  it('flags an API version the parser was not checked against', async () => {
    const patched = (body: string) => body.replace('"version":"1.2"', '"version":"9.9"');
    const sun = fixtureFetch();
    const fetch = async (url: string) => {
      const original = await sun(url);
      return new Response(patched(await original.text()), { status: 200 });
    };
    const response = await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch } });
    expect(response.source.apiVersion).toBe('9.9');
    expect(response.warnings).toContain('HORIZONS_API_VERSION_UNVERIFIED');
  });

  it('serves repeated complete results from the cache', async () => {
    const fetch = fixtureFetch();
    const cache = new TtlCache<EphemerisResponse>({ ttlMs: 60_000, maxEntries: 10 });
    const first = await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch }, cache });
    const second = await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch }, cache });

    expect(second).toBe(first);
    expect(fetch.calls).toHaveLength(2);
  });

  it('does not cache partial results', async () => {
    const fetch = fixtureFetch({ sun: 'network-error' });
    const cache = new TtlCache<EphemerisResponse>({ ttlMs: 60_000, maxEntries: 10 });
    await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch }, cache });
    await computeEphemeris(NOBILE, INSTANT, { horizons: { fetch }, cache });

    expect(cache.size).toBe(0);
    expect(fetch.calls).toHaveLength(4);
  });
});
