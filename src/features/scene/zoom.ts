/**
 * Zoom of the local horizon views as one level from 0 (widest / farthest) to
 * 1 (narrowest / closest), so a single slider drives both views. The level is
 * logarithmic in the underlying quantity, so each slider step changes the
 * image by about the same factor.
 *
 * - First person: vertical field of view of the standing camera (binoculars,
 *   the viewer does not move).
 * - Third person: camera distance to the site (orbit target).
 *
 * Kept free of three.js imports so it can be tested and used by DOM controls.
 */

import type { ViewMode } from './viewMode';

/** First-person vertical field of view limits and start, degrees (narrow = magnified). */
export const MIN_FOV_DEG = 12;
export const MAX_FOV_DEG = 75;
export const DEFAULT_FOV_DEG = 60;

/** Third-person camera distance limits to the site, km. */
export const MIN_CAMERA_DISTANCE_KM = 150;
/** Far enough to see the Sun (about 1.5e8 km) and the whole compass around it. */
export const MAX_CAMERA_DISTANCE_KM = 6e8;
/** Starting camera distance to the site, km. */
export const START_CAMERA_DISTANCE_KM = 9500;

/** Level change of one press of the zoom buttons. */
export const ZOOM_BUTTON_STEP = 0.1;

export function clampLevel(level: number): number {
  return Math.min(1, Math.max(0, level));
}

/** Level (0..1) for a value between `wide` (level 0) and `narrow` (level 1), on a log scale. */
function levelFor(value: number, wide: number, narrow: number): number {
  return clampLevel(Math.log(wide / value) / Math.log(wide / narrow));
}

function valueFor(level: number, wide: number, narrow: number): number {
  return wide * (narrow / wide) ** clampLevel(level);
}

export const fovForLevel = (level: number) => valueFor(level, MAX_FOV_DEG, MIN_FOV_DEG);
export const levelForFov = (fovDeg: number) => levelFor(fovDeg, MAX_FOV_DEG, MIN_FOV_DEG);
export const distanceForLevel = (level: number) => valueFor(level, MAX_CAMERA_DISTANCE_KM, MIN_CAMERA_DISTANCE_KM);
export const levelForDistance = (distanceKm: number) => levelFor(distanceKm, MAX_CAMERA_DISTANCE_KM, MIN_CAMERA_DISTANCE_KM);

/** Level each view starts at. */
export const START_ZOOM: Readonly<Record<ViewMode, number>> = {
  'first-person': levelForFov(DEFAULT_FOV_DEG),
  'third-person': levelForDistance(START_CAMERA_DISTANCE_KM),
};

/** Two levels closer than this are the same zoom (avoids feedback loops between the slider and the camera). */
export const ZOOM_EPSILON = 1e-3;

/**
 * Third-person visual scale (see `sceneScale.ts`): camera distance limits and
 * start to the site in scene units, where the sky dome has radius
 * `VISUAL_DOME_RADIUS`.
 */
export const VISUAL_DOME_RADIUS = 10;
export const MIN_VISUAL_DISTANCE = 6;
export const MAX_VISUAL_DISTANCE = 90;
export const START_VISUAL_DISTANCE = 30;

export const visualDistanceForLevel = (level: number) => valueFor(level, MAX_VISUAL_DISTANCE, MIN_VISUAL_DISTANCE);
export const levelForVisualDistance = (distance: number) => levelFor(distance, MAX_VISUAL_DISTANCE, MIN_VISUAL_DISTANCE);
export const START_VISUAL_ZOOM = levelForVisualDistance(START_VISUAL_DISTANCE);
