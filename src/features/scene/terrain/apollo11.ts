import { APOLLO_11_SITE_ID } from '../../../../shared/sites';
import metadata from '../../../../public/terrain/apollo-11.metadata.json';
import setup from '../../../../public/terrain/apollo-11.reenactment.json';
import type { Vector3Tuple } from '../geometry';
import type { SiteTerrain } from './siteTerrain';

// The equirectangular LROC export is already centered on the lunar module,
// with geographic north along -Z. It is not a south polar product.
export const APOLLO_11_TERRAIN: SiteTerrain = {
  siteId: APOLLO_11_SITE_ID,
  terrainUrl: '/terrain/apollo-11.glb',
  origin: {
    projectedXM: metadata.originProjectedM[0]!,
    projectedYM: metadata.originProjectedM[1]!,
    elevationM: metadata.originElevationM,
  },
  northGridBearingDeg: 0,
};

export const APOLLO_11_REENACTMENT = {
  url: '/terrain/apollo-11.reenactment.glb',
  eye: setup.eyeGlbM as Vector3Tuple,
  heading: setup.headingDeg,
  pitch: setup.pitchDeg,
  fov: setup.verticalFovDeg,
  minAspect: setup.minimumFramingAspect,
};
