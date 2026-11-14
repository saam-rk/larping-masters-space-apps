/**
 * Full-screen state of an element (see `FullscreenToggle`): the Fullscreen
 * API where the browser offers it for ordinary elements, otherwise a CSS
 * fallback (`data-fullscreen="fallback"` on the element, Escape leaves it,
 * e.g. on iPhone Safari).
 */

import { useEffect, useState, type RefObject } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function nativeSupported(element: FullscreenElement): boolean {
  return typeof element.requestFullscreen === 'function' || typeof element.webkitRequestFullscreen === 'function';
}

/** Full-screen state of `target`, and a toggle for it. */
export function useFullscreen(target: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const update = () => setNative(target.current !== null && currentFullscreenElement() === target.current);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, [target]);

  // Fallback mode: mark the element for the CSS and leave with Escape.
  useEffect(() => {
    const element = target.current;
    if (!element || !fallback) return;
    element.setAttribute('data-fullscreen', 'fallback');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFallback(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      element.removeAttribute('data-fullscreen');
      document.removeEventListener('keydown', onKey);
    };
  }, [fallback, target]);

  const toggle = () => {
    const element = target.current as FullscreenElement | null;
    if (!element) return;
    if (fallback) {
      setFallback(false);
      return;
    }
    const doc = document as FullscreenDocument;
    if (currentFullscreenElement() === element) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    if (!nativeSupported(element)) {
      setFallback(true);
      return;
    }
    try {
      const request = element.requestFullscreen ? element.requestFullscreen() : element.webkitRequestFullscreen?.();
      // A refused request (e.g. inside a frame without permission) falls back to the CSS mode.
      Promise.resolve(request).catch(() => setFallback(true));
    } catch {
      setFallback(true);
    }
  };

  return { active: native || fallback, toggle };
}
