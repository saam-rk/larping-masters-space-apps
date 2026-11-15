/**
 * Marks the page as "resizing" while the viewport changes, so the animated
 * CRT overlay can pause until it settles. The curved-glass filter stays on;
 * CrtCurvature updates its map before the next paint instead of waiting here.
 *
 * Browser zoom and dragging the window edge re-layout and repaint the whole
 * page. While `data-resizing="on"` is set on the root, CSS pauses the overlay
 * animations until the viewport has been still for `RESIZE_IDLE_MS`.
 *
 * Work that only needs the final size (the star canvas) subscribes with
 * `onViewportSettled`, using a shorter delay so it finishes before animations
 * resume.
 */

/** How long the viewport must be still before the page counts as settled, ms. */
export const RESIZE_IDLE_MS = 220;

/** Delay for work that has to finish before the flag is cleared, ms. */
export const SETTLE_WORK_MS = 100;

/**
 * Sets `data-resizing="on"` on `root` while `target` keeps firing `resize`
 * events and clears it `idleMs` after the last one. Returns a cleanup function.
 */
export function installResizeActivity(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
  root: HTMLElement = document.documentElement,
  idleMs: number = RESIZE_IDLE_MS,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const settle = () => {
    timer = null;
    delete root.dataset.resizing;
  };
  const onResize = () => {
    root.dataset.resizing = 'on';
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(settle, idleMs);
  };

  target.addEventListener('resize', onResize);
  return () => {
    target.removeEventListener('resize', onResize);
    if (timer !== null) clearTimeout(timer);
    delete root.dataset.resizing;
  };
}

/**
 * Calls `callback` once the viewport has stopped changing for `delayMs` after
 * a `resize` burst (not on subscription). Returns a cleanup function that also
 * cancels a pending call.
 */
export function onViewportSettled(
  callback: () => void,
  delayMs: number = SETTLE_WORK_MS,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delayMs);
  };

  target.addEventListener('resize', onResize);
  return () => {
    target.removeEventListener('resize', onResize);
    if (timer !== null) clearTimeout(timer);
  };
}
