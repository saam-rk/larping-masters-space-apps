import { describe, expect, it } from 'vitest';
import type { BodyObservation } from './ephemeris.js';
import { isApiErrorResponse } from './ephemeris.js';
import { interpretEarthMarker, interpretSolarMarker, presenceOfTarget } from './presence.js';
import { checkCoordinates, findSite, isSiteId, normalizeLongitudeEast, REFERENCE_SITES, siteAt, SITE_IDS } from './sites.js';
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

  it('recognizes only known ids', () => {
    expect(isSiteId('shackleton-rim')).toBe(true);
    expect(isSiteId('Shackleton Rim')).toBe(false);
    expect(isSiteId(null)).toBe(false);
  });
});

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
