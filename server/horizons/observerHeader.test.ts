import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { observerHeaderError } from './observerHeader.js';
import { FIXTURES, loadFixture } from './__fixtures__/load.js';
import { findSite } from '../../shared/sites.js';
import { observerAltitudeKm } from '../../shared/observer.js';
import { fetchObserverTable } from './client.js';

const site = findSite('nobile-rim-1');
const query = { body: 'sun' as const, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, altitudeKm: 0, instant: new Date('2026-11-14T12:00:00Z') };

describe('returned observer metadata', () => {
  it('rejects a sphere response to a new terrain-height request', async () => {
    const payload = loadFixture(FIXTURES.nobileSun);
    expect(observerHeaderError(payload, query)).toBeNull();
    const result = await fetchObserverTable({ ...query, altitudeKm: observerAltitudeKm(site) }, {
      fetch: async () => new Response(JSON.stringify(payload)),
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_FORMAT' } });
  });
  it.each([
    ['Moon (301)', 'Earth (399)'], ['Sun (10)', 'Earth (399)'],
    ['NO (AIRLESS)', 'YES (REFRACTED)'], ['Date__(UT)', 'Date__(TT)'],
    ['1737.4, 1737.4, 1737.4 km', '1737.4, 1737.4, 1738.0 km'],
    ['Units: AU and KM/S', 'Units: KM and KM/S'],
  ])('rejects changed metadata %s', (before, after) => {
    const payload = loadFixture(FIXTURES.nobileSun) as { result: string };
    expect(payload.result).toContain(before);
    expect(observerHeaderError({ ...payload, result: payload.result.replace(before, after) }, query)).not.toBeNull();
  });
  const directory = new URL('../../docs/lighting-validation/horizons/', import.meta.url);
  it.each(readdirSync(directory))('accepts recorded surface observer %s', (file) => {
    const record = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
    const params = new URL(record.url).searchParams;
    const [longitudeEastDeg, latitudeDeg, altitudeKm] = params.get('SITE_COORD')!.replaceAll("'", '').split(',').map(Number) as [number, number, number];
    const body = params.get('COMMAND') === "'10'" ? 'sun' : 'earth';
    expect(observerHeaderError(record.payload, { ...query, body, latitudeDeg, longitudeEastDeg, altitudeKm })).toBeNull();
  });
});
