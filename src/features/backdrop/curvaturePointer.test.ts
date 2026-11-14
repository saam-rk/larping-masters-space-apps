import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installCurvaturePointer, rangeValueAt, type RangeTrack } from './curvaturePointer';

class TestElement {
  click = vi.fn();
  focus = vi.fn();
  closest() { return this; }
  getBoundingClientRect() { return { left: 0, top: 0 }; }
}

const listeners = new Map<string, (event: MouseEvent) => void>();
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
    addEventListener: (type: string, listener: (event: MouseEvent) => void) => listeners.set(type, listener),
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

function clickEvent(detail: number, clientX = 0, clientY = 0): MouseEvent {
  return {
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
    listeners.get('click')!(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    expect(drawn.click).not.toHaveBeenCalled();
    stop();
  });

  it('still redirects a pointer click to the drawn control', () => {
    const stop = installCurvaturePointer();
    const event = clickEvent(1, 500, 250);
    listeners.get('click')!(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
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
