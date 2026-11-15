import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkySearchResponse } from '../../../shared/skySearch';
import { fetchEphemeris } from '../../api/ephemerisClient';
import { fetchSkySearch } from '../../api/skySearchClient';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { ceilToMinute, findNextRise } from './nextRise';

vi.mock('../../api/ephemerisClient', () => ({ fetchEphemeris: vi.fn() }));
vi.mock('../../api/skySearchClient', () => ({ fetchSkySearch: vi.fn() }));

const selection = {
  siteId: SAVED_SAMPLE.site.id,
  latitudeDeg: SAVED_SAMPLE.site.latitudeDeg,
  longitudeEastDeg: SAVED_SAMPLE.site.longitudeEastDeg,
  utc: SAVED_SAMPLE.requestedUtc,
};

function found(utc: string) {
  return {
    ok: true as const,
    data: {
      referenceUtc: selection.utc,
      searched: { startUtc: selection.utc, endUtc: '2027-11-15T12:00:00Z' },
      outcome: { status: 'found', complete: true, match: { utc, offsetSeconds: 1, values: {} } },
    } as unknown as SkySearchResponse,
  };
}

afterEach(() => vi.resetAllMocks());

describe('findNextRise', () => {
  it('finds the set first when the body is up, then the rise after it', async () => {
    // In the saved Nobile Rim 1 sample the Sun is up (elevation about 2.09°).
    vi.mocked(fetchEphemeris).mockResolvedValue({ ok: true, data: SAVED_SAMPLE });
    vi.mocked(fetchSkySearch)
      .mockResolvedValueOnce(found('2026-11-20T10:00:00Z'))
      .mockResolvedValueOnce(found('2026-12-01T08:30:15Z'));
    expect(await findNextRise(selection, 'sun')).toEqual({ status: 'found', utc: '2026-12-01T08:30:15Z' });
    const [setSearch, riseSearch] = vi.mocked(fetchSkySearch).mock.calls.map(([request]) => request);
    expect(setSearch!.conditions.sunElevation!.min).toBe(-90);
    expect(riseSearch!.selection.utc).toBe('2026-11-20T10:01:00Z');
    expect(riseSearch!.conditions.sunElevation!.max).toBe(90);
    expect(riseSearch!.conditions.sunElevation!.min).toBe(setSearch!.conditions.sunElevation!.max);
  });

  it('reports errors from the ephemeris query', async () => {
    vi.mocked(fetchEphemeris).mockResolvedValue({ ok: false, error: { key: 'NETWORK', detail: 'offline' } });
    expect(await findNextRise(selection, 'earth')).toEqual({ status: 'error', key: 'NETWORK' });
    expect(fetchSkySearch).not.toHaveBeenCalled();
  });
});

describe('ceilToMinute', () => {
  it('rounds up to the next whole minute', () => {
    expect(ceilToMinute('2026-12-01T08:30:15Z')).toBe('2026-12-01T08:31:00Z');
    expect(ceilToMinute('2026-12-01T08:30:00Z')).toBe('2026-12-01T08:30:00Z');
  });
});
