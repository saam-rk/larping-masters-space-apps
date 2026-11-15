/** node tools/lunar-terrain/generate-observers.mjs [--check]
 * Derive instrument heights from the shipped triangles, not a visual camera.
 * Node >=22.15 is needed for the local TypeScript import hook.
 */
import './typescript-imports.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { geometryOnly } from './geometry-only.mjs';

const root = new URL('../../', import.meta.url);
const { SITE_TERRAINS } = await import('../../src/features/scene/terrain/models.ts');
const { curvedTerrain, terrainGround, disposeTerrain } = await import('../../src/features/scene/terrain/curvedTerrain.ts');
const { findSite } = await import('../../shared/sites.ts');
const entries = {};
for (const model of SITE_TERRAINS) {
  const site = findSite(model.siteId);
  const path = new URL(`public${model.terrainUrl}`, root);
  const source = await geometryOnly(path);
  const curved = curvedTerrain(source, model, site, 0);
  const groundElevationM = terrainGround(curved);
  if (groundElevationM === null) throw new Error(`No terrain at ${site.id}`);
  entries[site.id] = {
    latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg,
    groundElevationM, eyeHeightM: 1.7,
    asset: model.terrainUrl,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  };
  disposeTerrain(curved);
  disposeTerrain(source);
}
const output = `${JSON.stringify(entries, null, 2)}\n`;
const destination = new URL('shared/terrain-observers.json', root);
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== output) throw new Error('Terrain observer ledger is stale');
  console.log(`Verified ${Object.keys(entries).length} asset hashes and curved-mesh observer heights`);
} else {
  writeFileSync(destination, output);
  console.log(`Generated ${fileURLToPath(destination)}`);
}
