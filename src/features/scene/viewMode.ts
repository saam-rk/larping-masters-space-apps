/**
 * Which 3D view the local horizon shows. Kept free of three.js imports so the
 * toggle can live outside the lazily loaded scene chunk.
 */

import { useState } from 'react';
import type { ObserverSiteId } from '../../../shared/sites';

export const VIEW_MODES = ['first-person', 'third-person'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/** Sites with a terrain model for the first-person view. */
const FIRST_PERSON_SITES: ReadonlySet<ObserverSiteId> = new Set(['nobile-rim-2']);

export function hasFirstPersonView(siteId: ObserverSiteId): boolean {
  return FIRST_PERSON_SITES.has(siteId);
}

/**
 * View chosen by the user, falling back to third person where there is no
 * terrain. Showing a site with terrain switches back to first person.
 */
export function useViewMode(siteId: ObserverSiteId) {
  const [chosen, setChosen] = useState<ViewMode>('first-person');
  const [shownSite, setShownSite] = useState(siteId);
  if (shownSite !== siteId) {
    // Adjust state while rendering when the displayed site changes (React pattern for derived resets).
    setShownSite(siteId);
    if (hasFirstPersonView(siteId)) setChosen('first-person');
  }
  const firstPersonAvailable = hasFirstPersonView(siteId);
  const mode: ViewMode = firstPersonAvailable ? chosen : 'third-person';
  return { mode, firstPersonAvailable, setMode: setChosen };
}
