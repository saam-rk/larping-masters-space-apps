import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  Box3, BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial,
  PerspectiveCamera, Raycaster, REVISION, Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTerrainSampler, projectCoordinate } from './marker.mjs';

const root = new URL('../../', import.meta.url);
async function readJson(relative) {
  try {
    return JSON.parse(await readFile(new URL(relative, root), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON: ${relative}`, { cause: error });
  }
}
const metadata = await readJson('public/terrain/nobile-rim-1.metadata.json');
const validation = await readJson('assets/terrain/nobile-rim-1/validation.json');
const bytes = await readFile(new URL('public/terrain/nobile-rim-1.glb', root));
const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '');
const sampler = createTerrainSampler(gltf.scene, metadata);
const meshes = [];
gltf.scene.traverse((object) => { if (object.isMesh) meshes.push(object); });
assert.equal(meshes.length, 1);
assert.equal(meshes[0].geometry.attributes.position.count, 50000);
assert.equal(meshes[0].geometry.index.count / 3, 99533);
assert.deepEqual(Object.keys(meshes[0].geometry.attributes).sort(), ['normal', 'position']);
const checks = ['installed Three.js GLTFLoader decodes uncompressed asset without extra decoders',
  'exactly one terrain mesh, 50000 vertices, 99533 triangles, position and normal only'];
const controls = validation.controls.map((point) => {
  const result = sampler(point.latitudeDeg, point.longitudeEastDeg);
  assert.ok(result);
  const residual = result.radialElevationM - point.glbBarycentricM;
  assert.ok(Math.abs(residual) < 0.00001);
  return { name: point.name, threeHeightM: result.radialElevationM, residualToPythonM: residual };
});
checks.push('saved site, ridge and independent manual coordinate agree with Python GLB barycentric heights');
const site = metadata.controlPoints[0];
const base = sampler(site.latitudeDeg, site.longitudeEastDeg);
const elevated = sampler(site.latitudeDeg, site.longitudeEastDeg, 2);
assert.ok(Math.abs(elevated.position.y - base.position.y - 2) < 1e-10);
assert.equal(elevated.radialElevationM, base.radialElevationM);
checks.push('observer offset changes marker height, not terrain radial elevation');
for (const [lat, lon, height] of [[NaN, 37, 0], [-85, Infinity, 0], [-91, 37, 0],
  [90, 37, 0], [-85, 361, 0], [-85, 37, -1], [-85, 37, NaN], [0, 0, 0]]) {
  assert.equal(sampler(lat, lon, height), null);
}
checks.push('invalid inputs, negative observer offset and coordinates outside the crop return null');
const projected = projectCoordinate(site.latitudeDeg, site.longitudeEastDeg, metadata.crs.referenceRadiusM);
assert.ok(Math.hypot(projected[0] - 84000.01002578877, projected[1] - 110000.01079172149) < 1e-6);
checks.push('spherical JS projection matches Rasterio/PROJ at the saved coordinate');

function inverse(x, y) {
  return [(2 * Math.atan(Math.hypot(x, y) / (2 * metadata.crs.referenceRadiusM)) - Math.PI / 2) * 180 / Math.PI,
    Math.atan2(x, y) * 180 / Math.PI];
}
const [minX, minY, maxX, maxY] = metadata.coverage.meshPixelCenterBoundsM;
for (let row = 0; row < 10; row++) {
  for (let column = 0; column < 10; column++) {
    const coordinate = inverse(minX + (column + 0.37) / 10 * (maxX - minX),
      minY + (row + 0.61) / 10 * (maxY - minY));
    assert.ok(sampler(...coordinate));
  }
}
assert.equal(sampler(...inverse(minX - 0.1, (minY + maxY) / 2)), null);
checks.push('100 arbitrary interior coordinates hit terrain; a coordinate just outside the mesh is rejected');

// Synthetic gap: remove the terrain surface entirely from the ray column.
// Bounds alone remain valid, so this exercises the no-hit path independently.
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute([
  -1000, 0, -1000, -1000, 0, 1000, -900, 0, 1000,
  900, 0, -1000, 900, 0, 1000, 1000, 0, 1000,
], 3));
const gapMesh = new Mesh(geometry, new MeshStandardMaterial());
const gapSampler = createTerrainSampler(gapMesh, metadata);
assert.equal(gapSampler(site.latitudeDeg, site.longitudeEastDeg), null);
checks.push('a valid bounding rectangle with no triangle at the coordinate returns null, never a zero height');
gltf.scene.scale.setScalar(2);
assert.throws(() => createTerrainSampler(gltf.scene, metadata), /untransformed/);
gltf.scene.scale.setScalar(1);
checks.push('transformed terrain is rejected to prevent silently misregistered markers');

let scaleReference = null;
if (metadata.scaleReference) {
  gltf.scene.updateMatrixWorld(true);
  const reference = metadata.scaleReference;
  const figureBytes = await readFile(new URL(`public/terrain/${reference.webAsset.filename}`, root));
  const figure = await new GLTFLoader().parseAsync(
    figureBytes.buffer.slice(figureBytes.byteOffset, figureBytes.byteOffset + figureBytes.byteLength), '');
  figure.scene.updateMatrixWorld(true);
  const parts = [];
  figure.scene.traverse((object) => {
    if (object.isMesh) parts.push(object);
    assert.ok(!object.isCamera && !object.isLight);
    assert.deepEqual(object.scale.toArray(), [1, 1, 1]);
  });
  assert.equal(parts.length, 13);
  const bounds = new Box3().setFromObject(figure.scene);
  const heightM = bounds.max.y - bounds.min.y;
  assert.ok(Math.abs(heightM - 1.7) < 0.001);
  const figureRoot = figure.scene.getObjectByName('Astronaut_1p70m');
  assert.ok(figureRoot);
  assert.ok(figureRoot.getWorldPosition(new Vector3()).distanceTo(new Vector3(...reference.glbPositionM)) < 0.001);
  const savedCamera = reference.groundCamera;
  const camera = new PerspectiveCamera(savedCamera.verticalFovDeg, savedCamera.aspect, 0.1, 100000);
  camera.position.fromArray(savedCamera.glbPositionM);
  camera.lookAt(camera.position.clone().add(new Vector3(...savedCamera.glbLookDirection)));
  camera.updateMatrixWorld(true);
  const raycaster = new Raycaster();
  for (const part of parts) {
    const positions = part.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const point = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld);
      const projectedPoint = point.clone().project(camera);
      assert.ok(Math.abs(projectedPoint.x) < 1 && Math.abs(projectedPoint.y) < 1 && Math.abs(projectedPoint.z) < 1);
    }
    // Ensure the terrain does not hide the center of any body part.
    const center = new Box3().setFromObject(part).getCenter(new Vector3());
    const direction = center.clone().sub(camera.position);
    raycaster.set(camera.position, direction.clone().normalize());
    const hit = raycaster.intersectObject(meshes[0], false)[0];
    assert.ok(!hit || hit.distance >= direction.length() - 0.001);
  }
  scaleReference = { heightM, meshParts: parts.length, bytes: figureBytes.byteLength,
    fullyInsideGroundCamera: true, bodyPartCentersNotOccludedByTerrain: true };
  checks.push('separate astronaut GLB: 13 parts, unit scales, 1.70 m, matching placement and full ground-camera framing');
}

const report = { status: 'passed', runtime: process.version, threeRevision: REVISION,
  checks, controls, scaleReference, browserRenderTest: 'not performed',
  mobilePerformance: 'pending: Node loader/raycast checks are not browser or mobile FPS measurements' };
const output = new URL('assets/terrain/nobile-rim-1/three-loader-check.json', root);
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`Report: ${fileURLToPath(output)}`);
