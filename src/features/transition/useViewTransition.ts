/**
 * First/third-person switch transition. With hyperspace streaks enabled it is
 * a short jump: the scene fades out, the view is swapped while hidden, and it
 * fades back in. Going to first person the stars rush in (diving toward the
 * site); going to third person they run in reverse (pulling back). It is
 * shorter than the coordinate update jump: only the view changes, no data is
 * requested, and the models are cached after their first load.
 *
 * Without streaks (low performance or reduced motion), or while an update
 * jump already hides the scene, the view switches at once.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewMode } from '../scene/viewMode';

/** How the hyperspace layer and the scene fade look for the current (or last) jump. */
export interface WarpStyle {
  readonly kind: 'update' | 'switch';
  readonly reverse: boolean;
  /** Acceleration multiplier for the streaks. */
  readonly tempo: number;
}

export const UPDATE_WARP: WarpStyle = { kind: 'update', reverse: false, tempo: 1 };

/** Total time the switch jump is held at full speed or building up. */
const SWITCH_MS = 600;
/** When the view is swapped: after the scene has faded out (see `.scene-stage[data-warp='switch']`). */
const SWAP_MS = 200;
const SWITCH_TEMPO = 2.4;

interface ViewTransitionOptions {
  /** Displayed view and its setter (from `useViewMode`). */
  readonly mode: ViewMode;
  readonly setMode: (mode: ViewMode) => void;
  /** Streaks are shown (full effects, no reduced motion). */
  readonly streaks: boolean;
  /** An update jump or data load is in progress. */
  readonly busy: boolean;
}

export function useViewTransition({ mode, setMode, streaks, busy }: ViewTransitionOptions) {
  const [target, setTarget] = useState<ViewMode | null>(null);
  const [warp, setWarp] = useState<WarpStyle>(UPDATE_WARP);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const request = useCallback(
    (next: ViewMode) => {
      if (next === (target ?? mode)) return;
      clearTimers();
      if (!streaks || busy) {
        setTarget(null);
        setMode(next);
        return;
      }
      setWarp({ kind: 'switch', reverse: next === 'third-person', tempo: SWITCH_TEMPO });
      setTarget(next);
      timers.current.push(
        window.setTimeout(() => setMode(next), SWAP_MS),
        window.setTimeout(() => setTarget(null), SWITCH_MS),
      );
    },
    [target, mode, streaks, busy, clearTimers, setMode],
  );

  /** An update jump uses the default forward streaks and fade. */
  const resetWarp = useCallback(() => setWarp(UPDATE_WARP), []);

  return {
    /** The switch jump is running. */
    active: target !== null,
    /** View the toggle should show as selected. */
    selected: target ?? mode,
    warp,
    request,
    resetWarp,
  };
}
