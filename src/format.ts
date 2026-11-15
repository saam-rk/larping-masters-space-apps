/** Locale-aware display formatting for coordinates, angles and instants. */

import type { Locale, Messages } from './i18n/messages';

export function formatDegrees(value: number | null, locale: Locale, fractionDigits = 4): string | null {
  if (value === null) return null;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)}°`;
}

/** `85.4381° S, 37.36667° E` using the published precision of the coordinates. */
export function formatCoordinates(
  latitudeDeg: number,
  longitudeEastDeg: number,
  locale: Locale,
  hemisphere: Messages['hemisphere'],
): string {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 5 });
  const lat = `${number.format(Math.abs(latitudeDeg))}° ${latitudeDeg < 0 ? hemisphere.south : hemisphere.north}`;
  const lon = `${number.format(Math.abs(longitudeEastDeg))}° ${longitudeEastDeg < 0 ? hemisphere.west : hemisphere.east}`;
  return `${lat}, ${lon}`;
}

/** `2026-11-14 12:00:00 UTC` regardless of locale, to avoid time-zone confusion. */
export function formatUtc(iso: string): string {
  return `${iso.slice(0, 19).replace('T', ' ')} UTC`;
}

/**
 * Signed duration in days, hours, minutes and seconds, e.g. `+5 d 15 h 14 min 15 s`
 * or `-2 h 0 min 3 s`; leading zero units are left out.
 */
export function formatOffset(totalSeconds: number): string {
  if (totalSeconds === 0) return '0 s';
  const sign = totalSeconds < 0 ? '−' : '+';
  let rest = Math.abs(Math.round(totalSeconds));
  const parts: string[] = [];
  for (const [unit, size] of [['d', 86_400], ['h', 3600], ['min', 60], ['s', 1]] as const) {
    const amount = Math.floor(rest / size);
    rest -= amount * size;
    if (amount > 0 || parts.length > 0) parts.push(`${amount} ${unit}`);
  }
  return `${sign}${parts.join(' ')}`;
}

/** Angle with one decimal for the 3D angle guides, e.g. `123.4°`; `signed` adds `+`/`−` (differences). */
export function formatAngle(value: number, locale: Locale, signed = false): string {
  const text = formatDegrees(Math.abs(value), locale, 1)!;
  if (value < 0 && text !== formatDegrees(0, locale, 1)) return `−${text}`;
  return signed && value > 0 && text !== formatDegrees(0, locale, 1) ? `+${text}` : text;
}
