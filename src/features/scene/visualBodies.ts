/**
 * Sizes and distances of the Sun and the Earth in the third-person view at
 * visual scale (`VisualScaleView`). Illustrative only: they carry no physical
 * meaning, only the directions do.
 */

import type { BodyId } from '../../../shared/ephemeris';
import { VISUAL_DOME_RADIUS as R } from './zoom';

/** Enlarged sphere radii, scene units: the Sun slightly larger than the Earth. */
export const BODY_RADIUS: Readonly<Record<BodyId, number>> = { sun: 0.6, earth: 0.45 };

/** Clearance between the two spheres when they share a direction, scene units. */
export const ALIGNED_GAP = 0.15;

/**
 * Distance of each body from the site: the Earth on the dome, the Sun just
 * behind it, far enough that the spheres never touch even in the same
 * direction (a solar eclipse seen from the Moon), so the Earth is drawn in
 * front of the Sun instead of the two merging.
 */
export const BODY_DOME_RADIUS: Readonly<Record<BodyId, number>> = {
  earth: R,
  sun: R + BODY_RADIUS.sun + BODY_RADIUS.earth + ALIGNED_GAP,
};

/** Below this drawn separation (deg) the two names would overlap: the Earth's goes under its sphere. */
export const LABELS_APART_DEG = 8;
