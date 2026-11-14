/** Place any valid MOON_ME/DE421 coordinate on an exported terrain mesh.
 * Pass the terrain Mesh returned by GLTFLoader (not the scene Group).
 * Source height and simplified surface height are different measurements.
 */
import { Raycaster, Vector3 } from 'three';

export function projectCoordinate(latitudeDeg, longitudeEastDeg, metadata) {
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeEastDeg)
      || latitudeDeg < -90 || latitudeDeg > 90
      || longitudeEastDeg < -180 || longitudeEastDeg > 180) return null;
  const rad = Math.PI / 180;
  const rho = 2 * metadata.crs.sphereRadiusM * Math.tan(Math.PI / 4 + latitudeDeg * rad / 2);
  const x = rho * Math.sin(longitudeEastDeg * rad);
  const y = rho * Math.cos(longitudeEastDeg * rad);
  const e = metadata.coverage.meshExtentProjectedM;
  // Nanometer tolerance absorbs inverse/forward projection roundoff at edges.
  if (x < e.xMin - 1e-7 || x > e.xMax + 1e-7 || y < e.yMin - 1e-7 || y > e.yMax + 1e-7) return null;
  return { x: Math.max(e.xMin, Math.min(e.xMax, x)), y: Math.max(e.yMin, Math.min(e.yMax, y)) };
}

export function placeTerrainMarker(terrain, latitudeDeg, longitudeEastDeg, metadata, offsetM = 0) {
  if (!terrain?.isMesh || !Number.isFinite(offsetM)) return null;
  const p = projectCoordinate(latitudeDeg, longitudeEastDeg, metadata);
  if (!p) return null;
  const o = metadata.localOrigin;
  terrain.geometry.computeBoundingBox();
  terrain.updateWorldMatrix(true, false);
  const top = new Vector3(p.x - o.projectedXM, terrain.geometry.boundingBox.max.y + 10, -(p.y - o.projectedYM));
  terrain.localToWorld(top);
  const down = new Vector3(0, -1, 0).transformDirection(terrain.matrixWorld);
  const hit = new Raycaster(top, down).intersectObject(terrain, false)[0];
  if (!hit) return null;
  const local = terrain.worldToLocal(hit.point.clone());
  const surfaceElevationM = local.y + o.elevationM;
  local.y += offsetM;
  return { local, world: terrain.localToWorld(local.clone()), surfaceElevationM };
}
