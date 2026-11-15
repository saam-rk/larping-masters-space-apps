/**
 * Dotted line through a body's positions over a horizon playback sequence
 * (its course, see `bodyCourses`), drawn by each view with the "Guide"
 * switch. Consecutive samples are joined by straight segments: positions
 * between samples are not calculated, so the line only shows the order of
 * the sampled directions.
 */

import { Line } from '@react-three/drei';
import { BODY_COLOR } from './bodyColors';
import type { BodyId } from '../../../shared/ephemeris';
import type { Vector3Tuple } from './geometry';

export function CourseLine({
  body,
  points,
  dot,
  gap,
  overTerrain = false,
  renderOrder,
}: {
  body: BodyId;
  points: readonly Vector3Tuple[];
  /** Dot and gap lengths along the line, in scene units. */
  dot: number;
  gap: number;
  /** Ignore depth, like the first-person horizon line, so the course shows over the relief. */
  overTerrain?: boolean;
  renderOrder?: number;
}) {
  if (points.length < 2) return null;
  return (
    <Line
      points={points as Vector3Tuple[]}
      color={BODY_COLOR[body]}
      lineWidth={2}
      dashed
      dashSize={dot}
      gapSize={gap}
      transparent
      opacity={0.75}
      depthTest={!overTerrain}
      depthWrite={false}
      renderOrder={renderOrder}
    />
  );
}
