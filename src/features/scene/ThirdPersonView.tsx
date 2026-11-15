/**
 * Third-person view. With the visual scale (default) it shows the schematic
 * sky of `VisualScaleView`; with the real scale, everything to scale in
 * kilometers: the Moon as a sphere under the
 * observer, the local horizon plane tangent at the site, and the Sun and
 * Earth at their Horizons range along the same azimuth/elevation as the
 * results panel, with radii from the Horizons angular diameter.
 *
 * Scene frame as in `geometry.ts` (-Z north, +X east, +Y up at the site);
 * the observer is the origin and the Moon center is at (0, -R, 0). The
 * observer marker, the glow sprites and the horizon plane size are not to
 * scale. Moon, Earth and Sun are the GLB models of `CelestialModel`: the Moon
 * is turned so the site lies under the observer, with its coarse globe relief
 * (an appearance model, not the terrain of the site; the observer stays on the
 * reference sphere); the Earth's and the Sun's rotation are not modeled.
 *
 * The horizon compass (plane, grid, ring and N/E/S/W) and the body guides
 * (each body's dashed line from the observer and its azimuth and elevation
 * guides) are switched separately ("Compass" and "Guide"). The compass and
 * the angle guides grow with the camera distance, so they stay a readable
 * reference plane from close to the site out to beyond the Sun.
 *
 * `FollowCamera` keeps a body centered during playback: the camera turns
 * around the site to the opposite azimuth, keeping its distance and height
 * angle, so the body stands straight beyond the site.
 *
 * The camera distance is shared with the zoom slider as a level (see
 * `zoom.ts` and `OrbitZoom`).
 */

import { Html, Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Camera, type Group, type Quaternion } from 'three';
import { BODY_IDS, type EphemerisResponse } from '../../../shared/ephemeris';
import { useI18n } from '../../i18n/context';
import { BODY_COLOR } from './bodyColors';
import { MOON_RADIUS_KM, radiusForAngularDiameter, type BodyCourses, type PlacedBodies, type SceneBody } from './bodies';
import { CourseLine } from './CourseLine';
import { CelestialModel } from './CelestialModel';
import { FollowCamera } from './FollowCamera';
import { useFittedFov } from './fitFov';
import { moonOrientation, northAlongLunarAxis } from './celestialOrientation';
import { horizontalToDirection, horizontalToPosition, type Vector3Tuple } from './geometry';
import { glowTexture } from './glow';
import { OrbitZoom } from './OrbitZoom';
import type { SceneScale } from './sceneScale';
import { VisualScaleView } from './VisualScaleView';
import {
  MAX_CAMERA_DISTANCE_KM,
  MIN_CAMERA_DISTANCE_KM,
  START_CAMERA_DISTANCE_KM,
  distanceForLevel,
  levelForDistance,
} from './zoom';

/** Smallest radius of the drawn horizon plane, km (a reference size, not a physical horizon). */
const HORIZON_RADIUS_KM = 900;
/** Plane radius as a fraction of the camera distance once that exceeds the smallest radius. */
const HORIZON_RADIUS_PER_DISTANCE = 0.3;
const MOON_CENTER: Vector3Tuple = [0, -MOON_RADIUS_KM, 0];
const MIN_CAMERA_ALTITUDE_KM = 20;

const BODY_STYLE = {
  sun: { color: BODY_COLOR.sun, glow: 0.07 },
  earth: { color: BODY_COLOR.earth, glow: 0.035 },
} as const;

/** Camera above and behind the site, looking toward the Earth (or the Sun) so it shows past the horizon. */
function initialCamera(placed: readonly SceneBody[]): Vector3Tuple {
  const focus = placed.find((body) => body.body === 'earth') ?? placed[0];
  return horizontalToPosition((focus?.azimuthDeg ?? 0) + 180, 12, START_CAMERA_DISTANCE_KM);
}

/** Pushes the camera out of the Moon when an orbit would take it inside. */
function keepAboveSurface(camera: Camera) {
  const center = new Vector3(...MOON_CENTER);
  const offset = camera.position.clone().sub(center);
  const minimum = MOON_RADIUS_KM + MIN_CAMERA_ALTITUDE_KM;
  if (offset.length() < minimum) camera.position.copy(center.add(offset.setLength(minimum)));
}

function Body({ body, label, orientation, showGuide }: { body: SceneBody; label: string; orientation: Quaternion; showGuide: boolean }) {
  const position = horizontalToPosition(body.azimuthDeg, body.elevationDeg, body.rangeKm);
  const radius = radiusForAngularDiameter(body.angularDiameterDeg, body.rangeKm);
  const style = BODY_STYLE[body.body];
  const isSun = body.body === 'sun';
  return (
    <group>
      {showGuide && (
        <Line
          points={[[0, 0, 0], position]}
          color={style.color}
          lineWidth={1.2}
          dashed
          dashSize={body.rangeKm / 160}
          gapSize={body.rangeKm / 320}
          transparent
          opacity={0.75}
        />
      )}
      <group position={position}>
        <CelestialModel
          body={body.body}
          radius={radius}
          quaternion={orientation}
          fallback={
            <mesh>
              <sphereGeometry args={[radius, 64, 32]} />
              {isSun ? (
                <meshBasicMaterial color="#fff6d8" toneMapped={false} />
              ) : (
                <meshStandardMaterial color="#3d7fd6" emissive="#081a33" emissiveIntensity={0.5} roughness={0.85} />
              )}
            </mesh>
          }
        />
        <sprite scale={[style.glow, style.glow, 1]}>
          <spriteMaterial map={glowTexture()} color={style.color} sizeAttenuation={false} transparent depthWrite={false} toneMapped={false} />
        </sprite>
        <Html center className="scene__label" style={{ transform: 'translateY(-1.6rem)' }}>
          {label}
        </Html>
      </group>
    </group>
  );
}

/** Elevation arc radius and azimuth guide length, as fractions of the compass radius. */
const ARC_RADIUS = 0.55;
const AZIMUTH_GUIDE = 1;

/**
 * Local horizon (elevation 0) tangent at the observer, drawn in units of the
 * smallest compass radius and scaled every frame with the camera distance.
 * Each body gets a line on the plane along its azimuth and an arc from the
 * plane up (or down) to its elevation, so both angles read against the plane.
 */
function HorizonCompass({ bodies, showCompass, showGuides }: { bodies: readonly SceneBody[]; showCompass: boolean; showGuides: boolean }) {
  const { messages } = useI18n();
  const group = useRef<Group>(null);

  const ring = useMemo(() => Array.from({ length: 129 }, (_, i) => horizontalToPosition((i * 360) / 128, 0, 1)), []);
  const guides = useMemo(
    () =>
      bodies.map((body) => {
        const steps = Math.max(2, Math.ceil(Math.abs(body.elevationDeg) / 2));
        return {
          body: body.body,
          azimuth: [[0, 0, 0], horizontalToPosition(body.azimuthDeg, 0, AZIMUTH_GUIDE)] as Vector3Tuple[],
          arc: Array.from({ length: steps + 1 }, (_, i) =>
            horizontalToPosition(body.azimuthDeg, (body.elevationDeg * i) / steps, ARC_RADIUS),
          ),
        };
      }),
    [bodies],
  );
  const compass = [
    { label: messages.compass.north, az: 0 },
    { label: messages.compass.east, az: 90 },
    { label: messages.compass.south, az: 180 },
    { label: messages.compass.west, az: 270 },
  ];

  // Negative priority: before the labels and the render of the same frame.
  useFrame(({ camera }) => {
    const radius = Math.max(HORIZON_RADIUS_KM, camera.position.length() * HORIZON_RADIUS_PER_DISTANCE);
    group.current?.scale.setScalar(radius);
  }, -1);

  return (
    <group ref={group} scale={HORIZON_RADIUS_KM}>
      {showCompass && (
        <>
          {/* Lifted slightly (in compass units) so the plane does not fight with the Moon surface. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0006, 0]}>
            <circleGeometry args={[1, 96]} />
            <meshBasicMaterial color="#0a3a1c" transparent opacity={0.45} depthWrite={false} />
          </mesh>
          <gridHelper args={[2, 18, '#39ff88', '#14532d']} position={[0, 0.0011, 0]} />
          <Line points={ring} color="#39ff88" lineWidth={1.5} />
        </>
      )}
      {showGuides && guides.map(({ body, azimuth, arc }) => (
        <group key={body}>
          <Line points={azimuth} color={BODY_STYLE[body].color} lineWidth={1.5} transparent opacity={0.85} />
          <Line points={arc} color={BODY_STYLE[body].color} lineWidth={1.5} transparent opacity={0.85} />
        </group>
      ))}
      {showCompass && compass.map(({ label, az }) => (
        <Html key={label} position={horizontalToPosition(az, 0, 1.12)} center className="scene__compass">
          {label}
        </Html>
      ))}
    </group>
  );
}

/** Settings of the third-person view shared with the DOM controls (see `SkyScene`). */
export interface ThirdPersonControls {
  /** Zoom level (0..1, see `zoom.ts`). */
  readonly zoom: number;
  readonly onZoomChange: (level: number) => void;
  /** Draw the horizon compass (plane, grid, ring and N/E/S/W). */
  readonly showHorizon: boolean;
  /** Draw the body guides (dashed line from the observer, azimuth and elevation guides). */
  readonly showGuides: boolean;
  /** Visual (schematic, default) or real scale (see `sceneScale.ts`). */
  readonly scale: SceneScale;
  /** Bodies the starting camera is placed from (held during playback, see `SkyScene`). */
  readonly anchor: PlacedBodies;
  /** Body kept centered by the camera, or null. */
  readonly follow: SceneBody | null;
  /** Each body's playback course to draw as a dotted line, or null. */
  readonly courses: BodyCourses | null;
  /** Vertical exaggeration of the visual scale (see `elevationExaggeration`). */
  readonly exaggeration: number;
}


/** Contents of the shared canvas for the third-person view (see `SkyScene`). */
export function ThirdPersonView(props: { data: EphemerisResponse; bodies: PlacedBodies; controls: ThirdPersonControls }) {
  return props.controls.scale === 'visual' ? <VisualScaleView bodies={props.bodies} latitudeDeg={props.data.site.latitudeDeg} controls={props.controls} /> : <RealScaleView {...props} />;
}

/** Third-person view to scale, in kilometers. */
function RealScaleView({
  data,
  bodies,
  controls,
}: {
  data: EphemerisResponse;
  bodies: PlacedBodies;
  controls: ThirdPersonControls;
}) {
  const { messages } = useI18n();
  const cameraPosition = useMemo(() => initialCamera(controls.anchor.placed), [controls.anchor.placed]);
  const fov = useFittedFov(40);
  const sun = bodies.placed.find((body) => body.body === 'sun');
  const { latitudeDeg, longitudeEastDeg } = data.site;
  const moonQuaternion = useMemo(() => moonOrientation(latitudeDeg, longitudeEastDeg), [latitudeDeg, longitudeEastDeg]);
  const bodyQuaternion = useMemo(() => northAlongLunarAxis(latitudeDeg), [latitudeDeg]);

  // Lunar spin axis: geographic north lies at azimuth 0 and elevation = latitude.
  const north = horizontalToDirection(0, data.site.latitudeDeg);
  const axis: [Vector3Tuple, Vector3Tuple] = [
    [MOON_CENTER[0] - north[0] * MOON_RADIUS_KM * 1.3, MOON_CENTER[1] - north[1] * MOON_RADIUS_KM * 1.3, MOON_CENTER[2] - north[2] * MOON_RADIUS_KM * 1.3],
    [MOON_CENTER[0] + north[0] * MOON_RADIUS_KM * 1.3, MOON_CENTER[1] + north[1] * MOON_RADIUS_KM * 1.3, MOON_CENTER[2] + north[2] * MOON_RADIUS_KM * 1.3],
  ];

  return (
    <>
      {/* Reset to the starting view whenever a new result arrives. */}
      <PerspectiveCamera makeDefault fov={fov} near={1} far={2e9} position={cameraPosition} />
      {/* Faint illustrative fill so the night side of the spheres stays visible. */}
      <ambientLight intensity={0.14} />
      {sun && <directionalLight position={[sun.direction[0] * 1e6, sun.direction[1] * 1e6, sun.direction[2] * 1e6]} intensity={3} />}

      {/* Moon model scaled to the mean lunar radius; a smooth sphere while it loads. */}
      <CelestialModel
        body="moon"
        radius={MOON_RADIUS_KM}
        quaternion={moonQuaternion}
        position={MOON_CENTER}
        fallback={
          <mesh>
            <sphereGeometry args={[MOON_RADIUS_KM, 128, 64]} />
            <meshStandardMaterial color="#8f9289" roughness={0.95} />
          </mesh>
        }
      />
      <Line points={axis} color="#6f7d70" lineWidth={1} transparent opacity={0.6} />
      <Html position={MOON_CENTER} center className="scene__label scene__label--muted">
        {messages.scene.moon}
      </Html>

      {/* Observer marker (not to scale). */}
      <mesh position={[0, 30, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[18, 60, 16]} />
        <meshStandardMaterial color="#d8f5d0" emissive="#39ff88" emissiveIntensity={0.4} />
      </mesh>

      {bodies.placed.map((body) => (
        <Body key={body.body} body={body} label={messages.bodies[body.body]} orientation={bodyQuaternion} showGuide={controls.showGuides} />
      ))}

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={MIN_CAMERA_DISTANCE_KM}
        maxDistance={MAX_CAMERA_DISTANCE_KM}
        zoomSpeed={1.4}
        onChange={(event) => {
          if (event) keepAboveSurface(event.target.object);
        }}
      />
      <OrbitZoom
        zoom={controls.zoom}
        onZoomChange={controls.onZoomChange}
        distanceForLevel={distanceForLevel}
        levelForDistance={levelForDistance}
        constrain={keepAboveSurface}
      />
      {/* After the controls, so it sizes the compass from this frame's camera. */}
      {(controls.showHorizon || controls.showGuides) && (
        <HorizonCompass bodies={bodies.placed} showCompass={controls.showHorizon} showGuides={controls.showGuides} />
      )}
      <FollowCamera body={controls.follow} constrain={keepAboveSurface} />
      {controls.courses && BODY_IDS.map((body) => {
        const course = controls.courses![body];
        const range = course[0]?.rangeKm ?? 1;
        return (
          <CourseLine key={body} body={body} dot={range / 300} gap={range / 160}
            points={course.map((sample) => horizontalToPosition(sample.azimuthDeg, sample.elevationDeg, sample.rangeKm))} />
        );
      })}
    </>
  );
}
