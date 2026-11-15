/**
 * First-person local horizon on LROC terrain at Apollo 11, or on LOLA terrain
 * at a site with a terrain model (Nobile Rim 1, Nobile Rim 2, Shackleton Rim,
 * Amundsen Rim, Haworth and Shoemaker Rim A, see `terrain/models.ts`). The Sun and Earth are
 * placed from the same azimuth/elevation as the results panel.
 *
 * Units are meters. Scene frame as in `geometry.ts` (-Z north, +X east,
 * +Y up); the world origin is the site point on the terrain surface.
 *
 * The Apollo camera frames the three characters and Eagle. What the
 * reenactment shows depends on the result's instant: nothing before the
 * touchdown, no flag until it was erected and only the flag after the liftoff
 * (see `apolloTimeline.ts` and `apolloScene.ts`); its 50-star canton is
 * repaired at load time (see `apolloFlag.ts`). At the LOLA sites
 * the viewer stands still at eye height right beside the 1.70 m astronaut (about
 * 2.6 m away), facing it with the Sun just to the right; a soft contact shadow
 * (decorative, not Sun-based) marks where the figure stands. Dragging only turns
 * the head and the wheel or the zoom slider narrows the field of view (see
 * `EyeLevelRig`). Sun and Earth are drawn far beyond each terrain crop with
 * their real apparent angular diameter. Beyond the
 * crop there is no relief data: an invisible floor marks an assumed horizon, a
 * smooth lunar sphere continuing from the crop edge as seen from eye height
 * (see `horizonFloor.ts`). It only writes depth, so it hides the Sun and the
 * Earth below that horizon while the star background shows through it: the
 * stars cover the whole sphere, and on a steep rim (Shackleton Rim) the view
 * can look far below the horizon past the end of the relief data. Where the
 * terrain falls away, the assumed horizon lies below the green geometric line
 * (elevation 0), so the parts of the Sun or the Earth between the two are
 * drawn.
 *
 * The Sun and the Earth are never cut away: the parts hidden by the relief, the
 * astronaut or the assumed horizon are drawn again as a faint translucent
 * "ghost" (see `FarBody`), so the body can always be found while its hidden
 * part does not read as visible.
 */

import { Html, Line, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  AnimationMixer,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  GreaterDepth,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { APOLLO_11_SITE_ID } from '../../../shared/sites';
import { useI18n } from '../../i18n/context';
import { stageApolloScene } from './apolloScene';
import { apolloScenePhase, type ApolloScenePhase } from './apolloTimeline';
import { blobShadowTexture } from './blobShadow';
import { radiusForAngularDiameter, upperLimbAboveHorizon, type PlacedBodies, type SceneBody } from './bodies';
import { EYE_HEIGHT_M, EyeLevelRig } from './EyeLevelRig';
import { horizontalToDirection, horizontalToPosition, type Vector3Tuple } from './geometry';
import { glowTexture } from './glow';
import { horizonProfile, type HorizonSample } from './horizonFloor';
import { APOLLO_11_REENACTMENT, APOLLO_11_TERRAIN } from './terrain/apollo11';
import { polarTerrainForSite } from './terrain/models';
import {
  ASTRONAUT_HEIGHT_M,
  SPHERE_RADIUS_M,
  projectSouthPolar,
  projectedToGlb,
  terrainYawRad,
  type PolarTerrain,
} from './terrain/siteTerrain';
import { DEFAULT_FOV_DEG } from './zoom';

/** Distance at which the Sun and Earth are drawn (m): beyond every terrain point of the crop. */
const BODY_DISTANCE_M = 80_000;
/** Radius of the geometric horizon line and floor (m), between the crop and the bodies. */
const HORIZON_RADIUS_M = 60_000;
/** Azimuth sectors of the assumed horizon beyond the crop (2 degrees each, like the horizon line). */
const FLOOR_SECTORS = 180;
/** Rows of the floor mesh between its upper edge and the nadir. */
const FLOOR_ROWS = 12;
/** Half-size of the square of terrain kept for camera ground queries (m). */
const PROBE_HALF_SIZE_M = 120;
/** Horizontal distance from the astronaut to where the viewer stands (m): right beside the figure. */
const VIEWER_DISTANCE_M = 2.6;
/** Initial gaze pitch (deg): down enough to show the figure's feet while the horizon stays in view. */
const START_PITCH_DEG = -18;
/** Angle (deg) between the first body and the gaze, so the body shows beside the figure, not behind it. */
const FOCUS_OFFSET_DEG = 20;
/** Radius of the contact shadow disc (m) and its lift above the terrain (m), to avoid z-fighting. */
const SHADOW_RADIUS_M = 0.6;
const SHADOW_LIFT_M = 0.03;
/** Horizontal offset (m) of the terrain samples used to tilt the shadow to the local slope. */
const SLOPE_SAMPLE_M = 0.5;
/** Draw order of the hidden parts of the Sun and Earth: after the terrain, before the horizon line and astronaut. */
const GHOST_RENDER_ORDER = 5;
/** Opacity of the hidden parts of the Sun and Earth. */
const GHOST_OPACITY = 0.35;
/** Segments of the low-poly body spheres (a disc of under 1 degree on screen needs no more). */
const BODY_WIDTH_SEGMENTS = 32;
const BODY_HEIGHT_SEGMENTS = 16;
/** Draw order of the horizon line and ticks: after the terrain, which they are drawn over. */
const HORIZON_RENDER_ORDER = 10;
/** Steps per second of the Apollo 11 reenactment animation (renders it asks for). */
const REENACTMENT_FPS = 30;
/** Draw order of the astronaut: after the horizon line, so the figure stays in front of it. */
const ASTRONAUT_RENDER_ORDER = 20;

const DOWN = new Vector3(0, -1, 0);

function firstMesh(root: Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((object) => {
    if (!found && (object as Mesh).isMesh) found = object as Mesh;
  });
  return found;
}

/**
 * Copy of the astronaut that is drawn after the horizon line. The line ignores
 * depth so that it shows over the relief; three.js draws transparent objects
 * after opaque ones, so the figure's materials are marked transparent (still
 * fully opaque and writing depth) to join that pass with a later render order.
 * Materials are cloned so the cached GLB stays untouched. A placement baked
 * into the figure's root node (Nobile Rim 1) is dropped: the view places the
 * figure itself.
 */
function astronautInFront(source: Object3D): Object3D {
  const astronaut = source.clone();
  for (const root of astronaut.children) {
    root.position.set(0, 0, 0);
    root.quaternion.identity();
  }
  astronaut.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.renderOrder = ASTRONAUT_RENDER_ORDER;
    const inFront = (material: Material) => {
      const copy = material.clone();
      copy.transparent = true;
      copy.depthWrite = true;
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(inFront) : inFront(mesh.material);
  });
  return astronaut;
}

/**
 * Small copy of the terrain triangles around `center` (GLB frame), used for
 * cheap downward ray casts instead of testing every triangle of the crop
 * (tens of thousands; Shackleton Rim, Amundsen Rim, Haworth and Shoemaker
 * Rim A pack most of them near the viewer).
 */
function buildProbe(terrain: Mesh, center: Vector3Tuple): Mesh {
  const source = terrain.geometry;
  const position = source.getAttribute('position');
  const index = source.getIndex();
  const count = index ? index.count : position.count;
  const [cx, , cz] = center;
  const kept: number[] = [];
  const vertex = new Vector3();
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    const xs = ids.map((id) => position.getX(id));
    const zs = ids.map((id) => position.getZ(id));
    if (
      Math.max(...xs) < cx - PROBE_HALF_SIZE_M ||
      Math.min(...xs) > cx + PROBE_HALF_SIZE_M ||
      Math.max(...zs) < cz - PROBE_HALF_SIZE_M ||
      Math.min(...zs) > cz + PROBE_HALF_SIZE_M
    ) {
      continue;
    }
    for (const id of ids) {
      vertex.fromBufferAttribute(position, id).applyMatrix4(terrain.matrix);
      kept.push(vertex.x, vertex.y, vertex.z);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(kept), 3));
  return new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
}

interface TerrainFrame {
  /** GLB frame -> scene (world) frame. */
  readonly toWorld: Matrix4;
  /** Ground height in the world frame below world (x, z), or null outside the probe. */
  readonly groundAt: (x: number, z: number) => number | null;
  readonly astronaut: Vector3;
}

function useTerrainFrame(
  terrain: Mesh | null,
  model: PolarTerrain,
  latitudeDeg: number,
  longitudeEastDeg: number,
): TerrainFrame | null {
  return useMemo(() => {
    if (!terrain) return null;
    const probe = buildProbe(terrain, model.astronautGlbPosition);
    const raycaster = new Raycaster();
    const localGround = (x: number, z: number): number | null => {
      raycaster.set(new Vector3(x, 10_000, z), DOWN);
      return raycaster.intersectObject(probe, false)[0]?.point.y ?? null;
    };

    const projected = projectSouthPolar(latitudeDeg, longitudeEastDeg);
    const [sx, , sz] = projectedToGlb(model, projected.x, projected.y, 0);
    const sy = localGround(sx, sz);
    if (sy === null) return null;

    const toWorld = new Matrix4().makeRotationY(terrainYawRad(model)).multiply(new Matrix4().makeTranslation(-sx, -sy, -sz));
    const toLocal = toWorld.clone().invert();

    const [ax, ayStored, az] = model.astronautGlbPosition;
    const astronaut = new Vector3(ax, localGround(ax, az) ?? ayStored, az).applyMatrix4(toWorld);

    const groundAt = (x: number, z: number): number | null => {
      const local = new Vector3(x, 0, z).applyMatrix4(toLocal);
      const y = localGround(local.x, local.z);
      return y === null ? null : new Vector3(local.x, y, local.z).applyMatrix4(toWorld).y;
    };
    return { toWorld, groundAt, astronaut };
  }, [terrain, model, latitudeDeg, longitudeEastDeg]);
}

/**
 * Assumed horizon beyond the crop seen from `eye` (see `horizonFloor.ts`):
 * every terrain vertex, in the world frame, relative to the eye.
 */
function floorProfile(terrain: Mesh, toWorld: Matrix4, eye: Vector3Tuple): number[] {
  const position = terrain.geometry.getAttribute('position');
  const toWorldFromMesh = toWorld.clone().multiply(terrain.matrix);
  const vertex = new Vector3();
  const [ex, ey, ez] = eye;
  function* samples(): Generator<HorizonSample> {
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(toWorldFromMesh);
      const dx = vertex.x - ex;
      const dz = vertex.z - ez;
      // Azimuth clockwise from north (-Z) toward east (+X).
      yield { azimuthDeg: (Math.atan2(dx, -dz) * 180) / Math.PI, distanceM: Math.hypot(dx, dz), heightM: vertex.y - ey };
    }
  }
  return horizonProfile(samples(), FLOOR_SECTORS, SPHERE_RADIUS_M);
}

/**
 * Invisible floor below the assumed horizon: on a sphere of `HORIZON_RADIUS_M`
 * around the eye, from the profile elevation of each sector down to the nadir.
 */
function floorGeometry(profileDeg: readonly number[]): BufferGeometry {
  const sectors = profileDeg.length;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= sectors; i += 1) {
    const top = profileDeg[i % sectors] ?? 0;
    const azimuth = (i * 360) / sectors;
    for (let j = 0; j <= FLOOR_ROWS; j += 1) {
      const elevation = top + ((-90 - top) * j) / FLOOR_ROWS;
      positions.push(...horizontalToPosition(azimuth, elevation, HORIZON_RADIUS_M));
    }
  }
  const column = FLOOR_ROWS + 1;
  for (let i = 0; i < sectors; i += 1) {
    for (let j = 0; j < FLOOR_ROWS; j += 1) {
      const a = i * column + j;
      const b = (i + 1) * column + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return geometry;
}

/** Bearing (deg) from the astronaut to the viewer, so the first body is in view just right of the figure. */
function initialBearing(placed: readonly SceneBody[]): number {
  const focus = placed.find((body) => body.body === 'sun') ?? placed[0];
  const viewAzimuth = (focus?.azimuthDeg ?? 0) - FOCUS_OFFSET_DEG;
  return (((viewAzimuth + 180) % 360) + 360) % 360;
}

/**
 * Simple contact shadow: a soft dark disc on the ground under the astronaut,
 * tilted to the local slope. A depth cue only; it ignores the Sun direction.
 */
function ContactShadow({ frame }: { frame: TerrainFrame }) {
  const { position, quaternion } = useMemo(() => {
    const { x, y, z } = frame.astronaut;
    const s = SLOPE_SAMPLE_M;
    const east = frame.groundAt(x + s, z) ?? y;
    const west = frame.groundAt(x - s, z) ?? y;
    const south = frame.groundAt(x, z + s) ?? y;
    const north = frame.groundAt(x, z - s) ?? y;
    // Surface normal from the height differences across the figure's footprint.
    const normal = new Vector3(west - east, 2 * s, north - south).normalize();
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
    const position = frame.astronaut.clone().addScaledVector(normal, SHADOW_LIFT_M);
    return { position, quaternion };
  }, [frame]);

  return (
    <mesh position={position} quaternion={quaternion} renderOrder={1}>
      <circleGeometry args={[SHADOW_RADIUS_M, 48]} />
      <meshBasicMaterial map={blobShadowTexture()} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Settings of the first-person view shared with the DOM controls (see `SkyScene`). */
export interface FirstPersonControls {
  /** Zoom level (0..1, see `zoom.ts`). */
  readonly zoom: number;
  readonly onZoomChange: (level: number) => void;
  /** Draw the geometric horizon line, its ticks and the compass labels. */
  readonly showHorizon: boolean;
  readonly animateReenactment?: boolean;
}

function Terrain({
  data,
  bodies,
  controls,
  model,
}: {
  data: EphemerisResponse;
  bodies: PlacedBodies;
  controls: FirstPersonControls;
  model: PolarTerrain;
}) {
  const { messages, locale } = useI18n();
  const terrainGltf = useGLTF(model.terrainUrl, false, false);
  const astronautGltf = useGLTF(model.astronautUrl, false, false);
  const terrainScene = useMemo(() => terrainGltf.scene.clone(), [terrainGltf.scene]);
  const astronautScene = useMemo(() => astronautInFront(astronautGltf.scene), [astronautGltf.scene]);
  const astronautRef = useRef<Group>(null);
  const terrainMesh = useMemo(() => firstMesh(terrainScene), [terrainScene]);
  const frame = useTerrainFrame(terrainMesh, model, data.site.latitudeDeg, data.site.longitudeEastDeg);

  const bearing = initialBearing(bodies.placed);
  // The viewer stands still on the terrain, VIEWER_DISTANCE_M from the figure along `bearing`.
  const view = useMemo(() => {
    if (!frame || !terrainMesh) return null;
    const [dx, , dz] = horizontalToDirection(bearing, 0);
    const standX = frame.astronaut.x + dx * VIEWER_DISTANCE_M;
    const standZ = frame.astronaut.z + dz * VIEWER_DISTANCE_M;
    const eye: Vector3Tuple = [standX, (frame.groundAt(standX, standZ) ?? frame.astronaut.y) + EYE_HEIGHT_M, standZ];
    return { eye, floor: floorGeometry(floorProfile(terrainMesh, frame.toWorld, eye)) };
  }, [frame, terrainMesh, bearing]);
  useEffect(() => () => view?.floor.dispose(), [view]);

  if (!frame || !view) {
    return (
      <Html center className="scene__label">
        {messages.scene.terrainMissing}
      </Html>
    );
  }

  const { eye } = view;
  // The figure's visor (+Z) faces the viewer.
  const astronautYaw = ((180 - bearing) * Math.PI) / 180;
  const heightLabel = `${ASTRONAUT_HEIGHT_M.toLocaleString(locale, { minimumFractionDigits: 2 })} m`;

  return (
    <>
      <primitive object={terrainScene} matrix={frame.toWorld} matrixAutoUpdate={false} />
      <ContactShadow frame={frame} />
      <group ref={astronautRef} position={frame.astronaut} rotation-y={astronautYaw}>
        <primitive object={astronautScene} />
        <Html position={[0, ASTRONAUT_HEIGHT_M + 0.35, 0]} center className="scene__label scene__label--small">
          {heightLabel}
        </Html>
      </group>
      <EyeLevelRig
        eye={eye}
        initialHeadingDeg={(bearing + 180) % 360}
        initialPitchDeg={START_PITCH_DEG}
        zoom={controls.zoom}
        onZoomChange={controls.onZoomChange}
      />
      <Sky eye={eye} floor={view.floor} bodies={bodies} showHorizon={controls.showHorizon} occluder={astronautRef} />
    </>
  );
}

function ApolloTerrain({
  bodies,
  controls,
  phase,
}: {
  bodies: PlacedBodies;
  controls: FirstPersonControls;
  /** What the reenactment shows at the result's instant. */
  phase: ApolloScenePhase;
}) {
  const { eye, heading, pitch, url } = APOLLO_11_REENACTMENT;
  const terrainGltf = useGLTF(APOLLO_11_TERRAIN.terrainUrl, false, false);
  const propsGltf = useGLTF(url, false, false);
  const terrain = useMemo(() => {
    const clone = terrainGltf.scene.clone();
    clone.traverse((object) => { if (object instanceof Mesh) object.receiveShadow = true; });
    return clone;
  }, [terrainGltf.scene]);
  const { props, stage } = useMemo(() => {
    const clone = propsGltf.scene.clone();
    const stage = stageApolloScene(clone, propsGltf.animations);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return { props: clone, stage };
  }, [propsGltf.scene, propsGltf.animations]);
  useEffect(() => () => stage.dispose(), [stage]);
  const clips = stage.clips(phase);
  const moving = controls.animateReenactment && clips.length > 0;
  const mixer = useMemo(() => new AnimationMixer(props), [props]);
  const occluder = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const floor = useMemo(() => {
    const mesh = firstMesh(terrain);
    return mesh ? floorGeometry(floorProfile(mesh, new Matrix4(), eye)) : null;
  }, [terrain, eye]);

  useEffect(() => () => floor?.dispose(), [floor]);
  // Each phase shows its own props and plays its own tracks from the start.
  useEffect(() => {
    mixer.stopAllAction();
    stage.apply(phase);
    for (const clip of clips) mixer.clipAction(clip).play();
    mixer.setTime(0);
    invalidate();
    return () => { mixer.stopAllAction(); };
  }, [mixer, stage, phase, clips, invalidate]);
  useEffect(() => {
    if (!controls.animateReenactment) mixer.setTime(0);
    invalidate();
  }, [controls.animateReenactment, mixer, invalidate]);
  // The reenactment advances on its own clock at REENACTMENT_FPS and asks for
  // one render per step, instead of rendering on every display refresh (up to
  // 165 per second, each with a shadow pass): that kept the GPU saturated with
  // full effects even when nobody touched the view. Dragging still renders at
  // the display rate (see `EyeLevelRig`).
  useEffect(() => {
    if (!moving) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      mixer.update(Math.min((now - last) / 1000, 1 / 15));
      last = now;
      invalidate();
    }, 1000 / REENACTMENT_FPS);
    return () => window.clearInterval(timer);
  }, [moving, mixer, invalidate]);

  return (
    <>
      <primitive object={terrain} />
      <group ref={occluder}><primitive object={props} /></group>
      <EyeLevelRig eye={eye} initialHeadingDeg={heading} initialPitchDeg={pitch}
        zoom={controls.zoom} onZoomChange={controls.onZoomChange} />
      {floor && <Sky eye={eye} floor={floor} bodies={bodies} showHorizon={controls.showHorizon}
        occluder={occluder} surfaceReenactment />}
    </>
  );
}

/**
 * Horizon line, horizon floor, compass labels, Sun, Earth and the sunlight,
 * centered on the eye. `showHorizon` hides the line, ticks and labels; the
 * floor (see `floorGeometry`) stays: it is depth-only, so the stars show
 * through it while it still hides the Sun and the Earth below the assumed
 * horizon (drawn there as ghosts, see `FarBody`). The line passes behind the astronaut (see `astronautInFront`) and the
 * compass labels hide while `occluder` covers them.
 */
function Sky({
  eye,
  floor,
  bodies,
  showHorizon,
  occluder,
  surfaceReenactment = false,
}: {
  eye: Vector3Tuple;
  floor: BufferGeometry;
  bodies: PlacedBodies;
  showHorizon: boolean;
  occluder: RefObject<Object3D | null>;
  surfaceReenactment?: boolean;
}) {
  const { messages } = useI18n();
  const ring = useMemo(
    () => Array.from({ length: 181 }, (_, i) => horizontalToPosition(i * 2, 0, HORIZON_RADIUS_M * 0.98)),
    [],
  );
  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => [
        horizontalToPosition(i * 10, 0, HORIZON_RADIUS_M * 0.98),
        horizontalToPosition(i * 10, i % 9 === 0 ? 1.2 : 0.5, HORIZON_RADIUS_M * 0.98),
      ]),
    [],
  );
  const compass = [
    { label: messages.compass.north, az: 0 },
    { label: messages.compass.east, az: 90 },
    { label: messages.compass.south, az: 180 },
    { label: messages.compass.west, az: 270 },
  ];
  const sun = bodies.placed.find((body) => body.body === 'sun');
  const sunUp = sun !== undefined && upperLimbAboveHorizon(sun);

  return (
    <>
      {/* Parallel sunlight; its target is the world origin, so only the direction matters. */}
      {/* Faint illustrative fill so the figure stays readable against the light. */}
      <ambientLight intensity={surfaceReenactment ? 0.45 : 0.15} />
      {surfaceReenactment && <directionalLight position={[-0.32, 0.46, 0.84]} intensity={0.5} />}
      {sun && (
        <directionalLight
          position={sun.direction.map((component) => component * 80) as Vector3Tuple}
          intensity={sunUp ? 3.2 : 0}
          castShadow={surfaceReenactment && sunUp}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={24}
          shadow-camera-bottom={-24}
          shadow-camera-far={175}
          shadow-normalBias={0.04}
        />
      )}
    <group position={eye}>
      {/*
        Below the assumed horizon beyond the crop (no relief data there). Depth
        only: the stars, drawn first without depth, stay visible, and no dark
        band covers the sky where a steep rim lets the view reach past the crop.
      */}
      <mesh geometry={floor} renderOrder={-5}>
        <meshBasicMaterial colorWrite={false} side={DoubleSide} />
      </mesh>
      {/* Geometric horizon (elevation 0): drawn over the relief as a reference line, behind the astronaut. */}
      {showHorizon && (
        <>
          <Line
            points={ring}
            color="#39ff88"
            lineWidth={1.2}
            transparent
            opacity={0.7}
            depthTest={false}
            renderOrder={HORIZON_RENDER_ORDER}
          />
          {ticks.map((points, i) => (
            <Line
              key={i}
              points={points}
              color="#39ff88"
              lineWidth={1}
              transparent
              opacity={0.5}
              depthTest={false}
              renderOrder={HORIZON_RENDER_ORDER}
            />
          ))}
          {compass.map(({ label, az }) => (
            <Html
              key={label}
              position={horizontalToPosition(az, 1.6, HORIZON_RADIUS_M * 0.98)}
              center
              occlude={[occluder as RefObject<Object3D>]}
              className="scene__compass"
            >
              {label}
            </Html>
          ))}
        </>
      )}

      {bodies.placed.map((body) => (
        <FarBody key={body.body} body={body} label={messages.bodies[body.body]} />
      ))}
    </group>
    </>
  );
}

/**
 * Sun or Earth at `BODY_DISTANCE_M`, with its real apparent diameter. A
 * low-poly sphere drawn twice with the same geometry: normally, where it is in
 * front of everything else, and as a translucent ghost only where something is
 * in front of it (`GreaterDepth`: relief, astronaut or the assumed-horizon
 * floor). The ghost writes no depth and only adds one cheap pass.
 */
function FarBody({ body, label }: { body: SceneBody; label: string }) {
  const position = horizontalToPosition(body.azimuthDeg, body.elevationDeg, BODY_DISTANCE_M);
  const radius = radiusForAngularDiameter(body.angularDiameterDeg, BODY_DISTANCE_M);
  const isSun = body.body === 'sun';
  const geometry = useMemo(
    () => new SphereGeometry(radius, BODY_WIDTH_SEGMENTS, BODY_HEIGHT_SEGMENTS),
    [radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={position}>
      <mesh geometry={geometry}>
        {isSun ? (
          <meshBasicMaterial color="#fff6d8" toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#3d7fd6" emissive="#081a33" emissiveIntensity={0.6} roughness={0.85} />
        )}
      </mesh>
      {/* Hidden part: drawn only where the relief, the figure or the floor is in front. */}
      <mesh geometry={geometry} renderOrder={GHOST_RENDER_ORDER}>
        <meshBasicMaterial
          color={isSun ? '#ffd970' : '#5a9cf0'}
          transparent
          opacity={GHOST_OPACITY}
          depthWrite={false}
          depthFunc={GreaterDepth}
          toneMapped={false}
        />
      </mesh>
      {isSun && (
        <sprite scale={[0.09, 0.09, 1]}>
          <spriteMaterial map={glowTexture()} color="#ffd970" sizeAttenuation={false} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      <Html center className="scene__label" style={{ transform: 'translateY(-1.8rem)' }}>
        {label}
      </Html>
    </group>
  );
}

/**
 * Pin the loading portal to the canvas parent. The default Html target changes
 * when R3F connects its events during startup; recreating its nested DOM root
 * at that point can race with Suspense cleanup.
 */
function TerrainLoading() {
  const { messages } = useI18n();
  const parent = useThree((state) => state.gl.domElement.parentElement);
  const portal = useMemo(() => (parent ? { current: parent } : undefined), [parent]);
  if (!portal) return null;
  return (
    <Html portal={portal} center className="scene__label">
      {messages.scene.terrainLoading}
    </Html>
  );
}

/** Contents of the shared canvas for the first-person view (see `SkyScene`). */
export function FirstPersonView({
  data,
  bodies,
  controls,
}: {
  data: EphemerisResponse;
  bodies: PlacedBodies;
  controls: FirstPersonControls;
}) {
  const { messages } = useI18n();
  const apollo = data.site.id === APOLLO_11_SITE_ID;
  const model = polarTerrainForSite(data.site.id);
  return (
    <>
      {/* Position and orientation are set by `EyeLevelRig` once the terrain is loaded. */}
      {apollo ? <ApolloCamera /> : <PerspectiveCamera makeDefault fov={DEFAULT_FOV_DEG} near={0.05} far={400_000} />}
      <Suspense fallback={<TerrainLoading />}>
        {apollo ? <ApolloTerrain bodies={bodies} controls={controls} phase={apolloScenePhase(data.requestedUtc)} /> : model ? (
          <Terrain key={model.siteId} data={data} bodies={bodies} controls={controls} model={model} />
        ) : (
          <Html center className="scene__label">
            {messages.scene.terrainMissing}
          </Html>
        )}
      </Suspense>
    </>
  );
}

function ApolloCamera() {
  const size = useThree((state) => state.size);
  const { fov, minAspect, eye, pitch, heading } = APOLLO_11_REENACTMENT;
  // Keep the actors in frame when the viewport is narrower than the Blender camera.
  const zoom = Math.min(1, size.width / Math.max(1, size.height) / minAspect);
  // Start in the authored pose even before the terrain and the drag rig load.
  return <PerspectiveCamera makeDefault position={eye} rotation={[pitch * Math.PI / 180, -heading * Math.PI / 180, 0, 'YXZ']}
    fov={fov} zoom={Math.max(0.15, zoom)} near={0.05} far={400_000} />;
}
