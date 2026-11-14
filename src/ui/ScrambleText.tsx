/**
 * Text that turns into random characters while `active` (a query is running)
 * and decodes back, left to right, into its final value when it ends.
 *
 * All instances share one timer, and the scrambled characters are written
 * straight to an `aria-hidden` span (no React render per tick). Assistive
 * technology only ever reads the real value from a visually hidden copy.
 * With "prefers-reduced-motion" the placeholder is static.
 */

import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../preferences/preferences';
import { scramble } from './scramble';

const TICK_MS = 55;
/** Time to decode the final value once the query ends. */
const RESOLVE_MS = 420;

type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let timer: number | null = null;

function subscribe(tick: Tick): () => void {
  ticks.add(tick);
  if (timer === null) {
    timer = window.setInterval(() => {
      const now = performance.now();
      ticks.forEach((callback) => callback(now));
    }, TICK_MS);
  }
  return () => {
    ticks.delete(tick);
    if (ticks.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

interface ScrambleTextProps {
  readonly text: string;
  readonly active: boolean;
  readonly className?: string;
}

export function ScrambleText({ text, active, className }: ScrambleTextProps) {
  const visualRef = useRef<HTMLSpanElement>(null);
  const wasActive = useRef(false);

  useLayoutEffect(() => {
    const element = visualRef.current;
    if (!element) return;

    if (active) {
      wasActive.current = true;
      element.textContent = scramble(text);
      if (prefersReducedMotion()) return;
      return subscribe(() => {
        element.textContent = scramble(text);
      });
    }

    if (!wasActive.current || prefersReducedMotion()) {
      element.textContent = text;
      wasActive.current = false;
      return;
    }

    // Decode left to right into the final value.
    wasActive.current = false;
    const start = performance.now();
    const unsubscribe = subscribe((now) => {
      const progress = Math.min(1, (now - start) / RESOLVE_MS);
      element.textContent = progress >= 1 ? text : scramble(text, Math.floor(progress * text.length));
      if (progress >= 1) unsubscribe();
    });
    element.textContent = scramble(text);
    return () => {
      unsubscribe();
      element.textContent = text;
    };
  }, [text, active]);

  return (
    <span className={className}>
      <span className="scramble" aria-hidden="true" ref={visualRef} />
      <span className="visually-hidden">{text}</span>
    </span>
  );
}
