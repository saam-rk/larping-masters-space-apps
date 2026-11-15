import { describe, expect, it } from 'vitest';
import { FIXTURES, loadFixture } from './__fixtures__/load.js';
import { parseObserverPayload, parseRowTime } from './parse.js';

const CSV_HEADER =
  ' Date__(UT)__HR:MN:SC.fff, , ,Azi_(a-app), Elev_(a-app),  Ang-diam,             delta,     deldot,';

function payloadWithRows(rows: string[], header = CSV_HEADER): unknown {
  return {
    signature: { version: '1.2', source: 'NASA/JPL Horizons API' },
    result: [
      'Target body name: Sun (10)                        {source: DE441}',
      'Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}',
      'Vis. interferer : EARTH (R_eq= 6378.137) km       {source: DE441}',
      '*****',
      header,
      '*****',
      '$$SOE',
      ...rows,
      '$$EOE',
    ].join('\n'),
  };
}

describe('parseObserverPayload', () => {
  it('reads the saved Sun response for Nobile Rim 1', () => {
    const parsed = parseObserverPayload(loadFixture(FIXTURES.nobileSun), 'sun');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.table).toEqual({
      ephemerisUtc: '2026-11-14T12:00:00Z',
      apiVersion: '1.2',
      planetaryEphemeris: 'DE441',
      observerFrame: 'MEAN_ME (high precision)',
      observation: {
        body: 'sun',
        targetName: 'Sun (10)',
        azimuthDeg: 83.301542,
        elevationDeg: 2.094722,
        angularDiameterArcsec: 1941.825,
        rangeAu: 0.98796880248943,
        rangeRateKmPerS: 0.3494014,
        markers: { solarPresence: '*', interferingBodyPresence: 'i' },
        interferingBody: 'EARTH',
      },
    });
  });

  it('reads the saved Earth response for Nobile Rim 1', () => {
    const parsed = parseObserverPayload(loadFixture(FIXTURES.nobileEarth), 'earth');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.table.observation).toMatchObject({
      body: 'earth',
      targetName: 'Earth (399)',
      azimuthDeg: 320.816668,
      elevationDeg: -0.587903,
      angularDiameterArcsec: 6492.344,
      rangeRateKmPerS: -0.0100249,
    });
  });

  it('reports a Horizons error field as UPSTREAM_REJECTED', () => {
    const parsed = parseObserverPayload(loadFixture(FIXTURES.unreadableTlist), 'sun');
    expect(parsed).toEqual({
      ok: false,
      error: { code: 'UPSTREAM_REJECTED', detail: expect.stringContaining('unreadable TLIST value') },
    });
  });

  it('turns "n.a." into null instead of zero', () => {
    const parsed = parseObserverPayload(
      payloadWithRows([' 2026-Nov-14 12:00:00.000,*,i,  83.301542,     2.094722,  n.a.,  n.a.,  n.a.,']),
      'sun',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.table.observation.angularDiameterArcsec).toBeNull();
    expect(parsed.table.observation.rangeAu).toBeNull();
    expect(parsed.table.observation.azimuthDeg).toBe(83.301542);
  });

  it('keeps blank markers verbatim', () => {
    const parsed = parseObserverPayload(
      payloadWithRows([' 2026-Nov-14 12:00:00.000, , , 292.387658, -1.0, 1.0, 1.0, 1.0,']),
      'sun',
    );
    expect(parsed.ok && parsed.table.observation.markers).toEqual({ solarPresence: ' ', interferingBodyPresence: ' ' });
  });

  it.each([
    ['no rows', []],
    ['two rows', [' 2026-Nov-14 12:00:00.000,*,i, 1, 2, 3, 4, 5,', ' 2026-Nov-14 13:00:00.000,*,i, 1, 2, 3, 4, 5,']],
    ['a non-numeric azimuth', [' 2026-Nov-14 12:00:00.000,*,i, abc, 2, 3, 4, 5,']],
    ['overflowing azimuth', [' 2026-Nov-14 12:00:00.000,*,i, 1e309, 2, 3, 4, 5,']],
    ['invalid elevation', [' 2026-Nov-14 12:00:00.000,*,i, 1, 91, 3, 4, 5,']],
    ['negative diameter', [' 2026-Nov-14 12:00:00.000,*,i, 1, 2, -3, 4, 5,']],
    ['zero range', [' 2026-Nov-14 12:00:00.000,*,i, 1, 2, 3, 0, 5,']],
    ['invalid calendar day', [' 2026-Feb-30 12:00:00.000,*,i, 1, 2, 3, 4, 5,']],
    ['an unreadable time', [' 14/11/2026 12:00,*,i, 1, 2, 3, 4, 5,']],
  ])('rejects a table with %s as UPSTREAM_FORMAT', (_label, rows) => {
    const parsed = parseObserverPayload(payloadWithRows(rows), 'sun');
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error.code).toBe('UPSTREAM_FORMAT');
  });

  it('requires the azimuth and elevation columns', () => {
    const header = ' Date__(UT)__HR:MN:SC.fff, , ,  Ang-diam,';
    const parsed = parseObserverPayload(payloadWithRows([' 2026-Nov-14 12:00:00.000,*,i, 1941.8,'], header), 'sun');
    expect(!parsed.ok && parsed.error).toEqual({ code: 'UPSTREAM_FORMAT', detail: 'required column "Azi_(a-app)" missing' });
  });

  it.each([null, 'text', { result: 42 }, { signature: {} }])('rejects malformed payload %j', (payload) => {
    const parsed = parseObserverPayload(payload, 'sun');
    expect(!parsed.ok && parsed.error.code).toBe('UPSTREAM_FORMAT');
  });
});

describe('parseRowTime', () => {
  it.each([
    ['2026-Nov-14 12:00:00.000', '2026-11-14T12:00:00Z'],
    ['2026-Nov-14 12:00', '2026-11-14T12:00:00Z'],
    ['2000-Jan-01 00:00:59.250', '2000-01-01T00:00:59.25Z'],
  ])('converts %s', (cell, iso) => {
    expect(parseRowTime(cell)).toBe(iso);
  });

  it.each(['b2026-Nov-14 12:00', '2026-Foo-14 12:00', ''])('rejects %j', (cell) => {
    expect(parseRowTime(cell)).toBeNull();
  });
});
