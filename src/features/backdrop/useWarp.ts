/**
 * "Jump to the new coordinates" transition: when an update starts, the
 * content fades out while the stars stream past; it fades back in once the
 * request finishes and a minimum travel time has passed.
 *
 * - effects on: star streaks + content fade (fade only with reduced motion).
 * - effects off: nothing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../preferences/preferences';
import { setWarp } from './motion';

const MIN_TRAVEL_MS = 1100;
const FADE_ONLY_MS = 350;

export function useWarp(loading: boolean, enabled: boolean) {
  const [warping, setWarping] = useState(false);
  const streaks = useRef(false);
  const startedAt = useRef(0);

  const start = useCallback(() => {
    if (!enabled) return;
    startedAt.current = performance.now();
    streaks.current = !prefersReducedMotion();
    setWarping(true);
    if (streaks.current) setWarp(true);
  }, [enabled]);

  useEffect(() => {
    if (!warping || loading) return;
    const minimum = streaks.current ? MIN_TRAVEL_MS : FADE_ONLY_MS;
    const remaining = Math.max(0, minimum - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => {
      setWarping(false);
      setWarp(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [warping, loading]);

  // Turning effects off mid-warp stops the streaks at once; the fade state
  // is hidden below and clears itself when the request ends.
  useEffect(() => {
    if (!enabled) setWarp(false);
  }, [enabled]);

  // Never leave the stars streaking if the component goes away mid-warp.
  useEffect(() => () => setWarp(false), []);

  return { warping: warping && enabled, start };
}
