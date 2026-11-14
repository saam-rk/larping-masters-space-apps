// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewMode } from '../scene/viewMode';
import { useViewTransition } from './useViewTransition';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

function Harness({ streaks, busy }: { streaks: boolean; busy: boolean }) {
  const [mode, setMode] = useState<ViewMode>('first-person');
  const transition = useViewTransition({ mode, setMode, streaks, busy });
  return (
    <div
      data-mode={mode}
      data-selected={transition.selected}
      data-active={transition.active}
      data-warp={transition.warp.kind}
      data-reverse={transition.warp.reverse}
      data-tempo={transition.warp.tempo}
    >
      <button onClick={() => transition.request('first-person')}>First person</button>
      <button onClick={() => transition.request('third-person')}>Third person</button>
      <button onClick={transition.resetWarp}>Update</button>
    </div>
  );
}

function render(streaks = true, busy = false) {
  act(() => root.render(<Harness streaks={streaks} busy={busy} />));
}

function click(index: number) {
  act(() => container.querySelectorAll<HTMLButtonElement>('button')[index]!.click());
}

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

function state() {
  return container.querySelector<HTMLDivElement>('[data-mode]')!.dataset;
}

describe('view switch transitions', () => {
  it('selects immediately, swaps while hidden at 200 ms and finishes at 600 ms', () => {
    render();
    click(1);
    expect(state()).toMatchObject({ mode: 'first-person', selected: 'third-person', active: 'true', warp: 'switch', reverse: 'true' });
    expect(Number(state().tempo)).toBeGreaterThan(1);
    advance(199);
    expect(state().mode).toBe('first-person');
    advance(1);
    expect(state()).toMatchObject({ mode: 'third-person', active: 'true' });
    advance(399);
    expect(state().active).toBe('true');
    advance(1);
    expect(state()).toMatchObject({ mode: 'third-person', selected: 'third-person', active: 'false' });
  });

  it('ignores the current selection and does not restart an already requested transition', () => {
    render();
    click(0);
    expect(vi.getTimerCount()).toBe(0);
    click(1);
    advance(100);
    click(1);
    advance(100);
    expect(state().mode).toBe('third-person');
    advance(400);
    expect(state().active).toBe('false');
  });

  it('cancels a superseded swap when the user quickly switches back before 200 ms', () => {
    render();
    click(1);
    advance(100);
    click(0);
    expect(state()).toMatchObject({ selected: 'first-person', reverse: 'false' });
    advance(100); // The cancelled third-person swap would have fired here.
    expect(state().mode).toBe('first-person');
    advance(500);
    expect(state()).toMatchObject({ mode: 'first-person', selected: 'first-person', active: 'false' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows reversing after the scene swap without letting the old finish timer end the new jump', () => {
    render();
    click(1);
    advance(300);
    click(0);
    advance(200);
    expect(state()).toMatchObject({ mode: 'first-person', active: 'true', reverse: 'false' });
    advance(100); // The first jump's cancelled finish timer was due here.
    expect(state().active).toBe('true');
    advance(300);
    expect(state().active).toBe('false');
  });

  it.each([
    { streaks: false, busy: false },
    { streaks: true, busy: true },
  ])('switches immediately without timers for %j', ({ streaks, busy }) => {
    render(streaks, busy);
    click(1);
    expect(state()).toMatchObject({ mode: 'third-person', selected: 'third-person', active: 'false' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores the update warp when an update starts during a switch and lets the switch settle', () => {
    render();
    click(1);
    advance(100);
    render(true, true);
    click(2);
    expect(state()).toMatchObject({ warp: 'update', reverse: 'false', tempo: '1' });
    advance(500);
    expect(state()).toMatchObject({ mode: 'third-person', selected: 'third-person', active: 'false', warp: 'update' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending animated swap if another view is requested during an update', () => {
    render();
    click(1);
    advance(100);
    render(true, true);
    click(0);
    expect(state()).toMatchObject({ mode: 'first-person', selected: 'first-person', active: 'false' });
    expect(vi.getTimerCount()).toBe(0);
    advance(1000);
    expect(state().mode).toBe('first-person');
  });

  it('clears pending callbacks when the scene is unmounted', () => {
    render();
    click(1);
    expect(vi.getTimerCount()).toBe(2);
    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
    advance(1000);
    expect(container.childElementCount).toBe(0);
  });
});
