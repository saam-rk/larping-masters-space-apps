import { describe, expect, it } from 'vitest';
import { diskAboveHorizon, eclipseTransmission, solarLightingState, shadowCoverage, surfaceSnapshotReady } from './solarExposure';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { observerAltitudeKm } from '../../../shared/observer';
import { horizontalToDirection } from './geometry';
import type { SceneBody } from './bodies';
import { Box3, Vector3 } from 'three';

function body(body: 'sun' | 'earth', azimuthDeg: number, elevationDeg: number, radius: number, rangeKm: number): SceneBody {
  return { body, azimuthDeg, elevationDeg, direction: horizontalToDirection(azimuthDeg, elevationDeg), angularDiameterDeg: radius * 2, rangeKm, nominalSize: false, nominalRange: false };
}
const sun = body('sun', 267.967732, 69.325285, 0.267290278, 149_000_000);
const earth = body('earth', 267.073154, 69.258076, 0.913913056, 400_000);

describe('direct solar exposure, not illustrative brightness', () => {
  it('does not silently reinterpret a sphere sample or changed epoch/frame as surface lighting', () => {
    expect(surfaceSnapshotReady(SAVED_SAMPLE)).toBe(false);
    const current = { ...SAVED_SAMPLE, site: { ...SAVED_SAMPLE.site, altitudeKm: observerAltitudeKm(SAVED_SAMPLE.site) } };
    expect(surfaceSnapshotReady(current)).toBe(true);
    expect(surfaceSnapshotReady({ ...current, ephemerisUtc: '2026-11-15T00:00:00Z' })).toBe(false);
    expect(surfaceSnapshotReady({ ...current, source: { ...current.source, observerFrame: 'UNKNOWN' } })).toBe(false);
    expect(surfaceSnapshotReady({ ...current, source: { ...current.source, planetaryEphemeris: 'DE999' } })).toBe(false);
  });
  it('does not give full light to the Faustini first-contact sliver', () => {
    expect(diskAboveHorizon(-0.259932, 0.269127083)).toBeCloseTo(0.003771, 6);
  });
  it('is continuous at contacts and exposes below-zero disks over a depressed horizon', () => {
    expect(diskAboveHorizon(-1, 0.25)).toBe(0);
    expect(diskAboveHorizon(0, 0.25)).toBe(0.5);
    expect(diskAboveHorizon(1, 0.25)).toBe(1);
    expect(diskAboveHorizon(-0.3, 0.25, -0.6)).toBe(1);
    expect(diskAboveHorizon(-0.25 + 1e-8, 0.25)).toBeLessThan(1e-9);
  });
  it('suppresses Apollo direct sunlight during the audited total Earth eclipse', () => {
    expect(eclipseTransmission(sun, earth)).toBe(0);
    expect(solarLightingState([sun, earth]).intensity).toBe(0);
  });
  it('handles disjoint, partial, concentric and behind-Sun disks', () => {
    expect(eclipseTransmission(body('sun', 0, 0, 1, 100), body('earth', 2, 0, 1, 1))).toBeCloseTo(1);
    expect(eclipseTransmission(body('sun', 0, 0, 1, 100), body('earth', 1, 0, 1, 1))).toBeCloseTo(0.608997781, 8);
    expect(eclipseTransmission(body('sun', 0, 0, 1, 100), body('earth', 0, 0, 0.5, 1))).toBeCloseTo(0.75);
    expect(eclipseTransmission(sun, { ...earth, rangeKm: sun.rangeKm * 2 })).toBe(1);
  });
  it('never labels absent or nominal inputs as known illumination', () => {
    expect(solarLightingState([sun]).known).toBe(false);
    expect(solarLightingState([{ ...sun, nominalSize: true }, earth]).intensity).toBe(0);
    expect(solarLightingState([{ ...sun, elevationDeg: NaN }, earth]).known).toBe(false);
  });
  it('does not use the camera horizon to switch off every surface', () => {
    const below = body('sun', 80, -0.5, 0.27, 149_000_000);
    expect(solarLightingState([below, earth]).intensity).toBe(3.2);
  });
  it('fits a shadow volume to the entire crop even at low solar elevation', () => {
    const bounds = new Box3(new Vector3(-10000, -1000, -10000), new Vector3(10000, 1000, 10000));
    const coverage = shadowCoverage(bounds, new Vector3(...horizontalToDirection(30, 0.05)));
    for (const x of [-10000, 10000]) for (const y of [-1000, 1000]) for (const z of [-10000, 10000]) {
      const p = new Vector3(x, y, z).applyMatrix4(coverage.view);
      expect(Math.abs(p.x)).toBeLessThan(coverage.halfSize);
      expect(Math.abs(p.y)).toBeLessThan(coverage.halfSize);
      expect(-p.z).toBeGreaterThan(coverage.near);
      expect(-p.z).toBeLessThan(coverage.far);
    }
  });
});
