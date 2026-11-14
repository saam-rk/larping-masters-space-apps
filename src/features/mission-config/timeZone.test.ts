import { describe, expect, it, vi } from 'vitest';
import { fieldsToUtc, formatUtcMinute, formatUtcOffset, localOffsetLabel, utcToFields } from './timeZone';

// Fixed zone for the local-mode cases (Europe/Madrid: UTC+1 in winter, UTC+2 in summer).
// Node re-reads TZ when it is assigned, so this takes effect before any Date is created.
vi.stubEnv('TZ', 'Europe/Madrid');

describe('formatUtcOffset', () => {
  it('formats whole and fractional hours with sign', () => {
    expect(formatUtcOffset(0)).toBe('UTC+00:00');
    expect(formatUtcOffset(60)).toBe('UTC+01:00');
    expect(formatUtcOffset(-360)).toBe('UTC-06:00');
    expect(formatUtcOffset(330)).toBe('UTC+05:30');
    expect(formatUtcOffset(-210)).toBe('UTC-03:30');
  });
});

describe('UTC mode', () => {
  it('splits and joins without shifting', () => {
    const fields = utcToFields('2026-11-14T12:00:00Z', 'utc');
    expect(fields).toEqual({ date: '2026-11-14', time: '12:00' });
    const parsed = fieldsToUtc(fields, 'utc');
    expect(parsed.ok && parsed.iso).toBe('2026-11-14T12:00:00Z');
  });

  it('reuses the UTC validation', () => {
    expect(fieldsToUtc({ date: '2026-02-30', time: '12:00' }, 'utc')).toEqual({ ok: false, reason: 'invalid-date' });
    expect(fieldsToUtc({ date: '2100-01-01', time: '00:00' }, 'utc')).toEqual({ ok: false, reason: 'out-of-range' });
    expect(fieldsToUtc({ date: '', time: '12:00' }, 'utc')).toEqual({ ok: false, reason: 'format' });
  });
});

describe('local mode (Europe/Madrid)', () => {
  it('reads the zone offset from the date', () => {
    expect(localOffsetLabel('2026-11-14T12:00:00Z')).toBe('UTC+01:00');
    expect(localOffsetLabel('2026-07-01T12:00:00Z')).toBe('UTC+02:00');
  });

  it('shows a UTC instant in local fields', () => {
    expect(utcToFields('2026-11-14T12:00:00Z', 'local')).toEqual({ date: '2026-11-14', time: '13:00' });
    expect(utcToFields('2026-07-01T12:00:00Z', 'local')).toEqual({ date: '2026-07-01', time: '14:00' });
    // Crosses midnight.
    expect(utcToFields('2026-11-14T23:30:00Z', 'local')).toEqual({ date: '2026-11-15', time: '00:30' });
  });

  it('converts local fields to UTC', () => {
    const winter = fieldsToUtc({ date: '2026-11-14', time: '13:00' }, 'local');
    expect(winter.ok && winter.iso).toBe('2026-11-14T12:00:00Z');
    const summer = fieldsToUtc({ date: '2026-07-01', time: '14:00' }, 'local');
    expect(summer.ok && summer.iso).toBe('2026-07-01T12:00:00Z');
  });

  it('round-trips an instant through both zones', () => {
    const utc = '2031-03-30T04:15:00Z';
    const local = utcToFields(utc, 'local');
    const back = fieldsToUtc(local, 'local');
    expect(back.ok && back.iso).toBe(utc);
  });

  it('rejects a local time skipped by the spring-forward change', () => {
    // 2026-03-29: clocks go from 02:00 to 03:00 in Spain.
    expect(fieldsToUtc({ date: '2026-03-29', time: '02:30' }, 'local')).toEqual({
      ok: false,
      reason: 'nonexistent-local-time',
    });
  });

  it('accepts a local time that happens twice (first occurrence)', () => {
    // 2026-10-25: 02:00-03:00 happens twice in Spain.
    const parsed = fieldsToUtc({ date: '2026-10-25', time: '02:30' }, 'local');
    expect(parsed.ok && parsed.iso).toBe('2026-10-25T00:30:00Z');
  });

  it('applies the same range and calendar checks', () => {
    expect(fieldsToUtc({ date: '2026-02-30', time: '12:00' }, 'local')).toEqual({ ok: false, reason: 'invalid-date' });
    expect(fieldsToUtc({ date: '1999-12-31', time: '12:00' }, 'local')).toEqual({ ok: false, reason: 'out-of-range' });
    // Years below 100 must not be read as 19xx.
    expect(fieldsToUtc({ date: '0099-06-01', time: '12:00' }, 'local').ok).toBe(false);
    expect(fieldsToUtc({ date: '', time: '12:00' }, 'local')).toEqual({ ok: false, reason: 'format' });
    expect(fieldsToUtc({ date: '2026-11-14', time: '' }, 'local')).toEqual({ ok: false, reason: 'format' });
  });
});

describe('formatUtcMinute', () => {
  it('drops seconds', () => {
    expect(formatUtcMinute('2026-11-14T12:00:00Z')).toBe('2026-11-14 12:00');
  });
});
