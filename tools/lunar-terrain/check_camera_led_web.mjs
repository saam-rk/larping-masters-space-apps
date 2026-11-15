import {
  AmbientLight, ClampToEdgeWrapping, Color, DirectionalLight, Matrix4,
  PerspectiveCamera, Raycaster, REVISION, Scene, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTerrainSampler } from './marker.mjs';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

export async function reviewTerrain(canvas, siteId) {
  const metadataResponse = await fetch(`/terrain/${siteId}.metadata.json`);
  check(metadataResponse.ok, 'Metadata HTTP request failed');
  const metadata = await metadataResponse.json();
  const loader = new GLTFLoader();
  const [terrain, astronaut] = await Promise.all([
    loader.loadAsync(`/terrain/${siteId}.glb`), loader.loadAsync(metadata.astronaut.url),
  ]);
  const scene = new Scene();
  scene.background = new Color(0x080808);
  scene.add(terrain.scene, astronaut.scene);
  astronaut.scene.applyMatrix4(new Matrix4().fromArray(metadata.astronaut.matrixGlbColumnMajor));
  scene.updateMatrixWorld(true);
  const mesh = terrain.scene.children[0];
  check(mesh.isMesh, 'Expected terrain mesh');
  check(mesh.geometry.attributes.position.count === metadata.blenderRoundTrip.vertices, 'Vertex count');
  check(mesh.geometry.index.count / 3 === metadata.blenderRoundTrip.triangles, 'Triangle count');
  const mat = mesh.material;
  check(mat.map && mat.normalMap && mat.roughnessMap && mat.metalnessMap, 'PBR channels');
  for (const texture of [mat.map, mat.normalMap, mat.roughnessMap]) {
    check(texture.wrapS === ClampToEdgeWrapping && texture.wrapT === ClampToEdgeWrapping, 'Atlas sampler');
    check(texture.image.width > 0 && texture.image.height > 0, 'Image decode failed');
  }
  check(mat.normalMap.image.width === 2048, 'Normal map resolution');
  const sampler = createTerrainSampler(terrain.scene, metadata);
  const controlChecks = metadata.controlPoints.map((point) => {
    const hit = sampler(point.latitudeDeg, point.longitudeEastDeg);
    check(hit && Math.abs(hit.radialElevationM - point.meshHeightM) < 0.001, 'Source control height');
    return { name: point.name, heightM: hit.radialElevationM };
  });
  const parts = [];
  const points = [];
  astronaut.scene.traverse((o) => {
    if (!o.isMesh) return;
    parts.push(o);
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) points.push(new Vector3().fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld));
  });
  check(parts.length === 13, 'Astronaut mesh parts');
  const heightM = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
  check(Math.abs(heightM - 1.7) < 0.001, 'Astronaut height');
  const ray = new Raycaster();
  function ground(x, z) {
    ray.set(new Vector3(x, 10000, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(mesh, false)[0];
    check(hit, 'Missing terrain support');
    return hit.point.y;
  }
  let maxSoleGapM = 0;
  for (const part of parts.filter((o) => o.name.includes('boot_'))) {
    const a = part.geometry.attributes.position;
    let bottom = Infinity;
    for (let i = 0; i < a.count; i++) bottom = Math.min(bottom, a.getY(i));
    for (let i = 0; i < a.count; i++) {
      if (Math.abs(a.getY(i) - bottom) > 1e-5) continue;
      const p = new Vector3().fromBufferAttribute(a, i).applyMatrix4(part.matrixWorld);
      maxSoleGapM = Math.max(maxSoleGapM, Math.abs(p.y - ground(p.x, p.z)));
    }
  }
  check(maxSoleGapM < 0.001, 'Boot contact');
  const spec = metadata.initialCamera;
  const camera = new PerspectiveCamera(spec.verticalFovDeg, 390 / 844, spec.nearM, spec.farM);
  const initial = new Vector3(...spec.positionGlbM);
  const target = new Vector3(...spec.targetGlbM);
  const movement = [];
  for (const aspect of [1280 / 900, 390 / 844]) {
    for (const fov of [48, 56, 64]) {
      for (let step = 0; step < 17; step++) {
        const theta = step * Math.PI / 8;
        const radius = step === 16 ? 0 : 2;
        camera.position.copy(initial).add(new Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
        camera.position.y = ground(camera.position.x, camera.position.z) + spec.heightAboveFinalMeshM;
        camera.aspect = aspect;
        camera.fov = aspect < 0.6 && radius > 1 ? Math.max(fov, spec.portraitMovingMinimumFovDeg) : fov;
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const projected = points.map((p) => p.clone().project(camera));
        const fullBody = projected.every((p) => Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
        check(fullBody, `Full-body framing: aspect=${aspect}, fov=${camera.fov}, step=${step}`);
        movement.push({ aspect, requestedFov: fov, actualFov: camera.fov, step, fullBody });
      }
    }
  }
  // Portrait movement toward the figure widens the FOV per the metadata policy.
  camera.position.copy(initial);
  camera.aspect = 390 / 844;
  camera.fov = 48;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const sun = new DirectionalLight(0xffffff, 3);
  sun.position.set(10, 13, 12).add(target);
  sun.target.position.copy(target);
  scene.add(sun, sun.target, new AmbientLight(0xffffff, 0.15));
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(390, 844, false);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const error = gl.getError();
  check(error === gl.NO_ERROR, `WebGL error ${error}`);
  const report = {
    status: 'passed', browser: navigator.userAgent, threeRevision: REVISION,
    deviceClass: 'Desktop embedded browser, NOT a physical mobile device',
    viewport: [390, 844], siteId, terrainVertices: metadata.blenderRoundTrip.vertices, terrainTriangles: metadata.blenderRoundTrip.triangles,
    imageDecode: { color: [mat.map.image.width, mat.map.image.height],
      normal: [mat.normalMap.image.width, mat.normalMap.image.height],
      roughness: [mat.roughnessMap.image.width, mat.roughnessMap.image.height] },
    standardPbrChannels: true, clampToEdge: true, astronautHeightM: heightM, maxSoleGapM,
    controls: controlChecks, movementCases: movement.length,
    fullBodyFramingFailures: movement.filter((item) => !item.fullBody),
    renderedDrawCalls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles,
    webglError: error, mobilePerformance: 'Pending: no physical device, throttled-network or FPS claim',
  };
  window.terrainReview = { report, renderer, camera, scene, metadata };
  return report;
}
