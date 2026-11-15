/** Explicit opt-in network recorder: 26 SERIAL NASA/JPL requests; never part of npm test.
 * Writes raw responses + request URLs and assembled snapshots for reproducible QA.
 */
import './typescript-imports.mjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { SITE_TERRAINS } = await import('../../src/features/scene/terrain/models.ts');
const { findSite } = await import('../../shared/sites.ts');
const { observerAltitudeKm } = await import('../../shared/observer.ts');
const { buildObserverUrl } = await import('../../server/horizons/query.ts');
const { parseObserverPayload } = await import('../../server/horizons/parse.ts');
const { buildEphemerisResponse } = await import('../../server/ephemeris/service.ts');

if (!process.argv.includes('--fetch')) throw new Error('Pass --fetch to authorize the serial upstream requests');
const root = new URL('../../docs/lighting-validation/', import.meta.url);
await mkdir(new URL('horizons/', root), { recursive: true });
const cases = SITE_TERRAINS.map(model => [model.siteId, '2026-11-14T12:00:00Z']);
cases.push(['apollo-11', '2025-03-14T06:58:00Z'], ['faustini-rim-a', '2026-11-05T00:00:00Z'], ['nobile-rim-1', '2026-11-20T12:00:00Z']);
const snapshots = [];
for (const [siteId, utc] of cases) {
  const site = findSite(siteId);
  const results = {};
  for (const body of ['sun', 'earth']) {
    const query = { body, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, altitudeKm: observerAltitudeKm(site), instant: new Date(utc) };
    const url = buildObserverUrl(query);
    const response = await fetch(url, { headers: { 'User-Agent': 'CLPS-Lighting-Validation/1.0 (+https://github.com/saam-rk/larping-masters-space-apps)' }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    const raw = await response.text();
    const payload = JSON.parse(raw);
    const parsed = parseObserverPayload(payload, body);
    assert.equal(parsed.ok, true, JSON.stringify(parsed));
    const table = parsed.table;
    assert.equal(table.ephemerisUtc, utc);
    assert.equal(table.observerFrame, 'MEAN_ME (high precision)');
    assert.equal(table.planetaryEphemeris, 'DE441');
    assert.match(payload.result, /Atmos refraction:\s*NO \(AIRLESS\)/);
    const coords = /Center geodetic\s*:\s*([^\{]+)/.exec(payload.result)?.[1].split(',').map(Number);
    assert.ok(coords && Math.abs(coords[1] - site.latitudeDeg) < 0.000001);
    assert.ok(Math.abs(coords[2] - query.altitudeKm) < 0.00001);
    const longitude = ((site.longitudeEastDeg % 360) + 360) % 360;
    assert.ok(Math.abs(coords[0] - longitude) < 0.000001);
    assert.match(payload.result, /Center radii\s*:\s*1737\.4,\s*1737\.4,\s*1737\.4 km/);
    const retrievedAt = new Date();
    const name = `${siteId}_${utc.replaceAll(':', '-')}_${body}.json`;
    await writeFile(new URL(`horizons/${name}`, root), JSON.stringify({ url, retrievedAt: retrievedAt.toISOString(), payload }, null, 2)+'\n');
    results[body] = { ok: true, table, retrievedAt, url };
    console.log(`${siteId} ${utc} ${body}: ${table.observation.azimuthDeg}, ${table.observation.elevationDeg}; altitude ${query.altitudeKm} km`);
  }
  snapshots.push(buildEphemerisResponse(site, new Date(utc), results, 'live'));
}
await writeFile(new URL('snapshots.json', root), JSON.stringify(snapshots, null, 2)+'\n');
console.log(`Recorded ${snapshots.length} matched surface-observer snapshots`);
