import { describe, expect, it } from 'vitest';
import { findSite, type SiteId } from '../../../../shared/sites';
import { SITE_TERRAINS, terrainForSite } from './models';
import { glbToSceneDirection, projectSouthPolar, projectedToGlb } from './siteTerrain';

function normalize([x, y, z]: readonly number[]): number[] {
  const length = Math.hypot(x ?? 0, y ?? 0, z ?? 0);
  return [(x ?? 0) / length, (y ?? 0) / length, (z ?? 0) / length];
}

describe('terrain models', () => {
  it('has first-person terrain for every reference site and none for custom points', () => {
    expect(SITE_TERRAINS.map((model) => model.siteId).sort()).toEqual(['amundsen-rim', 'apollo-11', 'faustini-rim-a', 'haworth', 'malapert-crater-1', 'nobile-rim-1', 'nobile-rim-2', 'shackleton-rim', 'shoemaker-rim-a']);
    expect(terrainForSite('custom')).toBeNull();
  });

  it.each<[SiteId, number, number]>([
    // docs/research/site-terrain/nobile-rim-2/README.md: X=157000.451965 m, Y=95000.253401 m.
    ['nobile-rim-2', 157000.451965, 95000.253401],
    // assets/terrain/nobile-rim-1/README.md: X=84,000.0100258 m, Y=110,000.0107917 m.
    ['nobile-rim-1', 84000.0100258, 110000.0107917],
    // assets/terrain/shackleton-rim/README.md: X=-1000.036606 m, Y=-7000.345565 m.
    ['shackleton-rim', -1000.036606, -7000.345565],
    // public/terrain/faustini-rim-a.metadata.json: controlPoints[0].projectedM.
    ['faustini-rim-a', 63998.60146096506, 0],
    // public/terrain/malapert-crater-1.metadata.json: controlPoints[0].projectedM.
    ['malapert-crater-1', 23000.004102650397, 156000.0349714206],
  ])('projects %s as in its terrain metadata', (siteId, expectedX, expectedY) => {
    const site = findSite(siteId);
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    expect(x).toBeCloseTo(expectedX, 4);
    expect(y).toBeCloseTo(expectedY, 4);
  });

  it('projects amundsen-rim as in its terrain README (published to the millimeter)', () => {
    // assets/terrain/amundsen-rim/README.md: X 164001.125 m, Y 61500.405 m.
    const site = findSite('amundsen-rim');
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    expect(x).toBeCloseTo(164001.125, 2);
    expect(y).toBeCloseTo(61500.405, 2);
  });

  it('projects haworth as in its terrain README (published to the millimeter)', () => {
    // assets/terrain/haworth/README.md: X -38000.456 m, Y 90501.190 m.
    const site = findSite('haworth');
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    expect(x).toBeCloseTo(-38000.456, 2);
    expect(y).toBeCloseTo(90501.19, 2);
  });

  it('projects shoemaker-rim-a as in its terrain README (published to the millimeter)', () => {
    // assets/terrain/shoemaker-rim-a/README.md: X 12000.225 m, Y 57001.060 m.
    const site = findSite('shoemaker-rim-a');
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    expect(x).toBeCloseTo(12000.225, 2);
    expect(y).toBeCloseTo(57001.06, 2);
  });

  it('records the larger Haworth, Shoemaker Rim A, Faustini Rim A and Malapert Crater 1 crops', () => {
    // Metadata bounds: Haworth -45500..-33500 x 88500..102500 m; Shoemaker Rim A 4000..16000 x 49000..61000 m.
    expect(terrainForSite('haworth')!.cropSizeKm).toEqual([12, 14]);
    expect(terrainForSite('shoemaker-rim-a')!.cropSizeKm).toEqual([12, 12]);
    // Faustini Rim A metadata bounds: 59000..71000 x -8000..4000 m.
    expect(terrainForSite('faustini-rim-a')!.cropSizeKm).toEqual([12, 12]);
    // Malapert Crater 1 metadata bounds: 13000..33000 x 146000..166000 m.
    expect(terrainForSite('malapert-crater-1')!.cropSizeKm).toEqual([20, 20]);
    const notTenByTen = new Set<SiteId>(['haworth', 'shoemaker-rim-a', 'faustini-rim-a', 'malapert-crater-1', 'apollo-11']);
    for (const model of SITE_TERRAINS.filter((terrain) => !notTenByTen.has(terrain.siteId))) {
      expect(model.cropSizeKm).toEqual([10, 10]);
    }
  });

  it.each<SiteId>(['nobile-rim-1', 'nobile-rim-2', 'shackleton-rim', 'amundsen-rim', 'haworth', 'shoemaker-rim-a', 'faustini-rim-a', 'malapert-crater-1'])('places the %s site near the GLB origin', (siteId) => {
    const site = findSite(siteId);
    const terrain = terrainForSite(siteId)!;
    const { x, y } = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    const [gx, , gz] = projectedToGlb(terrain, x, y, terrain.origin.elevationM);
    // Origins are the saved points rounded (Amundsen Rim: X0 = 164000 m for X = 164001.125 m).
    expect(Math.hypot(gx, gz)).toBeLessThan(1.5);
  });

  it.each([
    // A small step in latitude (north) or longitude (east) from the site.
    ['nobile-rim-1', 'north', 0.01, 0, [0, 0, -1]],
    ['nobile-rim-1', 'east', 0, 0.05, [1, 0, 0]],
    ['nobile-rim-2', 'north', 0.01, 0, [0, 0, -1]],
    ['nobile-rim-2', 'east', 0, 0.05, [1, 0, 0]],
    // The chord of a longitude step turns by half the step; keep it small.
    ['shackleton-rim', 'north', 0.01, 0, [0, 0, -1]],
    ['shackleton-rim', 'east', 0, 0.02, [1, 0, 0]],
    ['amundsen-rim', 'north', 0.01, 0, [0, 0, -1]],
    ['amundsen-rim', 'east', 0, 0.05, [1, 0, 0]],
    ['haworth', 'north', 0.01, 0, [0, 0, -1]],
    ['haworth', 'east', 0, 0.05, [1, 0, 0]],
    ['shoemaker-rim-a', 'north', 0.01, 0, [0, 0, -1]],
    ['shoemaker-rim-a', 'east', 0, 0.05, [1, 0, 0]],
    ['faustini-rim-a', 'north', 0.01, 0, [0, 0, -1]],
    ['faustini-rim-a', 'east', 0, 0.05, [1, 0, 0]],
    ['malapert-crater-1', 'north', 0.01, 0, [0, 0, -1]],
    ['malapert-crater-1', 'east', 0, 0.05, [1, 0, 0]],
  ] as const)('turns geographic %s %s into the scene axis', (siteId, _label, dLat, dLon, expected) => {
    const site = findSite(siteId);
    const terrain = terrainForSite(siteId)!;
    const from = projectSouthPolar(site.latitudeDeg, site.longitudeEastDeg);
    const to = projectSouthPolar(site.latitudeDeg + dLat, site.longitudeEastDeg + dLon);
    const a = projectedToGlb(terrain, from.x, from.y, 0);
    const b = projectedToGlb(terrain, to.x, to.y, 0);
    const direction = normalize(glbToSceneDirection(terrain, [b[0] - a[0], 0, b[2] - a[2]]));
    direction.forEach((value, i) => expect(value).toBeCloseTo(expected[i] ?? NaN, 3));
  });
});
