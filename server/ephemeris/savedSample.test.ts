/**
 * Keeps the saved sample shown by the app (`shared/samples/`) identical to what
 * the live pipeline produces from the raw Horizons fixtures.
 *
 * To regenerate after an intentional contract change:
 *   UPDATE_SAMPLE=1 npx vitest run server/ephemeris/savedSample.test.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EphemerisResponse } from '../../shared/ephemeris.js';
import { findSite } from '../../shared/sites.js';
import { FIXTURES, loadFixtureText, NOBILE_FIXTURE_RETRIEVED_AT, respondWith } from '../horizons/__fixtures__/load.js';
import { fetchObserverTable } from '../horizons/client.js';
import { buildEphemerisResponse } from './service.js';

const SAMPLE_URL = new URL('../../shared/samples/nobile-rim-1_2026-11-14T12-00-00Z.json', import.meta.url);

async function buildSampleFromFixtures(): Promise<EphemerisResponse> {
  const site = findSite('nobile-rim-1');
  const instant = new Date('2026-11-14T12:00:00Z');
  const query = { latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, altitudeKm: 0, instant };
  const options = (fixture: string) => ({
    fetch: respondWith(200, loadFixtureText(fixture)),
    now: () => NOBILE_FIXTURE_RETRIEVED_AT,
  });
  const [sun, earth] = await Promise.all([
    fetchObserverTable({ ...query, body: 'sun' }, options(FIXTURES.nobileSun)),
    fetchObserverTable({ ...query, body: 'earth' }, options(FIXTURES.nobileEarth)),
  ]);
  return buildEphemerisResponse(site, instant, { sun, earth }, 'saved-sample');
}

describe('saved sample', () => {
  it('matches the response derived from the raw Horizons fixtures', async () => {
    const expected = await buildSampleFromFixtures();
    if (process.env.UPDATE_SAMPLE === '1') {
      mkdirSync(new URL('.', SAMPLE_URL), { recursive: true });
      writeFileSync(SAMPLE_URL, `${JSON.stringify(expected, null, 2)}\n`);
    }
    const saved: unknown = JSON.parse(readFileSync(SAMPLE_URL, 'utf8'));
    expect(saved).toEqual(expected);
    expect(expected.provenance).toBe('saved-sample');
    expect(expected.warnings).toEqual([]);
  });
});
