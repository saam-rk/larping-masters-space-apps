/**
 * "Jump to the new coordinates" transition: when an update starts, the
 * content fades out while the stars stream past; it fades back in once the
 * request finishes and a minimum travel time has passed.
 *
 * - full effects: star streaks + content fade.
 * - lite: content fade only.
 * - off: nothing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EffectLevel } from '../../preferences/preferences';
import { setWarp } from './motion';

const MIN_TRAVEL_MS = 1100;
const LITE_FADE_MS = 350;

export function useWarp(loading: boolean, level: EffectLevel) {
  const [warping, setWarping] = useState(false);
  const startedAt = useRef(0);

  const start = useCallback(() => {
    if (level === 'off') return;
    startedAt.current = performance.now();
    setWarping(true);
    if (level === 'full') setWarp(true);
  }, [level]);

  useEffect(() => {
    if (!warping || loading) return;
    const minimum = level === 'full' ? MIN_TRAVEL_MS : LITE_FADE_MS;
    const remaining = Math.max(0, minimum - (performance.now() - startedAt.current));
    const timer = window.setTimeout(() => {
      setWarping(false);
      setWarp(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [warping, loading, level]);

  // Never leave the stars streaking if the component goes away mid-warp.
  useEffect(() => () => setWarp(false), []);

  return { warping, start };
}
