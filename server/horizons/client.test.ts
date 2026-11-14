import { describe, expect, it, vi } from 'vitest';
import { FIXTURES, loadFixtureText, respondWith } from './__fixtures__/load.js';
import { fetchObserverTable, type FetchLike } from './client.js';

const QUERY = {
  body: 'sun' as const,
  latitudeDeg: -85.4381,
  longitudeEastDeg: 37.36667,
  altitudeKm: 0,
  instant: new Date('2026-11-14T12:00:00Z'),
};

describe('fetchObserverTable', () => {
  it('returns the parsed table and retrieval time on success', async () => {
    const fetch = vi.fn<FetchLike>(respondWith(200, loadFixtureText(FIXTURES.nobileSun)));
    const now = new Date('2026-11-14T08:38:36Z');
    const result = await fetchObserverTable(QUERY, { fetch, now: () => now });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.table.observation.azimuthDeg).toBe(83.301542);
    expect(result.retrievedAt).toBe(now);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(result.url);
  });

  it('maps HTTP 400 to UPSTREAM_REJECTED with the upstream message', async () => {
    const body = '{"message":"one or more query parameter was not recognized","code":"400"}';
    const result = await fetchObserverTable(QUERY, { fetch: respondWith(400, body) });
    expect(!result.ok && result.error.code).toBe('UPSTREAM_REJECTED');
    expect(!result.ok && result.error.detail).toContain('not recognized');
  });

  it.each([500, 503, 502])('maps HTTP %d to UPSTREAM_UNAVAILABLE', async (status) => {
    const result = await fetchObserverTable(QUERY, { fetch: respondWith(status, '') });
    expect(!result.ok && result.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('maps a Horizons error payload (HTTP 200) to UPSTREAM_REJECTED', async () => {
    const result = await fetchObserverTable(QUERY, { fetch: respondWith(200, loadFixtureText(FIXTURES.unreadableTlist)) });
    expect(!result.ok && result.error.code).toBe('UPSTREAM_REJECTED');
  });

  it('maps a non-JSON body to UPSTREAM_FORMAT', async () => {
    const result = await fetchObserverTable(QUERY, { fetch: respondWith(200, '<html>maintenance</html>') });
    expect(!result.ok && result.error.code).toBe('UPSTREAM_FORMAT');
  });

  it('maps a network failure to UPSTREAM_UNAVAILABLE', async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      throw new TypeError('fetch failed');
    });
    const result = await fetchObserverTable(QUERY, { fetch });
    expect(!result.ok && result.error).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      detail: 'request to Horizons failed: fetch failed',
    });
  });

  it('gives up after the timeout', async () => {
    const fetch = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    const result = await fetchObserverTable(QUERY, { fetch, timeoutMs: 20 });
    expect(!result.ok && result.error).toEqual({ code: 'UPSTREAM_UNAVAILABLE', detail: 'request to Horizons timed out' });
  });
});
