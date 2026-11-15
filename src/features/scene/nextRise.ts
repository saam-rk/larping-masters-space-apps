/**
 * Next rise of the Sun or the Earth at a site, at or after an instant, for the
 * horizon playback interval ("start at the rise").
 *
 * Same definition and method as the set/rise countdown (`horizonEvents.ts`):
 * a body is up while its upper limb is on or above the reference horizon
 * (center elevation above minus its apparent radius); the crossing is found
 * with the inverse search (`/api/sky-search`, JPL Horizons, 1 s resolution).
 * The radius is the one at the given instant, read from `/api/ephemeris`.
 *
 * When the body is up at the instant, its set is searched first and the rise
 * after that set; when it is down, the rise directly. Requests run one after
 * another (JPL's serial-request policy). Terrain is not modeled.
 */

import type { BodyId } from '../../../shared/ephemeris';
import { fetchEphemeris, type EphemerisSelection } from '../../api/ephemerisClient';
import { fetchSkySearch } from '../../api/skySearchClient';
import type { ClientErrorKey } from '../../i18n/messages';
import { placeBodies } from './bodies';
import { countdownConditions, countdownOutcome, countdownPlan, type CountdownPlan } from './horizonEvents';

export type NextRise =
  | { readonly status: 'found'; readonly utc: string }
  /** The body never goes below the threshold at this site: it has no rise. */
  | { readonly status: 'always-up' }
  /** The body never comes above the threshold at this site. */
  | { readonly status: 'always-down' }
  /** No rise within the searched span, or the search budget ran out. */
  | { readonly status: 'not-found' }
  | { readonly status: 'error'; readonly key: ClientErrorKey };

/** First instant matching `plan` at or after `utc`, or a non-found result. */
async function search(selection: EphemerisSelection, plan: CountdownPlan, signal?: AbortSignal): Promise<NextRise> {
  const result = await fetchSkySearch({ selection, direction: 'after', conditions: countdownConditions(plan) }, signal);
  if (!result.ok) return { status: 'error', key: result.error.key };
  const outcome = countdownOutcome(result.data);
  return outcome.status === 'found' ? { status: 'found', utc: outcome.utc } : { status: 'not-found' };
}

export async function findNextRise(selection: EphemerisSelection, body: BodyId, signal?: AbortSignal): Promise<NextRise> {
  const shown = await fetchEphemeris(selection, signal);
  if (!shown.ok) return { status: 'error', key: shown.error.key };
  const placed = placeBodies(shown.data).placed.find((candidate) => candidate.body === body);
  if (!placed) return { status: 'error', key: 'UPSTREAM_FORMAT' };

  const plan = countdownPlan(placed, shown.data.site);
  if (plan.event === 'rise') {
    return plan.never ? { status: 'always-down' } : search(selection, plan, signal);
  }
  if (plan.never) return { status: 'always-up' };

  // Up now: find the set, then the rise after it with the same threshold,
  // from one minute later so a value right on the threshold is not read as the rise.
  const set = await search(selection, plan, signal);
  if (set.status !== 'found') return set;
  const rise: CountdownPlan = { body, event: 'rise', afterEvent: { min: plan.afterEvent.max, max: 90 }, never: false };
  const afterSet = `${new Date(Date.parse(set.utc) + 60_000).toISOString().slice(0, 19)}Z`;
  return search({ ...selection, utc: afterSet }, rise, signal);
}

/** The first whole minute at or after `utc` (the interval wheels have minute precision). */
export function ceilToMinute(utc: string): string {
  const ms = Math.ceil(Date.parse(utc) / 60_000) * 60_000;
  return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}
