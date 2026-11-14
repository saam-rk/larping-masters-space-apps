import { SUPPORTED_UTC_RANGE, toUtcIsoSeconds } from '../../../shared/time';
import type { DateTimeFields } from './timeZone';

export const MIN_YEAR = Number(SUPPORTED_UTC_RANGE.startInclusive.slice(0, 4));
export const MAX_YEAR = Number(SUPPORTED_UTC_RANGE.endExclusive.slice(0, 4)) - 1;
export type DatePart = 'day' | 'month' | 'year';

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Month/year changes retain the day where possible, clamping to the last valid day. */
export function changeDatePart(date: string, part: DatePart, value: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const nextYear = part === 'year' ? value : year;
  const nextMonth = part === 'month' ? value : month;
  const nextDay = Math.min(part === 'day' ? value : day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
}

/** Capture the device clock at minute precision before converting it to display fields. */
export function currentUtcMinute(now = new Date()): string {
  return toUtcIsoSeconds(new Date(Math.floor(now.getTime() / 60_000) * 60_000));
}

export function changeTimePart(fields: DateTimeFields, index: 0 | 1, value: number): string {
  const parts = fields.time.split(':');
  parts[index] = String(value).padStart(2, '0');
  return parts.join(':');
}

export function stepWheel(value: number, step: number, min: number, max: number, wrap: boolean): number {
  if (!wrap) return Math.max(min, Math.min(max, value + step));
  const count = max - min + 1;
  return min + (((value - min + step) % count) + count) % count;
}
