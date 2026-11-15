/** Guard the scientific observer contract, separately from CSV number parsing.
 * Tolerances accommodate the observed printed header precision, not physical error.
 */
import type { ObserverQuery } from './query.js';

export function observerHeaderError(payload: unknown, query: ObserverQuery): string | null {
  const text = (payload as { result?: unknown } | null)?.result;
  if (typeof text !== 'string') return 'Missing observer metadata';
  const header = text.split('$$SOE')[0] ?? '';
  const target = query.body === 'sun' ? '10' : '399';
  if (!new RegExp(`^Target body name:.*\\(${target}\\)`, 'm').test(header)) return 'Unexpected Horizons target';
  if (!/^Center body name:.*\(301\)/m.test(header)) return 'Unexpected Horizons center';
  if (!/^Atmos refraction:\s*NO \(AIRLESS\)/m.test(header)) return 'Unexpected refraction convention';
  if (!/Date__\(UT\)/.test(header)) return 'Unexpected time scale';
  const radii = /^Center radii\s*:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+) km/m.exec(header);
  if (!radii || radii.slice(1).some(value => Math.abs(Number(value) - 1737.4) > 1e-6)) return 'Unexpected lunar reference shape';
  const values = /^Center geodetic\s*:\s*([^{\r\n]+)/m.exec(header)?.[1]?.split(',').map(Number);
  if (!values || values.length !== 3 || !values.every(Number.isFinite)) return 'Missing observer coordinates';
  const [lon, lat, altitude] = values as [number, number, number];
  const longitudeError = Math.abs((((lon - query.longitudeEastDeg) % 360) + 540) % 360 - 180);
  if (longitudeError > 1e-5 || Math.abs(lat - query.latitudeDeg) > 1e-5 || Math.abs(altitude - query.altitudeKm) > 1e-5) {
    return 'Returned observer does not match requested coordinates or altitude';
  }
  if (!/Units:\s*AU and KM\/S/.test(text)) return 'Unexpected range units';
  return null;
}
