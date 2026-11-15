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
import { APOLLO_11_SITE_ID, findSite, type SiteId } from '../../shared/sites.js';
import { APOLLO_11_FLAG_UTC, APOLLO_11_LANDING_UTC } from '../../shared/time.js';
import { APOLLO_FIXTURE_RETRIEVED_AT, APOLLO_FLAG_FIXTURE_RETRIEVED_AT, FIXTURES, loadFixtureText, NOBILE_FIXTURE_RETRIEVED_AT, respondWith } from '../horizons/__fixtures__/load.js';
import { fetchObserverTable } from '../horizons/client.js';
import { buildEphemerisResponse } from './service.js';

async function buildSampleFromFixtures(
  id: SiteId, utc: string, sunFixture: string, earthFixture: string, retrievedAt: Date,
): Promise<EphemerisResponse> {
  const site = findSite(id);
  const instant = new Date(utc);
  const query = { latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, altitudeKm: 0, instant };
  const options = (fixture: string) => ({
    fetch: respondWith(200, loadFixtureText(fixture)),
    now: () => retrievedAt,
  });
  const [sun, earth] = await Promise.all([
    fetchObserverTable({ ...query, body: 'sun' }, options(sunFixture)),
    fetchObserverTable({ ...query, body: 'earth' }, options(earthFixture)),
  ]);
  return buildEphemerisResponse(site, instant, { sun, earth }, 'saved-sample');
}

describe('saved sample', () => {
  it.each([
    ['nobile-rim-1', '2026-11-14T12:00:00Z', FIXTURES.nobileSun, FIXTURES.nobileEarth, NOBILE_FIXTURE_RETRIEVED_AT],
    [APOLLO_11_SITE_ID, APOLLO_11_LANDING_UTC, FIXTURES.apolloSun, FIXTURES.apolloEarth, APOLLO_FIXTURE_RETRIEVED_AT],
    [APOLLO_11_SITE_ID, APOLLO_11_FLAG_UTC, FIXTURES.apolloFlagSun, FIXTURES.apolloFlagEarth, APOLLO_FLAG_FIXTURE_RETRIEVED_AT],
  ] as const)('%s matches the response derived from the raw Horizons fixtures', async (id, utc, sun, earth, retrievedAt) => {
    const sampleUrl = new URL(`../../shared/samples/${id}_${utc.replaceAll(':', '-')}.json`, import.meta.url);
    const expected = await buildSampleFromFixtures(id, utc, sun, earth, retrievedAt);
    if (process.env.UPDATE_SAMPLE === '1') {
      mkdirSync(new URL('.', sampleUrl), { recursive: true });
      writeFileSync(sampleUrl, `${JSON.stringify(expected, null, 2)}\n`);
    }
    const saved: unknown = JSON.parse(readFileSync(sampleUrl, 'utf8'));
    expect(saved).toEqual(expected);
    expect(expected.provenance).toBe('saved-sample');
    expect(expected.warnings).toEqual([]);
  });
});
