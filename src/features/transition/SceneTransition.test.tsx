// @vitest-environment jsdom
import { act, lazy, StrictMode, Suspense, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneLoading } from './SceneLoading';
import { SceneTransition } from './SceneTransition';
import { UPDATE_WARP } from './useViewTransition';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('../../preferences/preferences', () => ({ prefersReducedMotion: () => motion.reduced }));
vi.mock('./Hyperspace', () => ({
  Hyperspace: ({ active }: { active: boolean }) => <canvas className="hyperspace" data-active={active} />,
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  motion.reduced = false;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function pendingModel() {
  let resolve!: (module: { default: () => ReactNode }) => void;
  const promise = new Promise<{ default: () => ReactNode }>((done) => { resolve = done; });
  return { Model: lazy(() => promise), finish: () => resolve({ default: () => <span>Ready</span> }) };
}

function render(children: ReactNode, jumping = false, streaks = true) {
  act(() => root.render(
    <StrictMode>
      <SceneTransition jumping={jumping} streaks={streaks} warp={UPDATE_WARP} playing={false}>
        {children}
      </SceneTransition>
    </StrictMode>,
  ));
}
const loading = () => container.querySelector('.scene-stage')!.getAttribute('data-loading');
const animating = () => container.querySelector('.hyperspace')?.getAttribute('data-active');

describe('scene loading transition', () => {
  it('covers the initial lazy scene with a text-free jump until it resolves', async () => {
    const { Model, finish } = pendingModel();
    render(<Model />);
    expect(loading()).toBe('true');
    expect(animating()).toBe('true');
    expect(container.textContent).toBe('');
    act(() => vi.advanceTimersByTime(10_000));
    expect(animating()).toBe('true');
    await act(async () => finish());
    expect(loading()).toBe('false');
    expect(animating()).toBe('false');
    expect(container.textContent).toBe('Ready');
  });

  it('waits for every model after the timed view switch ends', async () => {
    const first = pendingModel();
    const second = pendingModel();
    const models = <>
      <Suspense fallback={<SceneLoading />}><first.Model /></Suspense>
      <Suspense fallback={<SceneLoading />}><second.Model /></Suspense>
    </>;
    render(models, true);
    render(models, false);
    await act(async () => first.finish());
    expect(loading()).toBe('true');
    expect(animating()).toBe('true');
    await act(async () => second.finish());
    expect(loading()).toBe('false');
    expect(animating()).toBe('false');
  });

  it('clears cancelled loads when switching away and does not jump for cached models', async () => {
    const first = pendingModel();
    render(<Suspense fallback={<SceneLoading />}><first.Model /></Suspense>);
    expect(animating()).toBe('true');
    render(<span>Other view</span>);
    expect(animating()).toBe('false');
    await act(async () => first.finish());
    await act(async () => render(<first.Model />));
    expect(loading()).toBe('false');
    expect(animating()).toBe('false');
  });

  it('keeps a data jump active after models finish', async () => {
    const { Model, finish } = pendingModel();
    render(<Model />, true);
    await act(async () => finish());
    expect(loading()).toBe('false');
    expect(animating()).toBe('true');
    render(<Model />, false);
    expect(animating()).toBe('false');
  });

  it('uses the model-loading jump with decorative effects off', () => {
    const { Model } = pendingModel();
    render(<Model />, false, false);
    expect(animating()).toBe('true');
    expect(container.textContent).toBe('');
  });

  it('respects reduced motion without restoring loading text', () => {
    motion.reduced = true;
    const { Model } = pendingModel();
    render(<Model />);
    expect(loading()).toBe('true');
    expect(container.querySelector('.hyperspace')).toBeNull();
    expect(container.textContent).toBe('');
  });
});
