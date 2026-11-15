import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawnPointerPosition, installCurvaturePointer, rangeValueAt, type RangeTrack } from './curvaturePointer';

class TestElement {
  click = vi.fn();
  focus = vi.fn();
  closest() { return this; }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
}

const listeners = new Map<string, ((event: MouseEvent) => void)[]>();

/** Calls every window listener of a type, in registration order. */
function fire(type: string, event: MouseEvent) {
  for (const listener of listeners.get(type) ?? []) listener(event);
}
let drawn: TestElement;

beforeEach(() => {
  listeners.clear();
  drawn = new TestElement();
  vi.stubGlobal('Element', TestElement);
  vi.stubGlobal('HTMLElement', TestElement);
  for (const name of ['HTMLLabelElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) {
    vi.stubGlobal(name, class extends TestElement {});
  }
  vi.stubGlobal('window', {
    innerWidth: 1000,
    innerHeight: 500,
    addEventListener: (type: string, listener: (event: MouseEvent) => void) =>
      listeners.set(type, [...(listeners.get(type) ?? []), listener]),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('document', {
    documentElement: {
      dataset: { curve: 'on' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      removeAttribute: vi.fn(),
    },
    querySelector: (selector: string) => selector === '.app__frame' ? new TestElement() : null,
    elementFromPoint: () => drawn,
  });
});

afterEach(() => vi.unstubAllGlobals());

function clickEvent(detail: number, clientX = 0, clientY = 0, type = 'click'): MouseEvent {
  return {
    type,
    button: 0,
    pointerId: 1,
    isTrusted: true,
    target: new TestElement(),
    detail,
    clientX,
    clientY,
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  } as unknown as MouseEvent;
}

describe('curvature pointer remapping', () => {
  it('leaves keyboard and assistive-technology activation on the focused control', () => {
    const stop = installCurvaturePointer();
    const event = clickEvent(0);
    fire('click', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(drawn.click).not.toHaveBeenCalled();
    stop();
  });

  it('still redirects a pointer click to the drawn control', () => {
    const stop = installCurvaturePointer();
    const event = clickEvent(1, 500, 250);
    fire('click', event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(drawn.click).toHaveBeenCalledOnce();
    stop();
  });

  it.each(['native', 'fallback', 'dialog'])('leaves %s top-layer pointer coordinates and clicks unwarped', (mode) => {
    vi.stubGlobal('document', {
      ...document,
      fullscreenElement: mode === 'native' ? drawn : null,
      querySelector: (selector: string) => {
        if (selector === '.app__frame') return new TestElement();
        if (selector === '[data-fullscreen]' && mode === 'fallback') return drawn;
        if (selector === 'dialog[open]' && mode === 'dialog') return drawn;
        return null;
      },
    });
    expect(drawnPointerPosition(100, 50)).toEqual({ x: 100, y: 50 });
    const stop = installCurvaturePointer();
    const event = clickEvent(1, 100, 50);
    fire('click', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(drawn.click).not.toHaveBeenCalled();
    stop();
  });

  it('uses native coordinates and activation while resizing, then resumes remapping', () => {
    const stop = installCurvaturePointer();
    document.documentElement.dataset.resizing = 'on';
    expect(drawnPointerPosition(100, 50)).toEqual({ x: 100, y: 50 });
    const event = clickEvent(1, 100, 50);
    fire('mousedown', event);
    fire('click', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(drawn.click).not.toHaveBeenCalled();

    delete document.documentElement.dataset.resizing;
    expect(drawnPointerPosition(100, 50)).not.toEqual({ x: 100, y: 50 });
    fire('click', clickEvent(1, 100, 50));
    expect(drawn.click).toHaveBeenCalledOnce();
    stop();
  });

  it('clears the remapped cursor immediately on resize', () => {
    const stop = installCurvaturePointer();
    fire('resize', {} as MouseEvent);
    expect(document.documentElement.removeAttribute).toHaveBeenCalledWith('data-curve-cursor');
    stop();
  });

  it('does not take over a native range press while resizing', () => {
    const stop = installCurvaturePointer();
    class TestRange extends TestElement {
      type = 'range';
      disabled = false;
    }
    vi.stubGlobal('HTMLInputElement', TestRange);
    drawn = new TestRange();
    document.documentElement.dataset.resizing = 'on';
    const event = clickEvent(1, 100, 50, 'pointerdown');
    fire('pointerdown', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(drawn.focus).not.toHaveBeenCalled();
    stop();
  });

  it('keeps correcting drawn coordinates outside full screen and dialogs', () => {
    expect(drawnPointerPosition(100, 50)).not.toEqual({ x: 100, y: 50 });
  });

  it('leaves the click that ends a drag on the dragged control', () => {
    const stop = installCurvaturePointer();
    fire('pointerdown', clickEvent(1, 500, 250, 'pointerdown'));
    const event = clickEvent(1, 500, 210);
    fire('click', event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(drawn.click).not.toHaveBeenCalled();
    // A press that barely moved is still a click on what is drawn there.
    fire('pointerdown', clickEvent(1, 500, 250, 'pointerdown'));
    fire('click', clickEvent(1, 502, 252));
    expect(drawn.click).toHaveBeenCalledOnce();
    stop();
  });
});

describe('range value under the drawn pointer', () => {
  // A vertical zoom slider like `.zoom-control__slider`: 100 px tall, 10 px thumb, minimum at the bottom.
  const track: RangeTrack = { start: 200, length: 100, thumb: 10, reversed: true, min: 0, max: 1, step: 0.005 };

  it('maps the thumb travel to the value range, minimum at the bottom', () => {
    expect(rangeValueAt(track, 205)).toBe(1);
    expect(rangeValueAt(track, 295)).toBe(0);
    expect(rangeValueAt(track, 250)).toBe(0.5);
  });

  it('clamps beyond the ends and snaps to the step', () => {
    expect(rangeValueAt(track, 0)).toBe(1);
    expect(rangeValueAt(track, 1000)).toBe(0);
    expect(rangeValueAt(track, 251)).toBeCloseTo(0.49, 10);
  });

  it('runs from the start for an unreversed slider', () => {
    expect(rangeValueAt({ ...track, reversed: false, min: 10, max: 20, step: 1 }, 205)).toBe(10);
    expect(rangeValueAt({ ...track, reversed: false, min: 10, max: 20, step: 1 }, 295)).toBe(20);
  });
});
