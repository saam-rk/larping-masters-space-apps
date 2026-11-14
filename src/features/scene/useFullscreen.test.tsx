// @vitest-environment jsdom

import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFullscreen } from './useFullscreen';

let container: HTMLDivElement;
let root: Root;
let fullscreenElement: Element | null;
let originalFullscreenElement: PropertyDescriptor | undefined;
let originalExitFullscreen: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fullscreenElement = null;
  originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
  originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen');
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  for (const [name, descriptor] of [
    ['fullscreenElement', originalFullscreenElement],
    ['exitFullscreen', originalExitFullscreen],
  ] as const) {
    if (descriptor) Object.defineProperty(document, name, descriptor);
    else Reflect.deleteProperty(document, name);
  }
  vi.unstubAllGlobals();
});

function mount() {
  function Harness() {
    const target = useRef<HTMLElement>(null);
    const fullscreen = useFullscreen(target);
    return (
      <section ref={target}>
        <button type="button" aria-pressed={fullscreen.active} onClick={fullscreen.toggle}>Toggle</button>
      </section>
    );
  }
  act(() => root.render(<Harness />));
  const element = container.querySelector('section')!;
  const button = container.querySelector('button')!;
  return { element, button };
}

function changeNative(element: Element | null) {
  fullscreenElement = element;
  document.dispatchEvent(new Event('fullscreenchange'));
}

describe('useFullscreen', () => {
  it('uses the CSS fallback when native full screen is unavailable and leaves with Escape or the toggle', () => {
    const { element, button } = mount();
    act(() => button.click());
    expect(element.dataset.fullscreen).toBe('fallback');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(element.hasAttribute('data-fullscreen')).toBe(false);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    act(() => button.click());
    act(() => button.click());
    expect(element.hasAttribute('data-fullscreen')).toBe(false);
  });

  it('tracks native entry, toggle exit and browser-driven exit', async () => {
    const { element, button } = mount();
    element.requestFullscreen = vi.fn(async () => { changeNative(element); });
    const exit = vi.fn(async () => { changeNative(null); });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
    await act(async () => button.click());
    expect(element.requestFullscreen).toHaveBeenCalledOnce();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(element.hasAttribute('data-fullscreen')).toBe(false);
    await act(async () => button.click());
    expect(exit).toHaveBeenCalledOnce();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await act(async () => button.click());
    act(() => changeNative(null));
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('falls back when the browser refuses a native request', async () => {
    const { element, button } = mount();
    element.requestFullscreen = vi.fn().mockRejectedValue(new Error('Full screen is not permitted'));
    await act(async () => button.click());
    expect(element.dataset.fullscreen).toBe('fallback');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('removes its fallback marker when unmounted', () => {
    const { element, button } = mount();
    act(() => button.click());
    expect(element.dataset.fullscreen).toBe('fallback');
    act(() => root.render(null));
    expect(element.hasAttribute('data-fullscreen')).toBe(false);
  });
});
