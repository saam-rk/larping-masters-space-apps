import { describe, expect, it } from 'vitest';
import {
  COOKIE_NAME,
  DEFAULT_PREFERENCES,
  parsePreferencesCookie,
  recommendPreferences,
  serializePreferences,
  type Preferences,
} from './preferences';

describe('preferences cookie', () => {
  it('round-trips through serialize and parse', () => {
    const chosen: Preferences = { locale: 'en', effects: 'lite', font: 'readable' };
    const header = `other=1; ${COOKIE_NAME}=${serializePreferences(chosen)}; theme=dark`;
    expect(parsePreferencesCookie(header)).toEqual(chosen);
  });

  it('returns null when the cookie is missing or from another version', () => {
    expect(parsePreferencesCookie('')).toBeNull();
    expect(parsePreferencesCookie(`${COOKIE_NAME}=${encodeURIComponent('v=0&fx=off')}`)).toBeNull();
  });

  it('falls back to defaults for unknown values', () => {
    const header = `${COOKIE_NAME}=${encodeURIComponent('v=1&lang=fr&fx=ultra&font=comic')}`;
    expect(parsePreferencesCookie(header)).toEqual(DEFAULT_PREFERENCES);
  });

  it('survives malformed encoding', () => {
    expect(parsePreferencesCookie(`${COOKIE_NAME}=%E0%A4%A`)).toBeNull();
  });
});

describe('recommendPreferences', () => {
  it('suggests full effects on capable devices, in Spanish', () => {
    expect(recommendPreferences({ prefersReducedMotion: false, hardwareConcurrency: 8, deviceMemoryGb: 8 })).toEqual({
      locale: 'es',
      effects: 'full',
      font: 'terminal',
    });
  });

  it('suggests lite effects with reduced motion or modest hardware', () => {
    expect(recommendPreferences({ prefersReducedMotion: true, hardwareConcurrency: 16 }).effects).toBe('lite');
    expect(recommendPreferences({ prefersReducedMotion: false, hardwareConcurrency: 4 }).effects).toBe('lite');
    expect(recommendPreferences({ prefersReducedMotion: false, deviceMemoryGb: 2 }).effects).toBe('lite');
  });
});
