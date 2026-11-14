/**
 * Display preferences chosen on the first visit (or later from the sidebar),
 * persisted in a first-party cookie so the setup screen is not shown again.
 *
 * Cookie format: `clps_prefs=v=1&lang=es&fx=full&font=terminal` (URL-encoded).
 * Parsing is defensive: unknown or missing fields fall back to defaults, and
 * an unreadable cookie means "not configured yet".
 */

import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/messages';

/** `full`: parallax, warp, CRT animation. `lite`: static layers. `off`: plain background. */
export const EFFECT_LEVELS = ['full', 'lite', 'off'] as const;
export type EffectLevel = (typeof EFFECT_LEVELS)[number];

/** `terminal`: pixel MS-DOS style font. `readable`: clearer monospace. */
export const FONT_STYLES = ['terminal', 'readable'] as const;
export type FontStyle = (typeof FONT_STYLES)[number];

export interface Preferences {
  readonly locale: Locale;
  readonly effects: EffectLevel;
  readonly font: FontStyle;
}

export const COOKIE_NAME = 'clps_prefs';
const COOKIE_VERSION = '1';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const DEFAULT_PREFERENCES: Preferences = { locale: DEFAULT_LOCALE, effects: 'full', font: 'terminal' };

export function isEffectLevel(value: unknown): value is EffectLevel {
  return typeof value === 'string' && (EFFECT_LEVELS as readonly string[]).includes(value);
}

export function isFontStyle(value: unknown): value is FontStyle {
  return typeof value === 'string' && (FONT_STYLES as readonly string[]).includes(value);
}

export function serializePreferences(preferences: Preferences): string {
  const params = new URLSearchParams({
    v: COOKIE_VERSION,
    lang: preferences.locale,
    fx: preferences.effects,
    font: preferences.font,
  });
  return encodeURIComponent(params.toString());
}

/** Reads the preferences cookie from a `document.cookie` string; `null` when absent or unreadable. */
export function parsePreferencesCookie(cookieHeader: string): Preferences | null {
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!entry) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)));
  } catch {
    return null;
  }
  if (params.get('v') !== COOKIE_VERSION) return null;

  const locale = params.get('lang');
  const effects = params.get('fx');
  const font = params.get('font');
  return {
    locale: isLocale(locale) ? locale : DEFAULT_PREFERENCES.locale,
    effects: isEffectLevel(effects) ? effects : DEFAULT_PREFERENCES.effects,
    font: isFontStyle(font) ? font : DEFAULT_PREFERENCES.font,
  };
}

export function readPreferencesCookie(): Preferences | null {
  try {
    return parsePreferencesCookie(document.cookie);
  } catch {
    // Cookies can be blocked; the app then asks again on every visit.
    return null;
  }
}

export function writePreferencesCookie(preferences: Preferences): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  try {
    document.cookie = `${COOKIE_NAME}=${serializePreferences(preferences)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Not persisting is acceptable; the choice still applies to this visit.
  }
}

export interface DeviceHints {
  readonly prefersReducedMotion: boolean;
  readonly hardwareConcurrency?: number;
  /** `navigator.deviceMemory` in GiB, where the browser exposes it. */
  readonly deviceMemoryGb?: number;
}

/**
 * Suggested first-visit choices: lighter effects on modest devices or with
 * reduced motion. The language stays the project default (Spanish).
 */
export function recommendPreferences(hints: DeviceHints): Preferences {
  const lowEnd =
    (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 4) ||
    (hints.deviceMemoryGb !== undefined && hints.deviceMemoryGb <= 4);
  const effects: EffectLevel = hints.prefersReducedMotion || lowEnd ? 'lite' : 'full';
  return { locale: DEFAULT_LOCALE, effects, font: 'terminal' };
}

export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    prefersReducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    deviceMemoryGb: nav.deviceMemory,
  };
}
