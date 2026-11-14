/**
 * First-person local horizon at Nobile Rim 2: LOLA terrain (see
 * `terrain/nobileRim2.ts`), the 1.70 m astronaut scale figure, and the Sun
 * and Earth placed from the same azimuth/elevation as the results panel.
 *
 * Units are meters. Scene frame as in `geometry.ts` (-Z north, +X east,
 * +Y up); the world origin is the site point on the terrain surface.
 *
 * The viewer stands still at eye height right beside the astronaut (about
 * 2.6 m away), facing it with the Sun just to the right; a soft contact shadow
 * (decorative, not Sun-based) marks where the figure stands; dragging only turns the head and
 * the wheel or the zoom slider narrows the field of view (see `EyeLevelRig`). Sun and Earth are drawn far
 * beyond the 10 km crop with their real apparent angular diameter. Below the
 * geometric horizon a dark floor hides the sky, so the area beyond the crop
 * (no relief data) is not shown as open sky.
 */

import { Html, Line, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, type RefObject } from 'react';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { useI18n } from '../../i18n/context';
import { blobShadowTexture } from './blobShadow';
import { radiusForAngularDiameter, upperLimbAboveHorizon, type PlacedBodies, type SceneBody } from './bodies';
import { EYE_HEIGHT_M, EyeLevelRig } from './EyeLevelRig';
import { horizontalToDirection, horizontalToPosition, type Vector3Tuple } from './geometry';
import { glowTexture } from './glow';
import {
  ASTRONAUT_GLB_POSITION,
  ASTRONAUT_HEIGHT_M,
  ASTRONAUT_URL,
  NOBILE_RIM_2_TERRAIN_URL,
  TERRAIN_YAW_RAD,
  projectSouthPolar,
  projectedToGlb,
} from './terrain/nobileRim2';
import { DEFAULT_FOV_DEG } from './zoom';

/** Distance at which the Sun and Earth are drawn (m): beyond every terrain point of the crop. */
const BODY_DISTANCE_M = 80_000;
/** Radius of the geometric horizon line and floor (m), between the crop and the bodies. */
const HORIZON_RADIUS_M = 60_000;
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
/** Draw order of the horizon line and ticks: after the terrain, which they are drawn over. */
const HORIZON_RENDER_ORDER = 10;
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
 * Materials are cloned so the cached GLB stays untouched.
 */
function astronautInFront(source: Object3D): Object3D {
  const astronaut = source.clone();
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
 * cheap downward ray casts instead of testing all ~99k triangles.
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

function useTerrainFrame(terrain: Mesh | null, latitudeDeg: number, longitudeEastDeg: number): TerrainFrame | null {
  return useMemo(() => {
    if (!terrain) return null;
    const probe = buildProbe(terrain, ASTRONAUT_GLB_POSITION);
    const raycaster = new Raycaster();
    const localGround = (x: number, z: number): number | null => {
      raycaster.set(new Vector3(x, 10_000, z), DOWN);
      return raycaster.intersectObject(probe, false)[0]?.point.y ?? null;
    };

    const projected = projectSouthPolar(latitudeDeg, longitudeEastDeg);
    const [sx, , sz] = projectedToGlb(projected.x, projected.y, 0);
    const sy = localGround(sx, sz);
    if (sy === null) return null;

    const toWorld = new Matrix4().makeRotationY(TERRAIN_YAW_RAD).multiply(new Matrix4().makeTranslation(-sx, -sy, -sz));
    const toLocal = toWorld.clone().invert();

    const [ax, ayStored, az] = ASTRONAUT_GLB_POSITION;
    const astronaut = new Vector3(ax, localGround(ax, az) ?? ayStored, az).applyMatrix4(toWorld);

    const groundAt = (x: number, z: number): number | null => {
      const local = new Vector3(x, 0, z).applyMatrix4(toLocal);
      const y = localGround(local.x, local.z);
      return y === null ? null : new Vector3(local.x, y, local.z).applyMatrix4(toWorld).y;
    };
    return { toWorld, groundAt, astronaut };
  }, [terrain, latitudeDeg, longitudeEastDeg]);
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
}

function Terrain({ data, bodies, controls }: { data: EphemerisResponse; bodies: PlacedBodies; controls: FirstPersonControls }) {
  const { messages, locale } = useI18n();
  const terrainGltf = useGLTF(NOBILE_RIM_2_TERRAIN_URL, false, false);
  const astronautGltf = useGLTF(ASTRONAUT_URL, false, false);
  const terrainScene = useMemo(() => terrainGltf.scene.clone(), [terrainGltf.scene]);
  const astronautScene = useMemo(() => astronautInFront(astronautGltf.scene), [astronautGltf.scene]);
  const astronautRef = useRef<Group>(null);
  const terrainMesh = useMemo(() => firstMesh(terrainScene), [terrainScene]);
  const frame = useTerrainFrame(terrainMesh, data.site.latitudeDeg, data.site.longitudeEastDeg);

  const bearing = initialBearing(bodies.placed);
  if (!frame) {
    return (
      <Html center className="scene__label">
        {messages.scene.terrainMissing}
      </Html>
    );
  }

  // The viewer stands still on the terrain, VIEWER_DISTANCE_M from the figure along `bearing`.
  const [dx, , dz] = horizontalToDirection(bearing, 0);
  const standX = frame.astronaut.x + dx * VIEWER_DISTANCE_M;
  const standZ = frame.astronaut.z + dz * VIEWER_DISTANCE_M;
  const eye: Vector3Tuple = [standX, (frame.groundAt(standX, standZ) ?? frame.astronaut.y) + EYE_HEIGHT_M, standZ];
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
      <Sky eye={eye} bodies={bodies} showHorizon={controls.showHorizon} occluder={astronautRef} />
    </>
  );
}

/**
 * Horizon line, horizon floor, compass labels, Sun, Earth and the sunlight,
 * centered on the eye. `showHorizon` hides the line, ticks and labels; the
 * floor stays, since it marks where there is no relief data. The line passes
 * behind the astronaut (see `astronautInFront`) and the compass labels hide
 * while `occluder` covers them.
 */
function Sky({
  eye,
  bodies,
  showHorizon,
  occluder,
}: {
  eye: Vector3Tuple;
  bodies: PlacedBodies;
  showHorizon: boolean;
  occluder: RefObject<Object3D | null>;
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
      <ambientLight intensity={0.15} />
      {sun && (
        <directionalLight
          position={[sun.direction[0] * 1e5, sun.direction[1] * 1e5, sun.direction[2] * 1e5]}
          intensity={sunUp ? 3.2 : 0}
        />
      )}
    <group position={eye}>
      {/* Below the geometric horizon: no sky, and no relief data beyond the crop. */}
      <mesh renderOrder={-5}>
        <sphereGeometry args={[HORIZON_RADIUS_M, 64, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color="#020604" side={BackSide} />
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

function FarBody({ body, label }: { body: SceneBody; label: string }) {
  const position = horizontalToPosition(body.azimuthDeg, body.elevationDeg, BODY_DISTANCE_M);
  const radius = radiusForAngularDiameter(body.angularDiameterDeg, BODY_DISTANCE_M);
  const isSun = body.body === 'sun';
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 48, 24]} />
        {isSun ? (
          <meshBasicMaterial color="#fff6d8" toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#3d7fd6" emissive="#081a33" emissiveIntensity={0.6} roughness={0.85} />
        )}
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
  return (
    <>
      {/* Position and orientation are set by `EyeLevelRig` once the terrain is loaded. */}
      <PerspectiveCamera makeDefault fov={DEFAULT_FOV_DEG} near={0.05} far={400_000} />
      <Suspense
        fallback={
          <Html center className="scene__label">
            {messages.scene.terrainLoading}
          </Html>
        }
      >
        <Terrain data={data} bodies={bodies} controls={controls} />
      </Suspense>
    </>
  );
}
