/**
 * Keeps the third-person camera distance and the zoom level in step (see
 * `zoom.ts`). The orbit target is the site (the origin, panning is off), so
 * the distance is the length of the camera position. Moves the camera when
 * the level changes and reports the distance after the wheel, a pinch or a
 * new result moves it.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Camera } from 'three';
import { ZOOM_EPSILON } from './zoom';

interface OrbitZoomProps {
  readonly zoom: number;
  readonly onZoomChange: (level: number) => void;
  /** Camera distance for a zoom level, in the units of the scene. */
  readonly distanceForLevel: (level: number) => number;
  readonly levelForDistance: (distance: number) => number;
  /** Optional correction after the camera moves (e.g. keep it out of the Moon). */
  readonly constrain?: (camera: Camera) => void;
}

export function OrbitZoom({ zoom, onZoomChange, distanceForLevel, levelForDistance, constrain }: OrbitZoomProps) {
  const get = useThree((state) => state.get);
  const reported = useRef<number | null>(null);

  // Runs only on rendered frames (on-demand loop): after each camera change.
  useFrame(({ camera }) => {
    const level = levelForDistance(camera.position.length());
    if (reported.current === null || Math.abs(level - reported.current) > ZOOM_EPSILON) {
      reported.current = level;
      onZoomChange(level);
    }
  });

  useEffect(() => {
    if (reported.current !== null && Math.abs(zoom - reported.current) <= ZOOM_EPSILON) return;
    const { camera, invalidate } = get();
    camera.position.setLength(distanceForLevel(zoom));
    constrain?.(camera);
    reported.current = levelForDistance(camera.position.length());
    invalidate();
  }, [zoom, get, distanceForLevel, levelForDistance, constrain]);

  return null;
}
