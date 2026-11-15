/**
 * Vertical field of view for the third-person cameras on narrow views.
 *
 * A perspective camera fixes the vertical angle, so a view narrower than it
 * is tall (a phone held upright) crops the scene at the sides: the horizon
 * ring and the bodies near it leave the frame. Below `FIT_ASPECT` the
 * vertical angle widens so the horizontal angle stays the one a view of that
 * aspect would show at the base angle. Only the framing changes; directions
 * and the zoom distance do not.
 */

import { useThree } from '@react-three/fiber';

/** Narrowest aspect (width / height) shown with the base field of view unchanged. */
export const FIT_ASPECT = 1.4;
/** Widest vertical angle used to fit a narrow view, degrees (limits perspective stretch). */
export const MAX_FIT_FOV_DEG = 70;

const HALF_DEG_TO_RAD = Math.PI / 360;

/** Vertical field of view (degrees) for a view of `aspect` (width / height), given the base angle. */
export function fittedFov(baseFovDeg: number, aspect: number): number {
  if (!(aspect > 0) || aspect >= FIT_ASPECT) return baseFovDeg;
  const half = Math.atan((Math.tan(baseFovDeg * HALF_DEG_TO_RAD) * FIT_ASPECT) / aspect);
  return Math.min(MAX_FIT_FOV_DEG, half / HALF_DEG_TO_RAD);
}

/** `fittedFov` for the size of the current canvas. */
export function useFittedFov(baseFovDeg: number): number {
  const aspect = useThree((state) => (state.size.height > 0 ? state.size.width / state.size.height : 0));
  return fittedFov(baseFovDeg, aspect);
}
