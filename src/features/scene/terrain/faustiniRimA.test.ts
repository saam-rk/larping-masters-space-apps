import { describe, expect, it } from 'vitest';
import metadata from '../../../../public/terrain/faustini-rim-a.metadata.json';
import { findSite } from '../../../../shared/sites';
import { FAUSTINI_RIM_A_TERRAIN } from './faustiniRimA';
import { polarTerrainForSite } from './models';
import { projectedToGlb } from './siteTerrain';

const terrain = FAUSTINI_RIM_A_TERRAIN;

describe('Faustini Rim A asset contract', () => {
  it('registers the polar terrain using the delivered metadata', () => {
    expect(polarTerrainForSite('faustini-rim-a')).toBe(terrain);
    expect(terrain.siteId).toBe(metadata.id);
    expect(terrain.terrainUrl).toBe(`/terrain/${metadata.artifacts.glb.filename}`);
    expect(terrain.astronautUrl).toBe(metadata.astronaut.url);
    expect(terrain.origin).toEqual({
      projectedXM: metadata.origin.projectedXM,
      projectedYM: metadata.origin.projectedYM,
      elevationM: metadata.origin.radialElevationM,
    });
    expect(terrain.astronautGlbPosition).toEqual(metadata.astronaut.supportGlbM);
    expect(terrain.northGridBearingDeg).toBe(findSite(terrain.siteId).longitudeEastDeg);
    const [minX, minY, maxX, maxY] = metadata.coverage.cropPixelOuterBoundsM as [number, number, number, number];
    expect(terrain.cropSizeKm).toEqual([(maxX - minX) / 1000, (maxY - minY) / 1000]);
  });

  it('keeps the astronaut and the shared 2.6 m camera ring inside the dense, textured center', () => {
    const [x, y] = metadata.nearDetail.centerProjectedM as [number, number];
    const [cx, , cz] = projectedToGlb(terrain, x, y, terrain.origin.elevationM);
    const [ax, , az] = terrain.astronautGlbPosition;
    // Maximum distance for any initial gaze bearing used by FirstPersonView.
    const farthestViewerRadiusM = Math.hypot(ax - cx, az - cz) + 2.6;
    expect(farthestViewerRadiusM).toBeLessThan(metadata.nearDetail.geometryFullDensityRadiusM);
    expect(farthestViewerRadiusM).toBeLessThan(metadata.nearDetail.textureFullDetailRadiusM);
    expect(metadata.nearDetail.seedBandsRadiusMStridePixels).toEqual([[35, 1], [150, 2], [500, 4]]);
  });
});
