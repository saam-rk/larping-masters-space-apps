/**
 * What the Apollo 11 surface reenactment shows at a given instant. Kept free
 * of three.js imports.
 *
 * - `before-landing` (before the touchdown): empty terrain, no Eagle, crew or flag.
 * - `landed` (touchdown until the flag is erected): Eagle and the three figures;
 *   no flag yet, and the figure that later plants it stands still.
 * - `flag-up` (flag erected until the lunar liftoff): the full tableau.
 * - `departed` (from the liftoff on): only the flag remains in this
 *   illustrative scene. Historically the Eagle's descent stage also stayed on
 *   the surface; it is left out here by product choice.
 *
 * Instants in `shared/time.ts`, with their sources.
 */

import { APOLLO_11_FLAG_UTC, APOLLO_11_LANDING_UTC, APOLLO_11_LIFTOFF_UTC } from '../../../shared/time';

export type ApolloScenePhase = 'before-landing' | 'landed' | 'flag-up' | 'departed';

export function apolloScenePhase(utc: string): ApolloScenePhase {
  const instant = Date.parse(utc);
  if (!Number.isFinite(instant) || instant < Date.parse(APOLLO_11_LANDING_UTC)) return 'before-landing';
  if (instant < Date.parse(APOLLO_11_FLAG_UTC)) return 'landed';
  if (instant < Date.parse(APOLLO_11_LIFTOFF_UTC)) return 'flag-up';
  return 'departed';
}
