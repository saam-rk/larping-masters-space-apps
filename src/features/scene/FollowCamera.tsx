/**
 * Third-person camera follow during playback (see `HorizonPlayback`).
 */

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { Camera } from 'three';
import type { SceneBody } from './bodies';
import { horizontalToPosition } from './geometry';

/**
 * Turns the orbit camera around the site so `body` lies straight beyond it:
 * the camera goes to the opposite azimuth, keeping its distance and the
 * angle of its height above the horizon plane. Needs the scene's default
 * orbit controls (`makeDefault`).
 */
export function FollowCamera({ body, constrain }: { body: SceneBody | null; constrain?: (camera: Camera) => void }) {
  const get = useThree((state) => state.get);
  const azimuth = body?.azimuthDeg ?? null;
  useEffect(() => {
    if (azimuth === null) return;
    const { camera, controls, invalidate } = get();
    const distance = camera.position.length();
    if (distance === 0) return;
    const heightDeg = (Math.asin(Math.max(-1, Math.min(1, camera.position.y / distance))) * 180) / Math.PI;
    camera.position.set(...horizontalToPosition(azimuth + 180, heightDeg, distance));
    constrain?.(camera);
    (controls as { update?: () => void } | null)?.update?.();
    invalidate();
  }, [azimuth, get, constrain]);
  return null;
}
