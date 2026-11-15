import { describe, expect, it } from 'vitest';
import { formatOffset } from '../../format';
import { EMPTY_INPUTS, readForm, readRow } from './conditionForm';
import { EXAMPLE_INPUTS } from './examples';

const NOBILE_RIM_1 = { latitudeDeg: -85.4381, longitudeEastDeg: 37.36667 };

describe('readRow', () => {
  it('reads ranges, exact values (one field) and empty rows', () => {
    expect(readRow('sunElevation', { min: '', max: '' })).toEqual({ kind: 'empty' });
    expect(readRow('sunElevation', { min: '0,5', max: '90' })).toEqual({ kind: 'ok', range: { min: 0.5, max: 90 } });
    expect(readRow('earthElevation', { min: '', max: '1.2345' })).toEqual({ kind: 'ok', range: { min: 1.2345, max: 1.2345 } });
    expect(readRow('sunAzimuth', { min: '350', max: '10' })).toEqual({ kind: 'ok', range: { min: 350, max: 10 } });
  });

  it('points at the field that is wrong', () => {
    expect(readRow('sunElevation', { min: '1.23456', max: '' })).toEqual({ kind: 'invalid', reason: 'format', field: 'min' });
    expect(readRow('sunAzimuth', { min: '10', max: '400' })).toEqual({ kind: 'invalid', reason: 'bounds', field: 'max' });
    expect(readRow('sunElevation', { min: '5', max: '1' })).toEqual({ kind: 'invalid', reason: 'order', field: 'both' });
  });
});

describe('readForm', () => {
  it('needs at least one filled row and no invalid row', () => {
    expect(readForm(EMPTY_INPUTS, NOBILE_RIM_1)).toMatchObject({ active: 0, conditions: null });
    const one = readForm({ ...EMPTY_INPUTS, earthAzimuth: { min: '318', max: '322' } }, NOBILE_RIM_1);
    expect(one).toMatchObject({ active: 1, conditions: { earthAzimuth: { min: 318, max: 322 } } });
    const broken = readForm({ ...EMPTY_INPUTS, earthAzimuth: { min: '318', max: '' }, sunElevation: { min: 'x', max: '' } }, NOBILE_RIM_1);
    expect(broken.conditions).toBeNull();
  });

  it('blocks rows that the body never meets at the site', () => {
    const high = readForm({ ...EMPTY_INPUTS, sunElevation: { min: '20', max: '30' }, earthAzimuth: { min: '318', max: '322' } }, NOBILE_RIM_1);
    expect(high).toMatchObject({ active: 2, impossible: ['sun'], conditions: null });
    const low = readForm({ ...EMPTY_INPUTS, sunElevation: { min: '0', max: '5' } }, NOBILE_RIM_1);
    expect(low).toMatchObject({ impossible: [], conditions: { sunElevation: { min: 0, max: 5 } } });
  });
});

describe('eclipse examples', () => {
  const APOLLO_11 = { latitudeDeg: 0.67416, longitudeEastDeg: 23.47314 };
  const FAR_SIDE = { latitudeDeg: 0, longitudeEastDeg: 180 };

  it('fill a separation threshold with the body to look at above the horizon', () => {
    expect(readForm(EXAMPLE_INPUTS.solarEclipse, APOLLO_11).conditions).toEqual({
      sunElevation: { min: 0, max: 90 },
      sunEarthSeparation: { min: 0, max: 1.15 },
    });
    expect(readForm(EXAMPLE_INPUTS.terrestrialEclipse, NOBILE_RIM_1).conditions).toEqual({
      earthElevation: { min: 0, max: 90 },
      sunEarthSeparation: { min: 178.89, max: 180 },
    });
  });

  it('flag the Earth eclipse where the Earth is never up', () => {
    expect(readForm(EXAMPLE_INPUTS.terrestrialEclipse, FAR_SIDE)).toMatchObject({ impossible: ['earth'], conditions: null });
  });
});

describe('formatOffset', () => {
  it('formats signed durations without leading zero units', () => {
    expect(formatOffset(0)).toBe('0 s');
    expect(formatOffset(137_975)).toBe('+1 d 14 h 19 min 35 s');
    expect(formatOffset(-3603)).toBe('−1 h 0 min 3 s');
  });
});
