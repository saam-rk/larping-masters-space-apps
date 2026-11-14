/** Actual GLTFLoader + Raycaster smoke check in Node; not a mobile FPS test. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placeTerrainMarker } from './terrain-marker.mjs';

const folder = new URL('./nobile-rim-2/', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('nobile-rim-2.metadata.json', folder), 'utf8'));
const data = await readFile(new URL('nobile-rim-2.glb', folder));
const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
let terrain;
let meshes = 0;
gltf.scene.traverse((obj) => { if (obj.isMesh) { terrain = obj; meshes++; } });
assert.equal(meshes, 1);
const records = [];
for (const [id, p] of Object.entries(metadata.markerPlacement.points)) {
  const placed = placeTerrainMarker(terrain, p.latitudeDeg, p.longitudeEastDeg, metadata, 2);
  assert.ok(placed);
  const differenceM = placed.surfaceElevationM - p.glbSurfaceM;
  assert.ok(Math.abs(differenceM) < 0.001);
  records.push({ id, differenceM, localWith2mOffset: placed.local.toArray() });
}
// Deterministic manual positions distributed across the square, independent of saved sites.
const e = metadata.coverage.meshExtentProjectedM;
for (let i = 0; i < 100; i++) {
  const x = e.xMin + (e.xMax - e.xMin) * ((i * 37 % 100) + 0.5) / 100;
  const y = e.yMin + (e.yMax - e.yMin) * ((i * 61 % 100) + 0.5) / 100;
  const lat = (2 * Math.atan(Math.hypot(x, y) / (2 * metadata.crs.sphereRadiusM)) - Math.PI / 2) * 180 / Math.PI;
  const lon = Math.atan2(x, y) * 180 / Math.PI;
  assert.ok(placeTerrainMarker(terrain, lat, lon, metadata));
}
assert.equal(placeTerrainMarker(terrain, -89, 0, metadata), null);
assert.equal(placeTerrainMarker(terrain, NaN, 58, metadata), null);
// Parent/world transformations must not change physical local elevation.
terrain.position.set(12, 34, 56);
terrain.rotation.set(0.1, 0.2, 0.3);
const point = metadata.markerPlacement.points.site;
assert.ok(Math.abs(placeTerrainMarker(terrain, point.latitudeDeg, point.longitudeEastDeg, metadata).surfaceElevationM - point.glbSurfaceM) < 0.001);
const report = { allPassed: true, loader: 'Three.js GLTFLoader', meshCount: meshes,
  manualCoordinatesChecked: 100, invalidAndOutsideReturnNull: true,
  transformedMeshChecked: true, pointComparisons: records,
  performance: 'Node parsing and geometry checks only; no browser, network or mobile FPS measurement' };
await writeFile(new URL('nobile-rim-2.web-loader.json', folder), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
