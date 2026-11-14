import { describe, expect, it } from 'vitest';
import { parseObserverSeries } from './parse.js';
import { buildObserverRangeParameters } from './query.js';

const HEADER = [
  'Target body name: Sun (10)                        {source: DE441}',
  'Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}',
  ' Date__(UT)__HR:MN:SS, , ,Azi_(a-app), Elev_(a-app),',
];

function payload(rows: string[]) {
  return { result: [...HEADER, '$$SOE', ...rows, '$$EOE'].join('\n'), signature: { version: '1.2' } };
}

describe('buildObserverRangeParameters', () => {
  it('requests Az/El only, from START to STOP with an hourly or unitless step', () => {
    const base = { body: 'sun', latitudeDeg: -85.4381, longitudeEastDeg: 37.36667, altitudeKm: 0 } as const;
    const hourly = Object.fromEntries(
      buildObserverRangeParameters({
        ...base,
        start: new Date('2026-11-14T12:00:00Z'),
        stop: new Date('2026-12-16T12:00:00Z'),
        step: { kind: 'hours', hours: 1 },
      }),
    );
    expect(hourly).toMatchObject({
      COMMAND: "'10'",
      CENTER: "'coord@301'",
      SITE_COORD: "'37.36667,-85.4381,0'",
      START_TIME: "'2026-11-14 12:00:00'",
      STOP_TIME: "'2026-12-16 12:00:00'",
      STEP_SIZE: "'1h'",
      QUANTITIES: "'4'",
      APPARENT: "'AIRLESS'",
      TIME_DIGITS: "'SECONDS'",
    });
    expect(hourly).not.toHaveProperty('TLIST');
    const seconds = Object.fromEntries(
      buildObserverRangeParameters({ ...base, start: new Date(0), stop: new Date(60_000), step: { kind: 'intervals', count: 60 } }),
    );
    expect(seconds.STEP_SIZE).toBe("'60'");
  });
});

describe('parseObserverSeries', () => {
  it('reads every row, keeping n.a. as null', () => {
    const result = parseObserverSeries(
      payload([
        ' 2026-Nov-14 12:00:00,*,i,   83.301542,       2.094722,',
        ' 2026-Nov-14 13:00:00,*,i,        n.a.,       2.134798,',
      ]),
      'sun',
    );
    expect(result).toEqual({
      ok: true,
      series: {
        body: 'sun',
        times: [Date.parse('2026-11-14T12:00:00Z'), Date.parse('2026-11-14T13:00:00Z')],
        azimuthDeg: [83.301542, null],
        elevationDeg: [2.094722, 2.134798],
        apiVersion: '1.2',
        planetaryEphemeris: 'DE441',
        observerFrame: 'MEAN_ME (high precision)',
      },
    });
  });

  it('rejects unreadable values, unordered rows and empty tables', () => {
    expect(parseObserverSeries(payload([' 2026-Nov-14 12:00:00,*,i, abc, 1,']), 'sun').ok).toBe(false);
    expect(
      parseObserverSeries(payload([' 2026-Nov-14 13:00:00,*,i, 1, 1,', ' 2026-Nov-14 12:00:00,*,i, 1, 1,']), 'sun').ok,
    ).toBe(false);
    expect(parseObserverSeries(payload([]), 'sun').ok).toBe(false);
  });
});
