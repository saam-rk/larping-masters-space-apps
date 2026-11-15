/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { geometryOnly } from '../../../../tools/lunar-terrain/geometry-only.mjs';
import { findSite } from '../../../../shared/sites';
import { observerAltitudeKm, terrainObserver } from '../../../../shared/observer';
import { SITE_TERRAINS } from './models';
import { curvedTerrain, disposeTerrain, surfacePoint, terrainGround } from './curvedTerrain';
import { SPHERE_RADIUS_M, type SiteTerrain } from './siteTerrain';
import { shadowCoverage } from '../solarExposure';
import { horizontalToDirection } from '../geometry';

describe('curved terrain and fixed observer contract', () => {
  it('embeds a controlled sphere, rather than leaving a 10 km chord flat', () => {
    const model: SiteTerrain = { siteId: 'shackleton-rim', terrainUrl: '', origin: { projectedXM: 0, projectedYM: 0, elevationM: 0 }, cropSizeKm: [10, 10], northGridBearingDeg: 0 };
    const theta = 2 * Math.atan(10000 / (2 * SPHERE_RADIUS_M));
    const point = surfacePoint(model, { latitudeDeg: -90, longitudeEastDeg: 0 }, new Vector3(10000, 0, 0));
    expect(point.y).toBeCloseTo(SPHERE_RADIUS_M * (Math.cos(theta) - 1), 8);
    expect(Math.abs(point.y)).toBeGreaterThan(28.7);
    expect(point.clone().add(new Vector3(0, SPHERE_RADIUS_M, 0)).length()).toBeCloseTo(SPHERE_RADIUS_M, 8);
  });

  it.each(SITE_TERRAINS)('keeps $siteId at the selected ground coordinate with recorded asset provenance', async (model) => {
    const site = findSite(model.siteId);
    const observer = terrainObserver(site)!;
    const path = new URL(`../../../../public${model.terrainUrl}`, import.meta.url);
    expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(observer.sha256);
    const source = await geometryOnly(path);
    const before = new Box3().setFromObject(source);
    const curved = curvedTerrain(source, model, site, observer.groundElevationM);
    expect(Math.abs(terrainGround(curved)!)).toBeLessThan(0.002);
    expect(observerAltitudeKm(site) * 1000 - observer.groundElevationM).toBeCloseTo(1.7, 9);
    const bounds = new Box3().setFromObject(curved);
    const coverage = shadowCoverage(bounds, new Vector3(...horizontalToDirection(30, 0.01)));
    curved.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      expect(object.castShadow).toBe(true);
      expect(object.receiveShadow).toBe(true);
      const positions = object.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 101) {
        const point = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(coverage.view);
        expect(Math.abs(point.x)).toBeLessThan(coverage.halfSize);
        expect(Math.abs(point.y)).toBeLessThan(coverage.halfSize);
        expect(-point.z).toBeGreaterThan(coverage.near);
        expect(-point.z).toBeLessThan(coverage.far);
      }
    });
    expect(new Box3().setFromObject(source).equals(before)).toBe(true);
    expect(() => curvedTerrain(curved, model, site, observer.groundElevationM)).toThrow('already applied');
    expect(terrainGround(curved, 100_000, 100_000)).toBeNull();
    disposeTerrain(curved);
    disposeTerrain(source);
  });
});
