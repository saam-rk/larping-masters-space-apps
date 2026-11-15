// @vitest-environment jsdom
/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installResizeActivity, onViewportSettled, RESIZE_IDLE_MS, SETTLE_WORK_MS } from './resizeActivity';
import { readFileSync } from 'node:fs';

const styles = readFileSync('src/styles.css', 'utf8');

function createTarget() {
  const target = new EventTarget();
  return {
    target,
    resize: () => target.dispatchEvent(new Event('resize')),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.resizing;
});

describe('installResizeActivity', () => {
  it('keeps the curved-glass filter applied throughout zoom resize bursts', () => {
    const style = document.createElement('style');
    style.textContent = styles;
    const frame = document.createElement('div');
    frame.className = 'app__frame';
    document.head.append(style);
    document.body.append(frame);
    document.documentElement.dataset.curve = 'on';
    const { target, resize } = createTarget();
    const cleanup = installResizeActivity(target as unknown as Window);

    try {
      expect(getComputedStyle(frame).filter).toContain('#crt-curvature');
      for (let step = 0; step < 5; step++) {
        resize();
        expect(getComputedStyle(frame).filter).toContain('#crt-curvature');
        vi.advanceTimersByTime(RESIZE_IDLE_MS - 20);
        expect(getComputedStyle(frame).filter).toContain('#crt-curvature');
      }
      vi.advanceTimersByTime(RESIZE_IDLE_MS);
      expect(getComputedStyle(frame).filter).toContain('#crt-curvature');
    } finally {
      cleanup();
      style.remove();
      frame.remove();
      delete document.documentElement.dataset.curve;
    }
  });

  it('flags the root while resizing and clears it once the viewport is still', () => {
    const { target, resize } = createTarget();
    const cleanup = installResizeActivity(target as unknown as Window);
    const root = document.documentElement;

    expect(root.dataset.resizing).toBeUndefined();
    resize();
    expect(root.dataset.resizing).toBe('on');

    vi.advanceTimersByTime(RESIZE_IDLE_MS - 1);
    expect(root.dataset.resizing).toBe('on');
    vi.advanceTimersByTime(1);
    expect(root.dataset.resizing).toBeUndefined();
    cleanup();
  });

  it('keeps the flag while resize events keep arriving', () => {
    const { target, resize } = createTarget();
    const cleanup = installResizeActivity(target as unknown as Window);

    for (let step = 0; step < 5; step++) {
      resize();
      vi.advanceTimersByTime(RESIZE_IDLE_MS - 20);
    }
    expect(document.documentElement.dataset.resizing).toBe('on');
    vi.advanceTimersByTime(20);
    expect(document.documentElement.dataset.resizing).toBeUndefined();
    cleanup();
  });

  it('clears the flag and stops listening on cleanup', () => {
    const { target, resize } = createTarget();
    const cleanup = installResizeActivity(target as unknown as Window);
    resize();
    cleanup();
    expect(document.documentElement.dataset.resizing).toBeUndefined();

    resize();
    expect(document.documentElement.dataset.resizing).toBeUndefined();
  });
});

describe('onViewportSettled', () => {
  it('calls back once, after the last resize of a burst', () => {
    const { target, resize } = createTarget();
    const callback = vi.fn();
    const cleanup = onViewportSettled(callback, SETTLE_WORK_MS, target as unknown as Window);

    resize();
    vi.advanceTimersByTime(SETTLE_WORK_MS - 10);
    resize();
    vi.advanceTimersByTime(SETTLE_WORK_MS - 1);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('finishes before the resizing flag is cleared', () => {
    expect(SETTLE_WORK_MS).toBeLessThan(RESIZE_IDLE_MS);
  });

  it('does not call back after cleanup', () => {
    const { target, resize } = createTarget();
    const callback = vi.fn();
    const cleanup = onViewportSettled(callback, SETTLE_WORK_MS, target as unknown as Window);
    resize();
    cleanup();
    vi.advanceTimersByTime(SETTLE_WORK_MS * 2);
    expect(callback).not.toHaveBeenCalled();
  });
});
