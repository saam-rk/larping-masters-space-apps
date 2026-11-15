/** Exact sphere embedding of the published projected/radial meshes (not a frame conversion).
 * Product ME/DE421 and Horizons ME realizations still have unquantified residuals.
 */
import { Matrix4, Mesh, Object3D, Raycaster, Vector3, DoubleSide, MeshBasicMaterial } from 'three';
import type { ObserverSite } from '../../../../shared/sites';
import { SPHERE_RADIUS_M, type SiteTerrain } from './siteTerrain';

const RAD = Math.PI / 180;

export function surfacePoint(model: SiteTerrain, site: Pick<ObserverSite, 'latitudeDeg' | 'longitudeEastDeg'>, point: Vector3, originHeightM = 0): Vector3 {
  const latitude = site.latitudeDeg * RAD;
  const longitude = site.longitudeEastDeg * RAD;
  let lat: number;
  let lon: number;
  if (model.siteId === 'apollo-11') {
    // LROC equirectangular projection: standard parallel 1°, central meridian 180°.
    lat = (model.origin.projectedYM - point.z) / SPHERE_RADIUS_M;
    lon = Math.PI + (model.origin.projectedXM + point.x) / (SPHERE_RADIUS_M * Math.cos(RAD));
  } else {
    const x = point.x + model.origin.projectedXM;
    const y = -point.z + model.origin.projectedYM;
    lat = 2 * Math.atan(Math.hypot(x, y) / (2 * SPHERE_RADIUS_M)) - Math.PI / 2;
    lon = Math.atan2(x, y);
  }
  const radius = SPHERE_RADIUS_M + model.origin.elevationM + point.y;
  const delta = lon - longitude;
  return new Vector3(
    radius * Math.cos(lat) * Math.sin(delta),
    radius * (Math.sin(lat) * Math.sin(latitude) + Math.cos(lat) * Math.cos(latitude) * Math.cos(delta)) - (SPHERE_RADIUS_M + originHeightM),
    -radius * (Math.sin(lat) * Math.cos(latitude) - Math.cos(lat) * Math.sin(latitude) * Math.cos(delta)),
  );
}

/** Copy and bake each terrain mesh exactly once; cached source GLBs remain untouched. */
export function curvedTerrain(source: Object3D, model: SiteTerrain, site: Pick<ObserverSite, 'latitudeDeg' | 'longitudeEastDeg'>, originHeightM: number): Object3D {
  if (source.userData.lunarCurvatureApplied) throw new Error('Terrain curvature was already applied');
  const clone = source.clone(true);
  clone.userData.lunarCurvatureApplied = true;
  source.updateMatrixWorld(true);
  clone.updateMatrixWorld(true);
  const point = new Vector3();
  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry.clone();
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      const curved = surfacePoint(model, site, point, originHeightM);
      positions.setXYZ(i, curved.x, curved.y, curved.z);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    object.geometry = geometry;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  clone.traverse((object) => {
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    object.scale.set(1, 1, 1);
    object.matrix.copy(new Matrix4());
  });
  clone.updateMatrixWorld(true);
  return clone;
}

/** Double-sided triangle interpolation along local radial up; null means no coverage. */
export function terrainGround(root: Object3D, x = 0, z = 0): number | null {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const ray = new Raycaster(new Vector3(x, 100_000, z), new Vector3(0, -1, 0));
  let height: number | null = null;
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const original = object.material;
    object.material = material;
    const hit = ray.intersectObject(object, false)[0];
    object.material = original;
    if (hit && (height === null || hit.point.y > height)) height = hit.point.y;
  });
  material.dispose();
  return height;
}

export function disposeTerrain(root: Object3D) {
  root.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
}
