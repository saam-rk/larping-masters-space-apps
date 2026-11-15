/**
 * Sun, Earth and Moon GLB models of the third-person views (see
 * `assets/celestial-bodies/README.md` for sources, credits and limits).
 *
 * Each model is centered at the origin with reference radius 1, so it is
 * scaled to the radius the view draws. Its orientation comes from
 * `celestialOrientation.ts`. The textures are appearance maps for a globe
 * view: the Moon's coarse relief and color are not a terrain measurement, and
 * neither the Earth's rotation nor the Sun's is modeled.
 *
 * While a model loads, `fallback` (the plain sphere the view drew before) is
 * kept underneath the shared hyperspace transition until every model is ready.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo, type ReactNode } from 'react';
import { Color, Mesh, MeshStandardMaterial, type Object3D, type Quaternion } from 'three';
import type { Vector3Tuple } from './geometry';
import { SceneLoading } from '../transition/SceneLoading';

const CELESTIAL_MODEL_URL = {
  sun: '/models/celestial/sun.glb',
  earth: '/models/celestial/earth.glb',
  moon: '/models/celestial/moon.glb',
} as const;

export type CelestialBodyModel = keyof typeof CELESTIAL_MODEL_URL;

/**
 * Faint blue self-glow of the Earth, the same tint the former plain sphere
 * had: the Blue Marble oceans are nearly black, so without it an Earth showing
 * mostly ocean or night side is hard to find. Decorative, not an atmosphere.
 */
const EARTH_GLOW = { color: '#0d2a52', intensity: 0.6 } as const;

/**
 * Clone of the cached model with view-specific materials (the cache stays
 * untouched): the Sun is drawn at full brightness, outside tone mapping, like
 * the former sphere; the Earth keeps the former faint blue glow.
 */
function prepare(source: Object3D, body: CelestialBodyModel): Object3D {
  const model = source.clone();
  model.traverse((object) => {
    if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
    const material = object.material.clone();
    if (body === 'sun') {
      material.toneMapped = false;
    } else if (body === 'earth') {
      material.emissive = new Color(EARTH_GLOW.color);
      material.emissiveIntensity = EARTH_GLOW.intensity;
    }
    object.material = material;
  });
  return model;
}

function LoadedModel({ body, radius, quaternion }: { body: CelestialBodyModel; radius: number; quaternion: Quaternion }) {
  const gltf = useGLTF(CELESTIAL_MODEL_URL[body], false, false);
  const model = useMemo(() => prepare(gltf.scene, body), [gltf.scene, body]);
  return (
    <group quaternion={quaternion} scale={radius}>
      <primitive object={model} />
    </group>
  );
}

export function CelestialModel({
  body,
  radius,
  quaternion,
  position,
  fallback,
}: {
  body: CelestialBodyModel;
  /** Drawn radius, in the view's units. */
  radius: number;
  quaternion: Quaternion;
  position?: Vector3Tuple;
  /** Shown while the model loads. */
  fallback: ReactNode;
}) {
  return (
    <group position={position}>
      <Suspense fallback={<><SceneLoading />{fallback}</>}>
        <LoadedModel body={body} radius={radius} quaternion={quaternion} />
      </Suspense>
    </group>
  );
}
