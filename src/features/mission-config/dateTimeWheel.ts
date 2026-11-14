import { SUPPORTED_UTC_RANGE, toUtcIsoSeconds } from '../../../shared/time';
import type { DateTimeFields } from './timeZone';

export const MIN_YEAR = Number(SUPPORTED_UTC_RANGE.startInclusive.slice(0, 4));
export const MAX_YEAR = Number(SUPPORTED_UTC_RANGE.endExclusive.slice(0, 4)) - 1;
export type DatePart = 'day' | 'month' | 'year';
export type TimePart = 'hour' | 'minute';
export type DateTimePart = DatePart | TimePart;
export const DATE_TIME_PARTS: readonly DateTimePart[] = ['day', 'month', 'year', 'hour', 'minute'];

/** Digits each part takes when typed: the year is always four digits, the rest one or two. */
export const PART_DIGITS: Readonly<Record<DateTimePart, number>> = { day: 2, month: 2, year: 4, hour: 2, minute: 2 };

/** Numeric parts of the fields (`YYYY-MM-DD`, `HH:mm`). */
export function fieldParts(fields: DateTimeFields): Record<DateTimePart, number> {
  const [year, month, day] = fields.date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = fields.time.split(':').map(Number) as [number, number];
  return { day, month, year, hour, minute };
}

/** Fields for typed parts, or null when a part is missing or not a number of the expected length. Range and calendar checks are left to `fieldsToUtc`. */
export function typedPartsToFields(parts: Readonly<Record<DateTimePart, string>>): DateTimeFields | null {
  for (const part of DATE_TIME_PARTS) {
    const text = parts[part];
    const digits = PART_DIGITS[part];
    if (!/^\d+$/.test(text) || text.length > digits || (part === 'year' && text.length !== digits)) return null;
  }
  const pad = (part: DateTimePart) => parts[part].padStart(PART_DIGITS[part], '0');
  return { date: `${pad('year')}-${pad('month')}-${pad('day')}`, time: `${pad('hour')}:${pad('minute')}` };
}

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

/** Duration of the roll from one value to another (e.g. after LIVE), ms. */
export const ROLL_MS = 900;

/**
 * Reel position during a roll: it travels straight from `from` to `to`
 * (counting down when the target is smaller, without wrapping), quickly at
 * first and settling on the target. `progress` runs from 0 to 1.
 */
export function rollPosition(from: number, to: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return from + (to - from) * (1 - (1 - t) ** 3);
}

export function stepWheel(value: number, step: number, min: number, max: number, wrap: boolean): number {
  if (!wrap) return Math.max(min, Math.min(max, value + step));
  const count = max - min + 1;
  return min + (((value - min + step) % count) + count) % count;
}
