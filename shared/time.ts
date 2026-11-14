/**
 * UTC instant parsing and formatting shared by the browser and the server.
 *
 * Accepted input: `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`, ending in `Z`.
 */

export const DEFAULT_UTC = '2026-11-14T12:00:00Z';

/**
 * Product guard on selectable instants: [2000-01-01, 2100-01-01) UTC.
 * This is an application choice, not a Horizons limit. On 2026-11-14 both ends
 * returned the high-precision lunar frame (MEAN_ME) for Nobile Rim 1.
 */
export const SUPPORTED_UTC_RANGE = {
  startInclusive: '2000-01-01T00:00:00Z',
  endExclusive: '2100-01-01T00:00:00Z',
} as const;

const UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?Z$/;

export type UtcParseFailure = 'format' | 'invalid-date' | 'out-of-range';

export type UtcParseResult =
  | { readonly ok: true; readonly instant: Date; readonly iso: string }
  | { readonly ok: false; readonly reason: UtcParseFailure };

export function parseUtcInstant(input: string): UtcParseResult {
  const match = UTC_PATTERN.exec(input);
  if (!match) return { ok: false, reason: 'format' };

  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => (part === undefined ? 0 : Number(part))) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  const millis = Date.UTC(year, month - 1, day, hour, minute, second);
  const instant = new Date(millis);
  // Date.UTC silently rolls over (e.g. Feb 30 -> Mar 2); reject those inputs.
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day ||
    instant.getUTCHours() !== hour ||
    instant.getUTCMinutes() !== minute ||
    instant.getUTCSeconds() !== second
  ) {
    return { ok: false, reason: 'invalid-date' };
  }

  if (
    millis < Date.parse(SUPPORTED_UTC_RANGE.startInclusive) ||
    millis >= Date.parse(SUPPORTED_UTC_RANGE.endExclusive)
  ) {
    return { ok: false, reason: 'out-of-range' };
  }

  return { ok: true, instant, iso: toUtcIsoSeconds(instant) };
}

/** `2026-11-14T12:00:00Z` (seconds precision, no milliseconds). */
export function toUtcIsoSeconds(instant: Date): string {
  return `${instant.toISOString().slice(0, 19)}Z`;
}
