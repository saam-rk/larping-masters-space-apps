/** Locale-aware number formatting for the mission screening values. */

import type { Locale } from '../../i18n/messages';

export function formatNumber(value: number, locale: Locale, fractionDigits: number, signed = false): string {
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value);
  // Typographic minus, as in the rest of the interface.
  return text.replace('-', '−');
}

/** `null` stays `null`, so the caller shows its "no value" label instead of a zero. */
export function withUnit(value: number | null, locale: Locale, fractionDigits: number, unit: string, signed = false): string | null {
  return value === null ? null : `${formatNumber(value, locale, fractionDigits, signed)} ${unit}`;
}

/** Power with a precision that suits its size: `0 W`, `8,4 W`, `762 W`, `12,3 kW`. */
export function formatPower(watts: number | null, locale: Locale): string | null {
  if (watts === null) return null;
  if (watts === 0) return '0 W';
  if (watts >= 10_000) return `${formatNumber(watts / 1000, locale, 1)} kW`;
  return `${formatNumber(watts, locale, watts < 10 ? 1 : 0)} W`;
}

export function formatShare(fraction: number | null, locale: Locale): string | null {
  return fraction === null ? null : new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}
