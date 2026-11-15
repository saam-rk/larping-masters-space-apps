import terrainObservers from './terrain-observers.json' with { type: 'json' };
import type { ObserverSite } from './sites.js';

export const OBSERVER_EYE_HEIGHT_M = 1.7;
export const LUNAR_REFERENCE_RADIUS_M = 1_737_400;

/** Exact coordinates only: never silently attach the nearest site's terrain. */
export function terrainObserver(site: Pick<ObserverSite, 'latitudeDeg' | 'longitudeEastDeg'>) {
  return Object.values(terrainObservers).find((entry) => entry.latitudeDeg === site.latitudeDeg
    && ((entry.longitudeEastDeg - site.longitudeEastDeg) % 360 + 360) % 360 === 0) ?? null;
}

/** No terrain: retain the explicitly labeled reference-sphere observer, not a ground estimate. */
export function observerAltitudeKm(site: Pick<ObserverSite, 'latitudeDeg' | 'longitudeEastDeg'>): number {
  const terrain = terrainObserver(site);
  return terrain ? (terrain.groundElevationM + OBSERVER_EYE_HEIGHT_M) / 1000 : 0;
}
