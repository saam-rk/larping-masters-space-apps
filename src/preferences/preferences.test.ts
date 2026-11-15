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
    const chosen: Preferences = { locale: 'en', effects: 'off', advanced: true };
    const header = `other=1; ${COOKIE_NAME}=${serializePreferences(chosen)}; theme=dark`;
    expect(parsePreferencesCookie(header)).toEqual(chosen);
  });

  it('returns null when the cookie is missing or from an unknown version', () => {
    expect(parsePreferencesCookie('')).toBeNull();
    expect(parsePreferencesCookie(`${COOKIE_NAME}=${encodeURIComponent('v=0&fx=off')}`)).toBeNull();
  });

  it('maps version 1 effect levels to the on/off switch', () => {
    const legacy = (fx: string) => `${COOKIE_NAME}=${encodeURIComponent(`v=1&lang=en&fx=${fx}&font=readable`)}`;
    expect(parsePreferencesCookie(legacy('full'))).toEqual({ locale: 'en', effects: 'on', advanced: false });
    expect(parsePreferencesCookie(legacy('lite'))).toEqual({ locale: 'en', effects: 'on', advanced: false });
    expect(parsePreferencesCookie(legacy('off'))).toEqual({ locale: 'en', effects: 'off', advanced: false });
  });

  it('reads a version 2 cookie saved before the advanced switch as closed', () => {
    const header = `${COOKIE_NAME}=${encodeURIComponent('v=2&lang=en&fx=off')}`;
    expect(parsePreferencesCookie(header)).toEqual({ locale: 'en', effects: 'off', advanced: false });
  });

  it('falls back to defaults for unknown values', () => {
    const header = `${COOKIE_NAME}=${encodeURIComponent('v=2&lang=fr&fx=ultra&adv=yes')}`;
    expect(parsePreferencesCookie(header)).toEqual(DEFAULT_PREFERENCES);
  });

  it('survives malformed encoding', () => {
    expect(parsePreferencesCookie(`${COOKIE_NAME}=%E0%A4%A`)).toBeNull();
  });
});

describe('recommendPreferences', () => {
  it('suggests effects on capable devices, in Spanish', () => {
    expect(recommendPreferences({ prefersReducedMotion: false, hardwareConcurrency: 8, deviceMemoryGb: 8 })).toEqual({
      locale: 'es',
      effects: 'on',
      advanced: false,
    });
  });

  it('suggests effects off with reduced motion or modest hardware', () => {
    expect(recommendPreferences({ prefersReducedMotion: true, hardwareConcurrency: 16 }).effects).toBe('off');
    expect(recommendPreferences({ prefersReducedMotion: false, hardwareConcurrency: 4 }).effects).toBe('off');
    expect(recommendPreferences({ prefersReducedMotion: false, deviceMemoryGb: 2 }).effects).toBe('off');
  });
});
