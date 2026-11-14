/**
 * "Jump to the new coordinates" transition. It starts when the user presses
 * "Update view" and ends once the request has finished and a minimum time
 * has passed, so a fast (cached) answer still reads as a deliberate jump.
 *
 * While it runs, the local horizon box shows the hyperspace streaks (full
 * effects) or dims its scene (low performance), and the data box scrambles
 * its values. No box is removed from the layout.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Long enough for the streaks to build up and settle. */
const MIN_JUMP_MS = 1100;
/** Low performance or reduced motion: just enough to see the values change. */
const MIN_PLAIN_MS = 450;

export function useUpdateTransition(loading: boolean, streaks: boolean) {
  const [active, setActive] = useState(false);
  const startedAt = useRef(0);
  const minimum = useRef(MIN_PLAIN_MS);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    minimum.current = streaks ? MIN_JUMP_MS : MIN_PLAIN_MS;
    setActive(true);
  }, [streaks]);

  useEffect(() => {
    if (!active || loading) return;
    const remaining = Math.max(0, minimum.current - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => setActive(false), remaining);
    return () => window.clearTimeout(timer);
  }, [active, loading]);

  return { active, start };
}
