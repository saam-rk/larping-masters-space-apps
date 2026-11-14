/**
 * Simple 3D view of the local horizon with the Sun and Earth directions.
 * Placeholder visuals for the interface owner to refine; positions come only
 * from the azimuth/elevation in `data`, the same values as the results panel.
 * Disk sizes are not to scale. The canvas fills whatever height its box gets.
 */

import { Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { BODY_IDS, type BodyId, type EphemerisResponse } from '../../../shared/ephemeris';
import { useI18n } from '../../i18n/context';
import { horizontalToPosition, type Vector3Tuple } from './geometry';

const SKY_RADIUS = 10;

const BODY_STYLE: Readonly<Record<BodyId, { color: string; radius: number }>> = {
  sun: { color: '#ffc233', radius: 0.6 },
  earth: { color: '#3ee8ff', radius: 0.45 },
};

interface PlacedBody {
  readonly body: BodyId;
  readonly position: Vector3Tuple;
}

function placeBodies(data: EphemerisResponse): { placed: PlacedBody[]; missing: BodyId[] } {
  const placed: PlacedBody[] = [];
  const missing: BodyId[] = [];
  for (const body of BODY_IDS) {
    const result = data.bodies[body];
    const az = result.status === 'ok' ? result.observation.azimuthDeg : null;
    const el = result.status === 'ok' ? result.observation.elevationDeg : null;
    if (az === null || el === null) {
      missing.push(body);
    } else {
      placed.push({ body, position: horizontalToPosition(az, el, SKY_RADIUS) });
    }
  }
  return { placed, missing };
}

export default function SkyScene({ data }: { data: EphemerisResponse }) {
  const { messages } = useI18n();
  const { placed, missing } = placeBodies(data);

  const compass: Array<{ label: string; position: Vector3Tuple }> = [
    { label: messages.compass.north, position: horizontalToPosition(0, 0, SKY_RADIUS + 1) },
    { label: messages.compass.east, position: horizontalToPosition(90, 0, SKY_RADIUS + 1) },
    { label: messages.compass.south, position: horizontalToPosition(180, 0, SKY_RADIUS + 1) },
    { label: messages.compass.west, position: horizontalToPosition(270, 0, SKY_RADIUS + 1) },
  ];

  return (
    <div className="scene">
      {/* Renders on demand (controls invalidate on change) instead of every frame. */}
      <Canvas camera={{ position: [0, 9, 16], fov: 50 }} frameloop="demand" dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        {/* Horizontal reference plane (not terrain). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[SKY_RADIUS, 64]} />
          <meshStandardMaterial color="#061a0d" transparent opacity={0.8} />
        </mesh>
        <gridHelper args={[SKY_RADIUS * 2, 20, '#39ff88', '#14532d']} position={[0, 0.01, 0]} />

        {/* Observer. */}
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.25, 0.5, 16]} />
          <meshStandardMaterial color="#d8f5d0" emissive="#39ff88" emissiveIntensity={0.25} />
        </mesh>

        {compass.map(({ label, position }) => (
          <Html key={label} position={position} center className="scene__compass">
            {label}
          </Html>
        ))}

        {placed.map(({ body, position }) => (
          <group key={body}>
            <Line points={[[0, 0, 0], position]} color={BODY_STYLE[body].color} lineWidth={1.5} dashed dashSize={0.4} gapSize={0.2} />
            <mesh position={position}>
              <sphereGeometry args={[BODY_STYLE[body].radius, 32, 32]} />
              <meshStandardMaterial
                color={BODY_STYLE[body].color}
                emissive={BODY_STYLE[body].color}
                emissiveIntensity={body === 'sun' ? 0.9 : 0.3}
              />
            </mesh>
            <Html position={position} center className="scene__label" style={{ transform: 'translateY(-1.6rem)' }}>
              {messages.bodies[body]}
            </Html>
          </group>
        ))}

        <OrbitControls enablePan={false} minDistance={6} maxDistance={30} />
      </Canvas>

      {/* Overlaid on the canvas so the view keeps its full height. */}
      <div className="scene__notes">
        <p className="scene__note">{messages.scene.notToScale}</p>
        {missing.map((body) => (
          <p key={body} className="scene__note scene__note--warning">
            {messages.scene.missing(messages.bodies[body])}
          </p>
        ))}
      </div>
    </div>
  );
}
