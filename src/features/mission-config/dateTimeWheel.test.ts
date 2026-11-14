import { describe, expect, it } from 'vitest';
import { changeDatePart, currentUtcMinute, MAX_YEAR, MIN_YEAR, stepWheel } from './dateTimeWheel';
import { fieldsToUtc, utcToFields } from './timeZone';

describe('date and time wheels', () => {
  it('clamps the day when changing to a shorter month', () => {
    expect(changeDatePart('2026-01-31', 'month', 2)).toBe('2026-02-28');
    expect(changeDatePart('2026-03-31', 'month', 4)).toBe('2026-04-30');
  });

  it('handles leap years when changing months and years', () => {
    expect(changeDatePart('2028-01-31', 'month', 2)).toBe('2028-02-29');
    expect(changeDatePart('2028-02-29', 'year', 2029)).toBe('2029-02-28');
    expect(changeDatePart('2000-01-31', 'month', 2)).toBe('2000-02-29');
  });

  it('wraps cyclic fields and stops years at the supported boundaries', () => {
    expect(stepWheel(59, 1, 0, 59, true)).toBe(0);
    expect(stepWheel(0, -1, 0, 23, true)).toBe(23);
    expect(stepWheel(1, -1, 1, 12, true)).toBe(12);
    expect(stepWheel(MIN_YEAR, -1, MIN_YEAR, MAX_YEAR, false)).toBe(MIN_YEAR);
    expect(stepWheel(MAX_YEAR, 1, MIN_YEAR, MAX_YEAR, false)).toBe(MAX_YEAR);
  });

  it('captures the current instant to minute precision, including UTC date rollover', () => {
    const utc = currentUtcMinute(new Date('2026-11-15T00:03:59.999+01:00'));
    expect(utc).toBe('2026-11-14T23:03:00Z');
    for (const zone of ['utc', 'local'] as const) {
      const fields = utcToFields(utc, zone);
      expect(fieldsToUtc(fields, zone, utc)).toMatchObject({ ok: true, iso: utc });
    }
  });
});
