import { describe, expect, it } from 'vitest';
import { checkRange, formatRangeParam, matchesConditions, matchesRange, parseAngleText, parseRangeParam } from './skySearch.js';

describe('parseAngleText', () => {
  it('accepts plain degrees with up to 4 decimals', () => {
    expect(parseAngleText('12')).toBe(12);
    expect(parseAngleText(' -3.5 ')).toBe(-3.5);
    expect(parseAngleText('359.9999')).toBe(359.9999);
    expect(parseAngleText('-0')).toBe(0);
  });

  it.each(['', '1.23456', '1e2', '12°', 'abc', '1,5', '.5', '1234'])('rejects %j', (text) => {
    expect(parseAngleText(text)).toBeNull();
  });
});

describe('checkRange / parseRangeParam', () => {
  it('allows azimuth ranges that wrap through north, not reversed elevation ranges', () => {
    expect(checkRange('azimuth', 350, 10).ok).toBe(true);
    expect(checkRange('elevation', 10, 5)).toEqual({ ok: false, reason: 'order' });
    expect(checkRange('elevation', -91, 0)).toEqual({ ok: false, reason: 'bounds' });
    expect(checkRange('azimuth', 0, 360.0001)).toEqual({ ok: false, reason: 'bounds' });
  });

  it('round-trips the query form', () => {
    expect(formatRangeParam({ min: 1.5, max: 1.5 })).toBe('1.5');
    expect(formatRangeParam({ min: 350, max: 10 })).toBe('350,10');
    expect(parseRangeParam('azimuth', '350,10')).toEqual({ ok: true, range: { min: 350, max: 10 } });
    expect(parseRangeParam('elevation', '1.5')).toEqual({ ok: true, range: { min: 1.5, max: 1.5 } });
    expect(parseRangeParam('elevation', '1,2,3').ok).toBe(false);
  });
});

describe('matchesRange', () => {
  it('compares values rounded to 4 decimals', () => {
    const exact = { min: 1.2345, max: 1.2345 };
    expect(matchesRange('elevation', exact, 1.23454)).toBe(true);
    expect(matchesRange('elevation', exact, 1.234451)).toBe(true);
    expect(matchesRange('elevation', exact, 1.23456)).toBe(false);
    expect(matchesRange('elevation', exact, 1.23444)).toBe(false);
  });

  it('handles azimuth ranges across north and the 360/0 seam', () => {
    const north = { min: 350, max: 10 };
    expect(matchesRange('azimuth', north, 355)).toBe(true);
    expect(matchesRange('azimuth', north, 5)).toBe(true);
    expect(matchesRange('azimuth', north, 180)).toBe(false);
    expect(matchesRange('azimuth', { min: 359, max: 360 }, 359.99999)).toBe(true);
    expect(matchesRange('azimuth', { min: 0, max: 0 }, 359.99996)).toBe(true);
  });

  it('never matches a missing value', () => {
    expect(matchesRange('elevation', { min: -90, max: 90 }, null)).toBe(false);
    expect(matchesConditions({ sunElevation: { min: -90, max: 90 } }, {})).toBe(false);
    expect(matchesConditions({}, {})).toBe(true);
  });
});
