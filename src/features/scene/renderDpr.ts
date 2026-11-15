/**
 * Pixel ratio of the 3D drawing buffer.
 *
 * Browser zoom changes `window.devicePixelRatio` (CSS pixels per device
 * pixel): zooming out to 50 % on a standard display gives 0.5, zooming in to
 * 200 % gives 2. The buffer follows the device pixels the canvas really
 * covers, so zooming does not change its cost much:
 *
 * - Below 1 it is not raised to 1. A floor of 1 drew 4× the device pixels at
 *   50 % zoom (9× at 33 %), which made the page lag when zoomed out.
 * - Above `MAX_RENDER_DPR` it is capped, as before (sharper costs GPU time for
 *   little visible gain).
 * - A large canvas (full screen on a high-density display) is also kept under
 *   `MAX_RENDER_PIXELS`, in steps of `BUDGET_STEP` so small size changes keep
 *   the same ratio and do not reallocate the buffer.
 */

import { useLayoutEffect, useState, type RefObject } from 'react';

/** Upper bound on the ratio. */
export const MAX_RENDER_DPR = 1.5;
/** Lower bound: Chromium's smallest zoom (25 %) on a standard display. */
export const MIN_RENDER_DPR = 0.25;
/** Drawing buffer budget, device pixels (a 2560 × 1440 screen). */
export const MAX_RENDER_PIXELS = 2560 * 1440;
/** Step of the budget-limited ratio. */
const BUDGET_STEP = 1 / 8;

/** Ratio for a canvas of `cssWidth` × `cssHeight` CSS pixels at `devicePixelRatio`. */
export function renderDpr(devicePixelRatio: number, cssWidth: number, cssHeight: number): number {
  const device = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  let ratio = Math.min(device, MAX_RENDER_DPR);
  const area = cssWidth * cssHeight;
  if (Number.isFinite(area) && area > 0) {
    const budget = Math.sqrt(MAX_RENDER_PIXELS / area);
    if (budget < ratio) ratio = Math.floor(budget / BUDGET_STEP) * BUDGET_STEP;
  }
  return Math.max(MIN_RENDER_DPR, ratio);
}

function currentDevicePixelRatio(): number {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
}

/**
 * Calls `onChange` whenever `window.devicePixelRatio` changes (browser zoom or
 * moving to another display). A resolution query only matches the current
 * ratio, so it is re-created after every change. Returns the unsubscribe function.
 */
export function watchDevicePixelRatio(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  let query: MediaQueryList | null = null;
  const listen = () => {
    try {
      query = window.matchMedia(`(resolution: ${currentDevicePixelRatio()}dppx)`);
      query.addEventListener?.('change', handleChange);
    } catch {
      query = null;
    }
  };
  const unlisten = () => {
    query?.removeEventListener?.('change', handleChange);
    query = null;
  };
  function handleChange() {
    unlisten();
    listen();
    onChange();
  }
  listen();
  return unlisten;
}

/**
 * `renderDpr` for the element in `target`, kept current as the element is
 * resized and the device pixel ratio changes. Only a different ratio updates
 * the state, so ordinary resizes do not re-render the caller.
 */
export function useRenderDpr(target: RefObject<HTMLElement | null>): number {
  const [dpr, setDpr] = useState(() => renderDpr(currentDevicePixelRatio(), 0, 0));

  useLayoutEffect(() => {
    const element = target.current;
    let width = 0;
    let height = 0;
    const update = () => setDpr(renderDpr(currentDevicePixelRatio(), width, height));
    const measure = () => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    };

    measure();
    update();
    const unwatch = watchDevicePixelRatio(update);
    let observer: ResizeObserver | null = null;
    if (element && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const box = entries[entries.length - 1]?.contentRect;
        if (!box) return;
        width = box.width;
        height = box.height;
        update();
      });
      observer.observe(element);
    }
    return () => {
      unwatch();
      observer?.disconnect();
    };
  }, [target]);

  return dpr;
}
