/**
 * Third-person view at visual scale (see `sceneScale.ts`): a schematic local
 * sky around the site, not to scale, so the angles read at a glance.
 *
 * The Sun and the Earth sit along the same azimuth as the results panel, on
 * a sky dome (`VISUAL_DOME_RADIUS`) and as enlarged spheres; distances and
 * sizes carry no meaning here. The Sun sits on a slightly larger radius than
 * the Earth (`BODY_DOME_RADIUS`), so when they line up (a solar eclipse seen
 * from the Moon) the Earth is drawn in front of the Sun instead of both
 * spheres merging; their labels then go above and below. Elevation is drawn with
 * a vertical exaggeration (`elevationExaggeration`, ×1 to ×10, shown in the
 * note and the legend) so the few degrees of a polar sky can be read; the
 * labels always give the true values. The Sun and the Earth are the GLB
 * models of `CelestialModel` (rotation not modeled). The Moon is not drawn;
 * the green disc is the local horizon plane (elevation 0) tangent at the site.
 *
 * The compass switch draws the plane, grid, ticks, elevation circles and
 * N/E/S/W. With the guides on, each body gets a dashed line from the
 * observer, an azimuth arc on the plane from north to its direction, a
 * vertical elevation arc from the plane to the body, and both labeled in
 * degrees; between the Sun and the Earth, a dashed great-circle arc with their
 * angular separation and an arc on the plane with the azimuth difference (see
 * `angles.ts`). `FollowCamera` keeps a body centered during playback.
 *
 * Scene frame as in `geometry.ts` (-Z north, +X east, +Y up at the site).
 */

import { Html, Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo } from 'react';
import type { Quaternion } from 'three';
import { BODY_IDS, type BodyId } from '../../../shared/ephemeris';
import { formatAngle } from '../../format';
import { useI18n } from '../../i18n/context';
import {
  angularSeparationDeg,
  azimuthArc,
  azimuthDifferenceDeg,
  elevationArc,
  exaggerateElevation,
  meanAzimuthDeg,
  midpoint,
  normalizeAzimuth,
  separationArc,
} from './angles';
import type { PlacedBodies, SceneBody } from './bodies';
import { BODY_COLOR } from './bodyColors';
import { CelestialModel } from './CelestialModel';
import { CourseLine } from './CourseLine';
import { northAlongLunarAxis } from './celestialOrientation';
import { horizontalToPosition, type Vector3Tuple } from './geometry';
import { glowTexture } from './glow';
import { BODY_DOME_RADIUS, BODY_RADIUS, LABELS_APART_DEG } from './visualBodies';
import { OrbitZoom } from './OrbitZoom';
import { FollowCamera } from './FollowCamera';
import type { ThirdPersonControls } from './ThirdPersonView';
import {
  MAX_VISUAL_DISTANCE,
  MIN_VISUAL_DISTANCE,
  START_VISUAL_DISTANCE,
  VISUAL_DOME_RADIUS as R,
  levelForVisualDistance,
  visualDistanceForLevel,
} from './zoom';

/** Radius of each body's azimuth arc on the plane, as a fraction of the dome radius (apart so they do not overlap). */
const AZIMUTH_ARC: Readonly<Record<BodyId, number>> = { sun: 0.42, earth: 0.62 };
/** Radius of the Sun–Earth azimuth difference arc, fraction of the dome radius. */
const DIFFERENCE_ARC = 0.24;
/** Candidate faint elevation circles on the dome (true degrees); up to three that land between 10° and 80° drawn. */
const ELEVATION_RINGS = [1, 2, 5, 10, 20, 30, 45, 60] as const;
const DIFFERENCE_COLOR = '#f4f1e8';

/** Camera above and behind the site, facing the bodies. */
function initialCamera(placed: readonly SceneBody[]): Vector3Tuple {
  const facing = meanAzimuthDeg(placed.map((body) => body.azimuthDeg));
  return horizontalToPosition(facing + 180, 24, START_VISUAL_DISTANCE);
}

/** Screen offset of a label from its anchor: centered on it, or just to its right. */
const LABEL_OFFSET = { center: undefined, right: 'translateX(calc(50% + 0.5rem))' } as const;

function Label({
  position,
  color,
  offset = 'center',
  children,
}: {
  position: Vector3Tuple;
  color?: string;
  offset?: keyof typeof LABEL_OFFSET;
  children: string;
}) {
  return (
    <Html
      position={position}
      center
      className="scene__label scene__label--small scene__label--guide"
      style={{ color, transform: LABEL_OFFSET[offset] }}
    >
      {children}
    </Html>
  );
}

function Horizon({ exaggeration }: { exaggeration: number }) {
  const { messages } = useI18n();
  const ring = useMemo(() => Array.from({ length: 129 }, (_, i) => horizontalToPosition((i * 360) / 128, 0, R)), []);
  // Ticks every 10° of azimuth, longer every 30°.
  const ticks = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => i * 10).flatMap((az) => [
        horizontalToPosition(az, 0, R),
        horizontalToPosition(az, 0, R * (az % 30 === 0 ? 1.06 : 1.03)),
      ]),
    [],
  );
  const rings = useMemo(
    () =>
      ELEVATION_RINGS.map((el) => ({ el, drawn: exaggerateElevation(el, exaggeration) }))
        .filter(({ drawn }) => drawn >= 10 && drawn <= 80)
        .slice(0, 3)
        .map(({ el, drawn }) => ({
          el,
          drawn,
          points: Array.from({ length: 97 }, (_, i) => horizontalToPosition((i * 360) / 96, drawn, R)),
        })),
    [exaggeration],
  );
  const compass = [
    { label: messages.compass.north, az: 0 },
    { label: messages.compass.east, az: 90 },
    { label: messages.compass.south, az: 180 },
    { label: messages.compass.west, az: 270 },
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[R, 96]} />
        <meshBasicMaterial color="#0a3a1c" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <gridHelper args={[2 * R, 20, '#1f7a43', '#123d22']} />
      <Line points={ring} color="#39ff88" lineWidth={1.5} />
      <Line points={ticks} segments color="#39ff88" lineWidth={1.2} />
      {rings.map(({ el, drawn, points }) => (
        <group key={el}>
          <Line points={points} color="#39ff88" lineWidth={1} transparent opacity={0.22} />
          <Label position={horizontalToPosition(0, drawn, R)} color="#5fae7d">{`${el}°`}</Label>
        </group>
      ))}
      {compass.map(({ label, az }) => (
        <Html key={label} position={horizontalToPosition(az, 0, R * 1.15)} center className="scene__compass">
          {label}
        </Html>
      ))}
    </group>
  );
}

function VisualBody({
  body,
  drawnElevation,
  label,
  orientation,
  labelBelow = false,
  showGuide,
}: {
  body: SceneBody;
  /** Dashed straight line from the observer to the body. */
  showGuide: boolean;
  drawnElevation: number;
  label: string;
  orientation: Quaternion;
  /** Put the name under the sphere (the other body is in the same direction). */
  labelBelow?: boolean;
}) {
  const position = horizontalToPosition(body.azimuthDeg, drawnElevation, BODY_DOME_RADIUS[body.body]);
  const radius = BODY_RADIUS[body.body];
  const color = BODY_COLOR[body.body];
  return (
    <group>
      {showGuide && (
        <Line points={[[0, 0, 0], position]} color={color} lineWidth={1.2} dashed dashSize={0.3} gapSize={0.18} transparent opacity={0.7} />
      )}
      <group position={position}>
        <CelestialModel
          body={body.body}
          radius={radius}
          quaternion={orientation}
          fallback={
            <mesh>
              <sphereGeometry args={[radius, 48, 24]} />
              {body.body === 'sun' ? (
                <meshBasicMaterial color="#fff6d8" toneMapped={false} />
              ) : (
                <meshStandardMaterial color="#3d7fd6" emissive="#0d2a52" emissiveIntensity={0.7} roughness={0.85} />
              )}
            </mesh>
          }
        />
        <sprite scale={[radius * 4, radius * 4, 1]}>
          <spriteMaterial map={glowTexture()} color={color} transparent depthWrite={false} toneMapped={false} />
        </sprite>
        <Html center className="scene__label" style={{ transform: `translateY(${labelBelow ? '1.8rem' : '-1.8rem'})`, color }}>
          {label}
        </Html>
      </group>
    </group>
  );
}

/** Azimuth arc from north and elevation arc from the plane, with their values. */
function BodyGuides({ body, drawnElevation }: { body: SceneBody; drawnElevation: number }) {
  const { messages, locale } = useI18n();
  const { guides } = messages.scene;
  const color = BODY_COLOR[body.body];
  const azimuth = normalizeAzimuth(body.azimuthDeg);
  const arcRadius = AZIMUTH_ARC[body.body] * R;
  const azArc = useMemo(() => azimuthArc(0, azimuth, arcRadius), [azimuth, arcRadius]);
  const domeRadius = BODY_DOME_RADIUS[body.body];
  const elArc = useMemo(() => elevationArc(azimuth, drawnElevation, domeRadius), [azimuth, drawnElevation, domeRadius]);
  const foot = horizontalToPosition(azimuth, 0, domeRadius);
  const azLabel = horizontalToPosition(azimuth / 2, 0, arcRadius + 0.08 * R);
  // Right of the middle of the arc, so it does not sit on the body or its name.
  const elLabel = midpoint(elArc);
  return (
    <group>
      <Line points={[[0, 0, 0], foot]} color={color} lineWidth={1.5} transparent opacity={0.8} />
      <Line points={azArc} color={color} lineWidth={2.5} />
      <Line points={elArc} color={color} lineWidth={3} />
      <mesh position={foot}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Label position={[azLabel[0], 0.25, azLabel[2]]} color={color}>
        {guides.azimuth(formatAngle(azimuth, locale))}
      </Label>
      <Label position={elLabel} color={color} offset="right">
        {guides.elevation(formatAngle(body.elevationDeg, locale))}
      </Label>
    </group>
  );
}

/** Sun–Earth angular separation (dome arc) and azimuth difference (plane arc). */
function DifferenceGuides({ from, to, exaggeration }: { from: SceneBody; to: SceneBody; exaggeration: number }) {
  const { messages, locale } = useI18n();
  const { guides } = messages.scene;
  const separation = angularSeparationDeg(from, to);
  const deltaAz = azimuthDifferenceDeg(from.azimuthDeg, to.azimuthDeg);
  // Drawn between the exaggerated directions; the label gives the true separation.
  // Its radius goes from one body's dome radius to the other's, so it ends on both.
  const dome = useMemo(() => {
    const arc = separationArc(
      { azimuthDeg: from.azimuthDeg, elevationDeg: exaggerateElevation(from.elevationDeg, exaggeration) },
      { azimuthDeg: to.azimuthDeg, elevationDeg: exaggerateElevation(to.elevationDeg, exaggeration) },
      R,
    );
    const [start, end] = [BODY_DOME_RADIUS[from.body], BODY_DOME_RADIUS[to.body]];
    return arc.map(([x, y, z], i): Vector3Tuple => {
      const k = (start + ((end - start) * i) / Math.max(1, arc.length - 1)) / R;
      return [x * k, y * k, z * k];
    });
  }, [from, to, exaggeration]);
  const plane = useMemo(() => azimuthArc(from.azimuthDeg, deltaAz, DIFFERENCE_ARC * R), [from.azimuthDeg, deltaAz]);
  const domeMid = midpoint(dome);
  // Inside the arc, away from the azimuth labels of the bodies outside it.
  const planeMid = horizontalToPosition(from.azimuthDeg + deltaAz / 2, 0, DIFFERENCE_ARC * R - 0.09 * R);
  return (
    <group>
      <Line points={dome} color={DIFFERENCE_COLOR} lineWidth={2} dashed dashSize={0.35} gapSize={0.2} />
      <Line points={plane} color={DIFFERENCE_COLOR} lineWidth={2} />
      <Label position={[domeMid[0] * 1.06, domeMid[1] * 1.06 + 0.9, domeMid[2] * 1.06]} color={DIFFERENCE_COLOR}>
        {guides.separation(formatAngle(separation, locale))}
      </Label>
      <Label position={[planeMid[0], 0.25, planeMid[2]]} color={DIFFERENCE_COLOR}>
        {guides.azimuthDifference(formatAngle(deltaAz, locale, true))}
      </Label>
    </group>
  );
}

export function VisualScaleView({
  bodies,
  latitudeDeg,
  controls,
}: {
  bodies: PlacedBodies;
  /** Site latitude, for the illustrative orientation of the body models. */
  latitudeDeg: number;
  controls: ThirdPersonControls;
}) {
  const { messages } = useI18n();
  const orientation = useMemo(() => northAlongLunarAxis(latitudeDeg), [latitudeDeg]);
  const cameraPosition = useMemo(() => initialCamera(controls.anchor.placed), [controls.anchor.placed]);
  const sun = bodies.placed.find((body) => body.body === 'sun');
  const earth = bodies.placed.find((body) => body.body === 'earth');
  const exaggeration = controls.exaggeration;
  const drawn = (body: SceneBody) => exaggerateElevation(body.elevationDeg, exaggeration);
  // Lined up on screen (e.g. a solar eclipse): the Earth, in front, takes its label below.
  const aligned =
    sun !== undefined &&
    earth !== undefined &&
    angularSeparationDeg(
      { azimuthDeg: sun.azimuthDeg, elevationDeg: drawn(sun) },
      { azimuthDeg: earth.azimuthDeg, elevationDeg: drawn(earth) },
    ) < LABELS_APART_DEG;

  return (
    <>
      <PerspectiveCamera makeDefault fov={40} near={0.05} far={5000} position={cameraPosition} />
      <ambientLight intensity={0.45} />
      {sun && <directionalLight position={[sun.direction[0] * 100, sun.direction[1] * 100, sun.direction[2] * 100]} intensity={2.5} />}

      {/* Observer marker at the site. */}
      <mesh position={[0, 0.35, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.2, 0.7, 16]} />
        <meshStandardMaterial color="#d8f5d0" emissive="#39ff88" emissiveIntensity={0.5} />
      </mesh>

      {controls.showHorizon && <Horizon exaggeration={exaggeration} />}
      {bodies.placed.map((body) => (
        <VisualBody
          key={body.body}
          body={body}
          drawnElevation={drawn(body)}
          label={messages.bodies[body.body]}
          orientation={orientation}
          labelBelow={aligned && body.body === 'earth'}
          showGuide={controls.showGuides}
        />
      ))}
      {controls.showGuides && bodies.placed.map((body) => <BodyGuides key={body.body} body={body} drawnElevation={drawn(body)} />)}
      {controls.showGuides && sun && earth && <DifferenceGuides from={sun} to={earth} exaggeration={exaggeration} />}

      <OrbitControls makeDefault enablePan={false} minDistance={MIN_VISUAL_DISTANCE} maxDistance={MAX_VISUAL_DISTANCE} zoomSpeed={1.2} />
      <OrbitZoom
        zoom={controls.zoom}
        onZoomChange={controls.onZoomChange}
        distanceForLevel={visualDistanceForLevel}
        levelForDistance={levelForVisualDistance}
      />
      <FollowCamera body={controls.follow} />
      {controls.courses && BODY_IDS.map((body) => (
        <CourseLine key={body} body={body} dot={0.12} gap={0.22}
          points={controls.courses![body].map((sample) =>
            horizontalToPosition(sample.azimuthDeg, exaggerateElevation(sample.elevationDeg, exaggeration), BODY_DOME_RADIUS[body]))} />
      ))}
    </>
  );
}
