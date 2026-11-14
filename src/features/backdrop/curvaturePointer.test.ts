import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installCurvaturePointer } from './curvaturePointer';

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
