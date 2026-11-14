/**
 * Date and time fields in UTC or in the browser's local time zone, and the
 * conversion to the UTC instant the calculation uses.
 *
 * The request always carries UTC (`shared/time.ts`); the local mode is only a
 * way to type and read that instant. Local conversions use the browser's own
 * time zone database, so daylight-saving rules are not reimplemented here.
 */

import { parseUtcInstant, toUtcIsoSeconds, type UtcParseFailure, type UtcParseResult } from '../../../shared/time';

export const TIME_ZONE_MODES = ['utc', 'local'] as const;
export type TimeZoneMode = (typeof TIME_ZONE_MODES)[number];

/** Values of `<input type="date">` (`YYYY-MM-DD`) and `<input type="time">` (`HH:mm`). */
export interface DateTimeFields {
  readonly date: string;
  readonly time: string;
}

export type ZonedParseResult =
  | UtcParseResult
  /** The local time falls in a daylight-saving gap (e.g. 02:30 on the spring-forward day). */
  | { readonly ok: false; readonly reason: UtcParseFailure | 'nonexistent-local-time' };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** Fields (in the given zone) for a UTC instant such as `2026-11-14T12:00:00Z`. */
export function utcToFields(utc: string, mode: TimeZoneMode): DateTimeFields {
  if (mode === 'utc') return { date: utc.slice(0, 10), time: utc.slice(11, 16) };
  const instant = new Date(utc);
  return {
    date: `${pad(instant.getFullYear(), 4)}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}`,
  };
}

/**
 * The UTC instant for fields typed in the given zone, with the same validation
 * as `parseUtcInstant` (calendar dates, 2000-2099) plus the local-only case of
 * a time that does not exist. A local time that happens twice (clocks going
 * back) resolves to the first occurrence, as `Date` does, unless `existingUtc`
 * already represents the unchanged fields. Preserving that instant keeps zone
 * switches reversible even during the second occurrence of a repeated hour.
 */
export function fieldsToUtc(fields: DateTimeFields, mode: TimeZoneMode, existingUtc?: string): ZonedParseResult {
  if (mode === 'utc') return parseUtcInstant(`${fields.date}T${fields.time}:00Z`);

  const date = DATE_PATTERN.exec(fields.date);
  const time = TIME_PATTERN.exec(fields.time);
  if (!date || !time) return { ok: false, reason: 'format' };
  const [year, month, day] = [Number(date[1]), Number(date[2]), Number(date[3])];
  const [hour, minute] = [Number(time[1]), Number(time[2])];

  // Reject calendar dates that do not exist (Feb 30) before the local conversion.
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day); // Date.UTC would map years 0-99 to 1900-1999.
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
    return { ok: false, reason: 'invalid-date' };
  }
  if (hour > 23 || minute > 59) return { ok: false, reason: 'invalid-date' };

  if (existingUtc !== undefined) {
    const existing = parseUtcInstant(existingUtc);
    if (existing.ok) {
      const previous = utcToFields(existing.iso, mode);
      if (previous.date === fields.date && previous.time === fields.time) return existing;
    }
  }

  // setFullYear (unlike the Date constructor) does not map years 0-99 to 1900-1999.
  const local = new Date(2000, 0, 1, 0, 0, 0, 0);
  local.setFullYear(year, month - 1, day);
  local.setHours(hour, minute, 0, 0);
  if (local.getHours() !== hour || local.getMinutes() !== minute || local.getDate() !== day) {
    return { ok: false, reason: 'nonexistent-local-time' };
  }
  if (Number.isNaN(local.getTime())) return { ok: false, reason: 'invalid-date' };

  return parseUtcInstant(toUtcIsoSeconds(local));
}

/** `UTC+01:00`, `UTC-06:00`; `minutesEast` is positive east of Greenwich. */
export function formatUtcOffset(minutesEast: number): string {
  const sign = minutesEast < 0 ? '-' : '+';
  const total = Math.abs(minutesEast);
  return `UTC${sign}${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Offset of the browser's zone at a UTC instant (it changes with daylight saving). */
export function localOffsetLabel(utc: string): string {
  return formatUtcOffset(-new Date(utc).getTimezoneOffset());
}

/** IANA identifier of the browser's time zone (e.g. `Europe/Madrid`), or `null` when it is not exposed. */
export function localZoneId(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** `2026-11-14 12:00`, for showing a UTC instant next to a local time. */
export function formatUtcMinute(utcIso: string): string {
  return `${utcIso.slice(0, 10)} ${utcIso.slice(11, 16)}`;
}
