// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrtCurvature } from './CrtCurvature';
import { installResizeActivity } from './resizeActivity';

let container: HTMLDivElement;
let root: Root;
let stopResize: () => void;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const createImageData = vi.fn((width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }));

function viewport(width: number, height: number) {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
  window.dispatchEvent(new Event('resize'));
}

function paint() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(16)));
}

function expectCoverage(width: number, height: number) {
  const filter = container.querySelector('filter')!;
  const pad = -Number(filter.getAttribute('x'));
  expect(Number(filter.getAttribute('width'))).toBe(width + 2 * pad);
  expect(Number(filter.getAttribute('height'))).toBe(height + 2 * pad);
  const image = container.querySelector('feImage')!;
  expect(image.getAttribute('width')).toBe(filter.getAttribute('width'));
  expect(image.getAttribute('height')).toBe(filter.getAttribute('height'));
  expect(document.documentElement.dataset.curve).toBe('on');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData,
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,map');
  createImageData.mockClear();
  viewport(1000, 500);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  stopResize = installResizeActivity();
  act(() => root.render(<StrictMode><CrtCurvature enabled /></StrictMode>));
  createImageData.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  stopResize();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('curvature during viewport zoom', () => {
  it.each([[2000, 1000], [800, 400], [600, 1000]])('covers a %s × %s viewport by the next paint, without waiting for resize idle', (width, height) => {
    expectCoverage(1000, 500);
    act(() => viewport(width, height));
    expect(document.documentElement.dataset.resizing).toBe('on');
    paint();
    expectCoverage(width, height);
    expect(createImageData).toHaveBeenCalledOnce();
  });

  it('coalesces rapid zoom steps into one bounded map rebuild per paint', () => {
    act(() => {
      viewport(2000, 1000);
      viewport(4000, 2000);
      viewport(8000, 4000);
    });
    expect(createImageData).not.toHaveBeenCalled();
    paint();
    expect(createImageData).toHaveBeenCalledOnce();
    expectCoverage(8000, 4000);
    const [width, height] = createImageData.mock.calls[0]!;
    expect(Math.max(width, height)).toBeLessThanOrEqual(256);

    act(() => viewport(8000, 4000));
    paint();
    expect(createImageData).toHaveBeenCalledOnce();
  });

  it('cancels pending resize work when disabled and rebuilds on re-enable', () => {
    act(() => viewport(2000, 1000));
    act(() => root.render(<StrictMode><CrtCurvature enabled={false} /></StrictMode>));
    paint();
    expect(createImageData).not.toHaveBeenCalled();
    expect(container.querySelector('filter')).toBeNull();
    expect(document.documentElement.dataset.curve).toBe('off');

    act(() => root.render(<StrictMode><CrtCurvature enabled /></StrictMode>));
    expectCoverage(2000, 1000);
    expect(createImageData).toHaveBeenCalledOnce();
  });
});
