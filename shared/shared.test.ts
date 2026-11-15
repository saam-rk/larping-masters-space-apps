import { describe, expect, it } from 'vitest';
import type { BodyObservation } from './ephemeris.js';
import { isApiErrorResponse } from './ephemeris.js';
import { interpretEarthMarker, interpretSolarMarker, presenceOfTarget } from './presence.js';
import {
  checkCoordinates,
  FEATURED_SITES,
  findSite,
  isSiteId,
  MORE_SITES,
  normalizeLongitudeEast,
  REFERENCE_SITES,
  siteAt,
  siteCode,
  SITE_IDS,
  type SiteId,
} from './sites.js';
import { parseUtcInstant, toUtcIsoSeconds } from './time.js';

describe('reference sites', () => {
  it('lists every site id exactly once', () => {
    expect(REFERENCE_SITES.map((site) => site.id)).toEqual([...SITE_IDS]);
  });

  it('keeps the published Lunar Surface Data Book coordinates', () => {
    expect(findSite('nobile-rim-1')).toMatchObject({ latitudeDeg: -85.4381, longitudeEastDeg: 37.36667 });
    expect(findSite('nobile-rim-2')).toMatchObject({ latitudeDeg: -83.954, longitudeEastDeg: 58.82206 });
    expect(findSite('shackleton-rim')).toMatchObject({ latitudeDeg: -89.7668, longitudeEastDeg: -171.87 });
  });

  // docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md §3 (Lunar Surface Data Book table A2.1-1).
  it.each<[SiteId, string, string, number, number]>([
    ['amundsen-rim', 'Amundsen Rim', 'DM1', -84.2287, 69.44396],
    ['haworth', 'Haworth', 'Haworth', -86.7639, -22.777],
    ['shackleton-rim-b', 'Shackleton Rim B', 'LM1', -89.5244, 56.30993],
    ['shoemaker-rim-a', 'Shoemaker Rim A', 'LM2', -88.0792, 11.88866],
    ['shoemaker-rim-b', 'Shoemaker Rim B', 'LM3', -88.3828, 16.58734],
    ['shoemaker-rim-c', 'Shoemaker Rim C', 'LM4', -88.9645, 37.23483],
    ['shoemaker-rim-d', 'Shoemaker Rim D', 'LM5', -88.632, 74.62375],
    ['shoemaker-rim-e', 'Shoemaker Rim E', 'LM6', -87.9458, 71.27421],
    ['faustini-rim-a', 'Faustini Rim A', 'LM7', -87.8897, 90],
    ['shoemaker-rim-f', 'Shoemaker Rim F', 'LM8', -87.3417, 60.25512],
    ['cabeus-exterior-wall-1', 'Cabeus Exterior Wall 1', 'NPA', -86.9243, -71.5651],
    ['amundsen-1', 'Amundsen 1', 'NPB', -83.9046, 89.53545],
    ['idelson-l-crater-1', "Idel'son L Crater 1", 'NPC', -84.5397, 126.9045],
    ['malapert-crater-1', 'Malapert Crater 1', 'NPD', -84.8034, 8.387032],
    ['connecting-ridge', 'Connecting Ridge', 'R01', -89.4632, -137.49],
    ['peak-near-shackleton', 'Peak Near Shackleton', 'R07', -88.811, 123.6901],
    ['de-gerlache-rim-1', 'de Gerlache Rim 1', 'R11', -88.6834, -67.9321],
    ['leibnitz-beta-plateau', 'Leibnitz Beta Plateau', 'R20', -85.4266, 31.74276],
    ['leibnitz-beta-plateau-extended', 'Leibnitz Beta Plateau, extended boundaries', 'Site20v2', -85.4266, 31.74276],
    ['malapert-massif', 'Malapert Massif', 'R23', -85.9948, -0.23578],
    ['de-gerlache-kocher-massif', 'de Gerlache-Kocher Massif', 'R42', -85.8296, -116.322],
    ['shoemaker', 'Shoemaker', 'Shoemaker', -87.1835, 62.83502],
    ['de-gerlache-rim-2', 'de Gerlache Rim 2', 'SL2', -88.23, -64.6284],
    ['connecting-ridge-extension', 'Connecting Ridge Extension', 'SL3', -89.0324, -101.999],
  ])('keeps the published coordinates of %s', (id, name, code, latitudeDeg, longitudeEastDeg) => {
    const site = findSite(id);
    expect(site).toMatchObject({ name, latitudeDeg, longitudeEastDeg });
    expect(siteCode(site) ?? site.name).toBe(code);
    // Stored values are already in the checked form, so typed coordinates match them exactly.
    expect(checkCoordinates(latitudeDeg, longitudeEastDeg)).toEqual({ ok: true, latitudeDeg, longitudeEastDeg });
  });

  it('features the three original points and offers the 24 others', () => {
    expect(FEATURED_SITES.map((site) => site.id)).toEqual(['nobile-rim-1', 'nobile-rim-2', 'shackleton-rim']);
    expect(MORE_SITES).toHaveLength(24);
    expect(REFERENCE_SITES).toHaveLength(27);
    expect(new Set(SITE_IDS).size).toBe(SITE_IDS.length);
    expect(MORE_SITES.some((site) => FEATURED_SITES.includes(site))).toBe(false);
  });

  it('duplicates only the Site20 coordinate pair, as a labeled variant', () => {
    const pairs = new Map<string, SiteId[]>();
    for (const site of REFERENCE_SITES) {
      const key = `${site.latitudeDeg},${site.longitudeEastDeg}`;
      pairs.set(key, [...(pairs.get(key) ?? []), site.id]);
    }
    const shared = [...pairs.values()].filter((ids) => ids.length > 1);
    expect(shared).toEqual([['leibnitz-beta-plateau', 'leibnitz-beta-plateau-extended']]);
    expect(findSite('leibnitz-beta-plateau-extended').variantOf).toBe('leibnitz-beta-plateau');
    expect(REFERENCE_SITES.filter((site) => site.variantOf)).toHaveLength(1);
  });

  it('places every reference point at the lunar south pole within the regional DEM range (83-90° S)', () => {
    for (const site of REFERENCE_SITES) {
      expect(site.latitudeDeg).toBeLessThan(-83);
      expect(site.latitudeDeg).toBeGreaterThanOrEqual(-90);
      expect(site.longitudeEastDeg).toBeGreaterThan(-180);
      expect(site.longitudeEastDeg).toBeLessThanOrEqual(180);
    }
  });

  it('recognizes only known ids', () => {
    expect(isSiteId('shackleton-rim')).toBe(true);
    expect(isSiteId('Shackleton Rim')).toBe(false);
    expect(isSiteId(null)).toBe(false);
  });
});

function checkedPair(latitudeDeg: number, longitudeEastDeg: number): [number, number] {
  const checked = checkCoordinates(latitudeDeg, longitudeEastDeg);
  if (!checked.ok) throw new Error('invalid test coordinates');
  return [checked.latitudeDeg, checked.longitudeEastDeg];
}

describe('custom coordinates', () => {
  it.each([
    [0, 0],
    [180, 180],
    [-180, 180],
    [190, -170],
    [360, 0],
    [-171.87, -171.87],
  ])('normalizes east longitude %d to %d', (input, expected) => {
    expect(normalizeLongitudeEast(input)).toBeCloseTo(expected, 10);
  });

  it('rounds, normalizes and range-checks', () => {
    expect(checkCoordinates(-85.12345678, 188.13)).toEqual({ ok: true, latitudeDeg: -85.123457, longitudeEastDeg: -171.87 });
    expect(checkCoordinates(-0.0000001, 0)).toEqual({ ok: true, latitudeDeg: 0, longitudeEastDeg: 0 });
    expect(checkCoordinates(-90.1, 0)).toEqual({ ok: false, reason: 'latitude' });
    expect(checkCoordinates(Number.NaN, 0)).toEqual({ ok: false, reason: 'latitude' });
    expect(checkCoordinates(0, -181)).toEqual({ ok: false, reason: 'longitude' });
  });

  it('matches reference sites exactly and labels anything else as custom', () => {
    expect(siteAt(-89.7668, -171.87).id).toBe('shackleton-rim');
    expect(siteAt(-89.7668, -171.8701)).toMatchObject({ id: 'custom', source: null });
    expect(siteAt(-86.7639, -22.777).id).toBe('haworth');
    expect(siteAt(...checkedPair(-89.0324, 258.001)).id).toBe('connecting-ridge-extension');
  });

  it('resolves the shared Site20 coordinates to the base site, not its variant', () => {
    expect(siteAt(-85.4266, 31.74276).id).toBe('leibnitz-beta-plateau');
  });
});

describe('parseUtcInstant', () => {
  it.each([
    ['2026-11-14T12:00Z', '2026-11-14T12:00:00Z'],
    ['2026-11-14T12:00:30Z', '2026-11-14T12:00:30Z'],
    ['2000-01-01T00:00Z', '2000-01-01T00:00:00Z'],
    ['2099-12-31T23:59:59Z', '2099-12-31T23:59:59Z'],
  ])('accepts %s', (input, iso) => {
    expect(parseUtcInstant(input)).toMatchObject({ ok: true, iso });
  });

  it.each([
    ['2026-11-14 12:00Z', 'format'],
    ['2026-11-14T12:00', 'format'],
    ['2026-11-14T12:00:00.000Z', 'format'],
    ['2026-11-14T12:00+01:00', 'format'],
    ['2026-02-29T12:00Z', 'invalid-date'],
    ['2026-11-14T24:00Z', 'invalid-date'],
    ['1999-12-31T23:59:59Z', 'out-of-range'],
    ['2100-01-01T00:00Z', 'out-of-range'],
  ])('rejects %s (%s)', (input, reason) => {
    expect(parseUtcInstant(input)).toEqual({ ok: false, reason });
  });

  it('formats with seconds and no milliseconds', () => {
    expect(toUtcIsoSeconds(new Date('2026-11-14T12:00:00.789Z'))).toBe('2026-11-14T12:00:00Z');
  });
});

describe('presence markers', () => {
  it('reads the solar marker', () => {
    expect(interpretSolarMarker('*')).toBe('upper-limb-above-reference-horizon');
    expect(interpretSolarMarker(' ')).toBe('below-reference-horizon');
    expect(interpretSolarMarker('C')).toBe('unknown');
  });

  it('reads the Earth marker only when the interfering body is the Earth', () => {
    expect(interpretEarthMarker('i', 'EARTH')).toBe('upper-limb-above-reference-horizon');
    expect(interpretEarthMarker(' ', 'EARTH')).toBe('below-reference-horizon');
    expect(interpretEarthMarker('r', 'EARTH')).toBe('unknown');
    expect(interpretEarthMarker('i', null)).toBe('unknown');
  });

  it('picks the marker that belongs to the observed body', () => {
    const base: BodyObservation = {
      body: 'sun',
      targetName: 'Sun (10)',
      azimuthDeg: 1,
      elevationDeg: 1,
      angularDiameterArcsec: null,
      rangeAu: null,
      rangeRateKmPerS: null,
      markers: { solarPresence: '*', interferingBodyPresence: ' ' },
      interferingBody: 'EARTH',
    };
    expect(presenceOfTarget(base)).toBe('upper-limb-above-reference-horizon');
    expect(presenceOfTarget({ ...base, body: 'earth' })).toBe('below-reference-horizon');
  });
});

describe('isApiErrorResponse', () => {
  it('recognizes only known error codes', () => {
    expect(isApiErrorResponse({ error: { code: 'INVALID_REQUEST', detail: 'x' } })).toBe(true);
    expect(isApiErrorResponse({ error: { code: 'TEAPOT', detail: 'x' } })).toBe(false);
    expect(isApiErrorResponse({ provenance: 'live' })).toBe(false);
  });
});
