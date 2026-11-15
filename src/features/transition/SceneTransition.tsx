import { Suspense, useCallback, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Hyperspace } from './Hyperspace';
import { SceneLoading } from './SceneLoading';
import { SceneLoadingContext } from './sceneLoadingContext';
import type { WarpStyle } from './useViewTransition';

/** Keep a single jump running until every visible scene boundary has finished loading. */
export function SceneTransition({ children, jumping, streaks, warp, playing }: {
  children: ReactNode;
  jumping: boolean;
  streaks: boolean;
  warp: WarpStyle;
  playing: boolean;
}) {
  const [pending, setPending] = useState(0);
  const register = useCallback(() => {
    setPending((count) => count + 1);
    return () => setPending((count) => count - 1);
  }, []);
  const loading = pending > 0;
  // Model loading uses the jump even in low-performance mode; respect reduced motion.
  const animate = !prefersReducedMotion();

  return (
    <div className="scene-stage" data-jumping={jumping || loading} data-loading={loading}
      data-warp={warp.kind} data-player={playing} aria-busy={loading}>
      <SceneLoadingContext value={register}>
        <Suspense fallback={<SceneLoading />}>{children}</Suspense>
      </SceneLoadingContext>
      {animate && <Hyperspace active={loading || (streaks && jumping)} reverse={warp.reverse} tempo={warp.tempo} />}
    </div>
  );
}
