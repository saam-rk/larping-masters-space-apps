/**
 * Time left until the Sun or the Earth sets (or rises, when it is below the
 * horizon at the shown instant), seen from the site and instant of a result.
 * Kept free of React and three.js.
 *
 * Definition, the same as the presence column of the results panel (Horizons
 * presence markers, see `shared/presence.ts`): a body is up while its upper
 * limb is on or above the reference horizon, i.e. while its center elevation
 * is above minus its apparent angular radius. Terrain is not modeled.
 *
 * Method: an inverse search (`/api/sky-search`, JPL Horizons, 1 s resolution,
 * 4-decimal comparison) for the first instant at or after the shown one at
 * which the center elevation is on the other side of that threshold. The
 * threshold is rounded outward to the search's 4 decimals (at most 0.0001°).
 * When the feasibility bounds (`shared/skyFeasibility.ts`) show the body can
 * never cross the threshold at the site, no search is made.
 */

import { possibleSky, type SiteCoordinates } from '../../../shared/skyFeasibility';
import { SKY_SEARCH_DECIMALS, type AngleRange, type SkyConditions, type SkySearchResponse } from '../../../shared/skySearch';
import type { BodyId } from '../../../shared/ephemeris';
import type { SceneBody } from './bodies';

export type HorizonEvent = 'set' | 'rise';

const SCALE = 10 ** SKY_SEARCH_DECIMALS;

/** Center elevation (deg) at which the upper limb touches the reference horizon, rounded outward to 4 decimals. */
export function horizonThresholdDeg(angularDiameterDeg: number): number {
  return -Math.ceil((angularDiameterDeg / 2) * SCALE - 1e-9) / SCALE + 0;
}

export interface CountdownPlan {
  readonly body: BodyId;
  /** `set` while the body is up at the shown instant, `rise` while it is down. */
  readonly event: HorizonEvent;
  /** Elevation range that holds once the event has happened. */
  readonly afterEvent: AngleRange;
  /** True when the body can never cross the threshold at this site (no search needed). */
  readonly never: boolean;
}

export function countdownPlan(body: SceneBody, site: SiteCoordinates): CountdownPlan {
  const threshold = horizonThresholdDeg(body.angularDiameterDeg);
  const up = body.elevationDeg > threshold;
  const possible = possibleSky(site)[body.body].elevation;
  return up
    ? { body: body.body, event: 'set', afterEvent: { min: -90, max: threshold }, never: possible.min > threshold }
    : { body: body.body, event: 'rise', afterEvent: { min: threshold, max: 90 }, never: possible.max < threshold };
}

/** Inverse-search conditions for a plan: the body's elevation only. */
export function countdownConditions(plan: CountdownPlan): SkyConditions {
  return plan.body === 'sun' ? { sunElevation: plan.afterEvent } : { earthElevation: plan.afterEvent };
}

export type CountdownOutcome =
  /** `seconds` from the shown instant; `complete` false: the event may come earlier (search budget ran out). */
  | { readonly status: 'found'; readonly utc: string; readonly seconds: number; readonly complete: boolean }
  /** Not within `days` days of the shown instant (the searched span). */
  | { readonly status: 'beyond'; readonly days: number }
  /** The search ran out of budget before finding it. */
  | { readonly status: 'budget' };

export function countdownOutcome(response: SkySearchResponse): CountdownOutcome {
  const { outcome } = response;
  if (outcome.status === 'found') {
    return { status: 'found', utc: outcome.match.utc, seconds: outcome.match.offsetSeconds, complete: outcome.complete };
  }
  if (outcome.reason === 'budget') return { status: 'budget' };
  const days = Math.floor((Date.parse(response.searched.endUtc) - Date.parse(response.referenceUtc)) / 86_400_000);
  return { status: 'beyond', days: Math.max(0, days) };
}
