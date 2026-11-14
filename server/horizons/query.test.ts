import { describe, expect, it } from 'vitest';
import { buildObserverParameters, buildObserverUrl, formatHorizonsCalendarTime, normalizeEastLongitude } from './query.js';

const NOBILE_QUERY = {
  body: 'sun' as const,
  latitudeDeg: -85.4381,
  longitudeEastDeg: 37.36667,
  altitudeKm: 0,
  instant: new Date('2026-11-14T12:00:00Z'),
};

describe('buildObserverParameters', () => {
  it('matches the parameters documented for the saved fixtures', () => {
    expect(Object.fromEntries(buildObserverParameters(NOBILE_QUERY))).toEqual({
      format: 'json',
      COMMAND: "'10'",
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'coord@301'",
      COORD_TYPE: "'GEODETIC'",
      SITE_COORD: "'37.36667,-85.4381,0'",
      TLIST: "'2026-11-14 12:00:00'",
      TLIST_TYPE: "'CAL'",
      TIME_TYPE: "'UT'",
      QUANTITIES: "'4,13,20'",
      ANG_FORMAT: "'DEG'",
      APPARENT: "'AIRLESS'",
      RANGE_UNITS: "'AU'",
      CSV_FORMAT: "'YES'",
      TIME_DIGITS: "'SECONDS'",
    });
  });

  it('uses Horizons ID 399 for the Earth', () => {
    const params = Object.fromEntries(buildObserverParameters({ ...NOBILE_QUERY, body: 'earth' }));
    expect(params.COMMAND).toBe("'399'");
  });

  it('normalizes west longitudes to [0, 360)', () => {
    const params = Object.fromEntries(
      buildObserverParameters({ ...NOBILE_QUERY, latitudeDeg: -89.7668, longitudeEastDeg: -171.87 }),
    );
    expect(params.SITE_COORD).toBe("'188.13,-89.7668,0'");
  });
});

describe('buildObserverUrl', () => {
  it('percent-encodes quotes and spaces', () => {
    const url = buildObserverUrl(NOBILE_QUERY);
    expect(url.startsWith('https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%2710%27&')).toBe(true);
    expect(url).toContain('TLIST=%272026-11-14%2012%3A00%3A00%27');
    expect(url).toContain('CENTER=%27coord%40301%27');
    expect(url).not.toMatch(/[ '+]/);
  });
});

describe('helpers', () => {
  it('formats calendar time in UT with seconds', () => {
    expect(formatHorizonsCalendarTime(new Date('2099-12-31T23:59:05Z'))).toBe('2099-12-31 23:59:05');
  });

  it.each([
    [0, 0],
    [37.36667, 37.36667],
    [-171.87, 188.13],
    [360, 0],
    [-0.5, 359.5],
  ])('normalizes %d to %d', (input, expected) => {
    expect(normalizeEastLongitude(input)).toBe(expected);
  });
});
