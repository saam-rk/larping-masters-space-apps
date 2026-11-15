/** Colors of the Sun and the Earth in the 3D views, their angle guides and the angle legend. */

import type { BodyId } from '../../../shared/ephemeris';

export const BODY_COLOR: Readonly<Record<BodyId, string>> = {
  sun: '#ffc233',
  earth: '#3ee8ff',
};
