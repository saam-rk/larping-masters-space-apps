import { Box3, Matrix4, Raycaster, Vector3 } from 'three';

/**
 * Project planetocentric degrees in the metadata's MOON_ME/DE421 frame.
 * This is a map projection, NOT an ME/PA frame conversion or geographic ENU.
 */
export function projectCoordinate(latitudeDeg, longitudeEastDeg, radiusM) {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg >= 90
      || !Number.isFinite(longitudeEastDeg) || longitudeEastDeg < -180 || longitudeEastDeg > 360
      || !Number.isFinite(radiusM) || radiusM <= 0) return null;
  const latitude = latitudeDeg * Math.PI / 180;
  const longitude = longitudeEastDeg * Math.PI / 180;
  const rho = 2 * radiusM * Math.tan(Math.PI / 4 + latitude / 2);
  return [rho * Math.sin(longitude), rho * Math.cos(longitude)];
}

/**
 * Create a sampler for the loaded, unrotated/unscaled terrain GLTF scene.
 * Call for a saved site OR arbitrary coordinates: no site-ID lookup is involved.
 * Returns null outside coverage / inside holes; never substitutes a zero height.
 * If the viewer needs to transform the terrain, sample first in asset space and
 * transform both terrain and marker together afterwards.
 */
export function createTerrainSampler(terrain, metadata) {
  if (metadata.units !== 'meters' || metadata.vertical.scale !== 1
      || metadata.crs.projection !== 'south polar stereographic') {
    throw new Error('Unsupported terrain coordinate contract');
  }
  terrain.updateMatrixWorld(true);
  const identity = new Matrix4();
  terrain.traverse((object) => {
    if (object.isMesh && !object.matrixWorld.equals(identity)) {
      throw new Error('Sample the untransformed terrain asset before viewer placement');
    }
  });
  const bounds = new Box3().setFromObject(terrain);
  if (bounds.isEmpty()) throw new Error('Terrain has no mesh bounds');
  const raycaster = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const [minX, minY, maxX, maxY] = metadata.coverage.meshPixelCenterBoundsM;
  const origin = metadata.origin;

  return (latitudeDeg, longitudeEastDeg, heightAboveMeshM = 0) => {
    if (!Number.isFinite(heightAboveMeshM) || heightAboveMeshM < 0) return null;
    const projected = projectCoordinate(latitudeDeg, longitudeEastDeg, metadata.crs.referenceRadiusM);
    if (!projected) return null;
    const [x, y] = projected;
    if (x < minX || x > maxX || y < minY || y > maxY) return null;
    raycaster.set(new Vector3(x - origin.projectedXM, bounds.max.y + 1, -(y - origin.projectedYM)), down);
    raycaster.far = bounds.max.y - bounds.min.y + 2;
    const hit = raycaster.intersectObject(terrain, true)[0];
    if (!hit) return null;
    const position = hit.point.clone();
    const radialElevationM = position.y + origin.radialElevationM;
    position.y += heightAboveMeshM;
    return { position, projectedM: projected, radialElevationM, heightAboveMeshM };
  };
}
