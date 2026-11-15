import { describe, expect, it } from 'vitest';
import { REFERENCE_SITES, findSite } from './sites.js';
import { observerAltitudeKm, terrainObserver } from './observer.js';

describe('surface versus reference-sphere observer', () => {
  it('has terrain heights for exactly ten entries, not arbitrary coordinates', () => {
    expect(REFERENCE_SITES.filter((site) => terrainObserver(site))).toHaveLength(10);
    for (const site of REFERENCE_SITES) {
      const terrain = terrainObserver(site);
      expect(Number.isFinite(observerAltitudeKm(site))).toBe(true);
      if (!terrain) expect(observerAltitudeKm(site)).toBe(0);
    }
  });
  it('resolves exact coordinates and longitude wrapping but never the nearest site', () => {
    const site = findSite('nobile-rim-1');
    expect(terrainObserver({ ...site, longitudeEastDeg: site.longitudeEastDeg + 360 })).toEqual(terrainObserver(site));
    expect(terrainObserver({ ...site, latitudeDeg: site.latitudeDeg + 0.00001 })).toBeNull();
  });
  it.each([[0, 0], [0, 180], [90, 0], [-90, 0], [-85.5, 40], [45, -120]])('keeps custom (%s,%s) on an explicitly non-terrain reference', (latitudeDeg, longitudeEastDeg) => {
    const site = { latitudeDeg, longitudeEastDeg };
    expect(terrainObserver(site)).toBeNull();
    expect(observerAltitudeKm(site)).toBe(0);
  });
});
