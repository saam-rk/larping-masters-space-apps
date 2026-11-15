import { describe, expect, it } from 'vitest';
import { EXAMPLE_ASSUMPTIONS } from '../../../shared/missionAssessment';
import { EXAMPLE_INPUTS, fieldValue, parseDecimal, readAssumptions } from './assumptionsForm';
import { shiftedUtc } from './scenarios';

describe('parseDecimal', () => {
  it('accepts a decimal point or comma, signs and the typographic minus', () => {
    expect(parseDecimal('8.4')).toBe(8.4);
    expect(parseDecimal(' 8,4 ')).toBe(8.4);
    expect(parseDecimal('-3')).toBe(-3);
    expect(parseDecimal('−3')).toBe(-3);
    expect(parseDecimal('.5')).toBe(0.5);
  });

  it('rejects anything else', () => {
    for (const text of ['', '-', '1e3', '1.2.3', 'abc', '1,2,3']) expect(parseDecimal(text)).toBeNull();
  });
});

describe('fieldValue', () => {
  it('applies each field range', () => {
    expect(fieldValue('panelArea', '0')).toBeNull();
    expect(fieldValue('efficiency', '101')).toBeNull();
    expect(fieldValue('demand', '0')).toBe(0);
    expect(fieldValue('earthMask', '-91')).toBeNull();
    expect(fieldValue('earthMask', '-90')).toBeNull();
    expect(fieldValue('earthMask', '-0.1')).toBeNull();
    expect(fieldValue('earthMask', '0')).toBe(0);
    expect(fieldValue('earthMask', '90')).toBe(90);
    expect(fieldValue('transmitGain', '-3')).toBe(-3);
  });
});

describe('readAssumptions', () => {
  it('turns the example inputs back into the example assumptions', () => {
    const reading = readAssumptions(EXAMPLE_INPUTS);
    expect(reading.invalid).toEqual([]);
    expect(reading.assumptions?.power.panelAreaM2).toBe(EXAMPLE_ASSUMPTIONS.power.panelAreaM2);
    expect(reading.assumptions?.power.efficiency).toBeCloseTo(EXAMPLE_ASSUMPTIONS.power.efficiency, 12);
    expect(reading.assumptions?.link).toEqual(EXAMPLE_ASSUMPTIONS.link);
  });

  it('rejects a negative elevation mask restored from older inputs', () => {
    expect(readAssumptions({ ...EXAMPLE_INPUTS, earthMask: '-90' })).toEqual({ assumptions: null, invalid: ['earthMask'] });
  });

  it('gives no assumptions while any field is invalid, and names the fields', () => {
    const reading = readAssumptions({ ...EXAMPLE_INPUTS, frequency: '', dataRate: 'x' });
    expect(reading.assumptions).toBeNull();
    expect(reading.invalid).toEqual(['frequency', 'dataRate']);
  });
});

describe('shiftedUtc', () => {
  it('moves an instant and refuses to leave the supported range', () => {
    expect(shiftedUtc('2026-11-14T12:00:00Z', 7 * 1440)).toBe('2026-11-21T12:00:00Z');
    expect(shiftedUtc('2099-12-31T12:00:00Z', 1440)).toBeNull();
  });
});
