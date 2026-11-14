/**
 * Converts horizontal coordinates to scene directions.
 *
 * Scene axes: +Y is local zenith, -Z is local north, +X is local east.
 * Azimuth is clockwise from north (0=N, 90=E, 180=S, 270=W), as Horizons
 * reports it; elevation is above the horizontal reference plane.
 */

export type Vector3Tuple = [x: number, y: number, z: number];

const DEG_TO_RAD = Math.PI / 180;

/** Unit vector pointing toward the given azimuth and elevation. */
export function horizontalToDirection(azimuthDeg: number, elevationDeg: number): Vector3Tuple {
  const az = azimuthDeg * DEG_TO_RAD;
  const el = elevationDeg * DEG_TO_RAD;
  const horizontal = Math.cos(el);
  return [horizontal * Math.sin(az), Math.sin(el), -horizontal * Math.cos(az)];
}

/** Point at `distance` along the direction; convenient for placing markers. */
export function horizontalToPosition(azimuthDeg: number, elevationDeg: number, distance: number): Vector3Tuple {
  const [x, y, z] = horizontalToDirection(azimuthDeg, elevationDeg);
  return [x * distance, y * distance, z * distance];
}
