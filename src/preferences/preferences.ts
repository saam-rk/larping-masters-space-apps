/**
 * Display preferences suggested on the first visit and adjustable from the
 * header options button. User changes are persisted in a first-party cookie.
 *
 * A single switch controls the effects: `on` shows the animated CRT (parallax,
 * noise, flicker, screen curvature, hyperspace jump); `off` is the low
 * performance mode, which keeps the retro look but static (stars without
 * parallax, fixed scanlines and grain, no curvature filter) and swaps the pixel
 * font for a high-visibility font (`data-font`, see styles.css).
 *
 * `advanced` keeps the "Advanced mode" section of the control column open
 * (inverse search, feasibility, scenario comparison); it starts closed so a
 * first visit shows only the basic site and time controls.
 *
 * Cookie format: `clps_prefs=v=2&lang=es&fx=on&adv=0` (URL-encoded). `adv`
 * was added within version 2: a cookie without it reads as closed.
 * Parsing is defensive: unknown or missing fields fall back to defaults, and
 * an unreadable cookie means "not configured yet".
 */

import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/messages';

export const EFFECT_MODES = ['on', 'off'] as const;
export type EffectMode = (typeof EFFECT_MODES)[number];

export interface Preferences {
  readonly locale: Locale;
  readonly effects: EffectMode;
  /** Whether the "Advanced mode" section is open. */
  readonly advanced: boolean;
}

export const COOKIE_NAME = 'clps_prefs';
const COOKIE_VERSION = '2';
/** Version 1 had three effect levels and a separate font switch. */
const LEGACY_COOKIE_VERSION = '1';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const DEFAULT_PREFERENCES: Preferences = { locale: DEFAULT_LOCALE, effects: 'on', advanced: false };

export function isEffectMode(value: unknown): value is EffectMode {
  return typeof value === 'string' && (EFFECT_MODES as readonly string[]).includes(value);
}

export function serializePreferences(preferences: Preferences): string {
  const params = new URLSearchParams({
    v: COOKIE_VERSION,
    lang: preferences.locale,
    fx: preferences.effects,
    adv: preferences.advanced ? '1' : '0',
  });
  return encodeURIComponent(params.toString());
}

/** Maps a version 1 effects level (`full` | `lite` | `off`) to the on/off switch. */
function legacyEffects(value: string | null): EffectMode | null {
  if (value === 'full' || value === 'lite') return 'on';
  if (value === 'off') return 'off';
  return null;
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

  const version = params.get('v');
  if (version !== COOKIE_VERSION && version !== LEGACY_COOKIE_VERSION) return null;

  const locale = params.get('lang');
  const rawEffects = params.get('fx');
  const effects = version === LEGACY_COOKIE_VERSION ? legacyEffects(rawEffects) : rawEffects;
  return {
    locale: isLocale(locale) ? locale : DEFAULT_PREFERENCES.locale,
    effects: isEffectMode(effects) ? effects : DEFAULT_PREFERENCES.effects,
    advanced: params.get('adv') === '1',
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
    // The choice still applies to this visit.
  }
}

export interface DeviceHints {
  readonly prefersReducedMotion: boolean;
  readonly hardwareConcurrency?: number;
  /** `navigator.deviceMemory` in GiB, where the browser exposes it. */
  readonly deviceMemoryGb?: number;
}

/**
 * Suggested first-visit choice: effects off with reduced motion or on modest
 * devices. The language stays the project default (Spanish) and the
 * advanced section starts closed.
 */
export function recommendPreferences(hints: DeviceHints): Preferences {
  const lowEnd =
    (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 4) ||
    (hints.deviceMemoryGb !== undefined && hints.deviceMemoryGb <= 4);
  const effects: EffectMode = hints.prefersReducedMotion || lowEnd ? 'off' : 'on';
  return { locale: DEFAULT_LOCALE, effects, advanced: false };
}

export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    prefersReducedMotion: prefersReducedMotion(),
    hardwareConcurrency: nav.hardwareConcurrency || undefined,
    deviceMemoryGb: nav.deviceMemory,
  };
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}
