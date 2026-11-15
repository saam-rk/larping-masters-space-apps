import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOV_DEG,
  MAX_CAMERA_DISTANCE_KM,
  MAX_FOV_DEG,
  MAX_VISUAL_DISTANCE,
  MIN_CAMERA_DISTANCE_KM,
  MIN_VISUAL_DISTANCE,
  MIN_FOV_DEG,
  START_CAMERA_DISTANCE_KM,
  START_VISUAL_DISTANCE,
  START_VISUAL_ZOOM,
  START_ZOOM,
  clampLevel,
  distanceForLevel,
  fovForLevel,
  levelForDistance,
  levelForFov,
  visualDistanceForLevel,
} from './zoom';

describe('zoom levels', () => {
  it('maps the ends of the slider to the view limits', () => {
    expect(fovForLevel(0)).toBeCloseTo(MAX_FOV_DEG, 10);
    expect(fovForLevel(1)).toBeCloseTo(MIN_FOV_DEG, 10);
    expect(distanceForLevel(0)).toBeCloseTo(MAX_CAMERA_DISTANCE_KM, 2);
    expect(distanceForLevel(1)).toBeCloseTo(MIN_CAMERA_DISTANCE_KM, 6);
  });

  it('round-trips between level and field of view or distance', () => {
    for (const level of [0, 0.13, 0.5, 0.87, 1]) {
      expect(levelForFov(fovForLevel(level))).toBeCloseTo(level, 10);
      expect(levelForDistance(distanceForLevel(level))).toBeCloseTo(level, 10);
    }
  });

  it('is logarithmic: the middle level is the geometric mean of the limits', () => {
    expect(fovForLevel(0.5)).toBeCloseTo(Math.sqrt(MIN_FOV_DEG * MAX_FOV_DEG), 10);
    expect(distanceForLevel(0.5)).toBeCloseTo(Math.sqrt(MIN_CAMERA_DISTANCE_KM * MAX_CAMERA_DISTANCE_KM), 4);
  });

  it('clamps out-of-range levels and values', () => {
    expect(clampLevel(-0.2)).toBe(0);
    expect(clampLevel(1.4)).toBe(1);
    expect(fovForLevel(2)).toBeCloseTo(MIN_FOV_DEG, 10);
    expect(levelForFov(120)).toBe(0);
    expect(levelForDistance(1)).toBe(1);
  });

  it('starts each view at its default camera', () => {
    expect(fovForLevel(START_ZOOM['first-person'])).toBeCloseTo(DEFAULT_FOV_DEG, 10);
    expect(distanceForLevel(START_ZOOM['third-person'])).toBeCloseTo(START_CAMERA_DISTANCE_KM, 6);
  });
});

describe('visual-scale zoom levels', () => {
  it('maps the slider ends and the start to the visual distances', () => {
    expect(visualDistanceForLevel(0)).toBeCloseTo(MAX_VISUAL_DISTANCE, 9);
    expect(visualDistanceForLevel(1)).toBeCloseTo(MIN_VISUAL_DISTANCE, 9);
    expect(visualDistanceForLevel(START_VISUAL_ZOOM)).toBeCloseTo(START_VISUAL_DISTANCE, 9);
  });
});
