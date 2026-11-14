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
