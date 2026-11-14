/**
 * Decorative 3D star background shared by both views (see `stars.ts`).
 *
 * The sphere is centered on the camera every frame, so the stars behave as if
 * infinitely far: rotating or orbiting the camera moves them across the view,
 * but they never come closer. They are drawn first without depth, so every
 * other object (terrain, the Moon, the horizon floor) covers them.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { createStars } from './stars';

const LAYERS = [
  { count: 2400, size: 1.1, seed: 20261114 },
  { count: 380, size: 2.1, seed: 20261115 },
] as const;

export function StarSphere() {
  const group = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const dpr = useThree((state) => state.viewport.dpr);
  const layers = useMemo(() => LAYERS.map((layer) => ({ ...layer, ...createStars(layer.count, layer.seed) })), []);
  // Any radius between the near and far planes works because depth is ignored.
  const radius = Math.sqrt(camera.near * camera.far);

  // Negative priority: runs before labels and the render of the same frame.
  useFrame(() => {
    group.current?.position.copy(camera.position);
  }, -1);

  return (
    <group ref={group} scale={radius}>
      {layers.map(({ seed, size, positions, colors }) => (
        <points key={seed} renderOrder={-10} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={size * dpr}
            sizeAttenuation={false}
            vertexColors
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      ))}
    </group>
  );
}
