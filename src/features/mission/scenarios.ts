/** Scenario limits and the time shifts offered when adding one (see `ComparisonPanel`). */

import { parseUtcInstant, toUtcIsoSeconds } from '../../../shared/time';

export const MAX_SCENARIOS = 4;

/** Time shifts offered when adding the current selection; ½ mean synodic month = 29.530589 d / 2. */
export const SCENARIO_OFFSETS = [
  { id: 'none', minutes: 0 },
  { id: 'day', minutes: 1440 },
  { id: 'week', minutes: 7 * 1440 },
  { id: 'halfMonth', minutes: Math.round((29.530589 / 2) * 1440) },
] as const;
export type ScenarioOffset = (typeof SCENARIO_OFFSETS)[number]['id'];

/** `utc` moved by `minutes`, or `null` when the result leaves the supported range. */
export function shiftedUtc(utc: string, minutes: number): string | null {
  const start = parseUtcInstant(utc);
  if (!start.ok) return null;
  const shifted = toUtcIsoSeconds(new Date(start.instant.getTime() + minutes * 60_000));
  return parseUtcInstant(shifted).ok ? shifted : null;
}
