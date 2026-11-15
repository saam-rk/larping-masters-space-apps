/**
 * UTC instant parsing and formatting shared by the browser and the server.
 *
 * Accepted input: `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`, ending in `Z`.
 */

/** NASA/NSSDCA Apollo 11 mission catalogue touchdown time, in UTC. */
export const APOLLO_11_LANDING_UTC = '1969-07-20T20:17:40Z';

/**
 * Apollo 11 US flag erected, in UTC: 110:09:43 ground elapsed time, when
 * Mission Control reports "They've got the flag up now" in the Apollo Lunar
 * Surface Journal, "One Small Step" (https://apollojournals.org/alsj/a11/a11.step.html).
 * Converted with the same journal's first-contact time, 109:24:15 GET =
 * 1969-07-21 02:56:15 UTC (from the Mission Report). Setting up the flag began
 * a few minutes earlier (about 110:05 GET); the time is rounded to the second
 * and journal timings can differ by seconds.
 */
export const APOLLO_11_FLAG_UTC = '1969-07-21T03:41:43Z';

/**
 * Apollo 11 lunar liftoff (ascent stage), in UTC: 124:22:00 ground elapsed
 * time in the Apollo Lunar Surface Journal, "The Return to Orbit"
 * (https://apollojournals.org/alsj/a11/a11.launch.html), converted with the
 * same GET origin as `APOLLO_11_FLAG_UTC` (1969-07-16 13:32:00 UTC).
 */
export const APOLLO_11_LIFTOFF_UTC = '1969-07-21T17:54:00Z';

/**
 * Product guard on selectable instants: [1969-01-01, 2100-01-01) UTC.
 * This includes the Apollo 11 landing year and is not a Horizons limit.
 */
export const SUPPORTED_UTC_RANGE = {
  startInclusive: '1969-01-01T00:00:00Z',
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

/**
 * Starting instant of the page: the current time, whole seconds. Falls back to
 * the Apollo 11 touchdown when the clock is outside `SUPPORTED_UTC_RANGE`.
 */
export function currentUtc(now: Date = new Date()): string {
  const iso = toUtcIsoSeconds(now);
  return parseUtcInstant(iso).ok ? iso : APOLLO_11_LANDING_UTC;
}

/** `2026-11-14T12:00:00Z` (seconds precision, no milliseconds). */
export function toUtcIsoSeconds(instant: Date): string {
  return `${instant.toISOString().slice(0, 19)}Z`;
}
