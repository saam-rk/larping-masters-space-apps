// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEphemerisSeries, type EphemerisSeriesRequest } from '../../api/ephemerisClient';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { HorizonPlayback, type CameraFollow } from './HorizonPlayback';
import { findNextRise } from './nextRise';

vi.mock('../../api/ephemerisClient', () => ({ fetchEphemerisSeries: vi.fn() }));
vi.mock('../../i18n/context', () => ({ useI18n: () => ({ locale: 'en', messages: MESSAGES.en }) }));
vi.mock('./nextRise', async (original) => ({ ...(await original<typeof import('./nextRise')>()), findNextRise: vi.fn() }));
vi.mock('../../preferences/context', () => ({ usePreferences: () => ({ configured: true, preferences: { effects: 'off' } }) }));

let container: HTMLDivElement;
let root: Root;
const onFrame = vi.fn();
const onActive = vi.fn();
const onFollowChange = vi.fn();
const selection = {
  siteId: SAVED_SAMPLE.site.id,
  latitudeDeg: SAVED_SAMPLE.site.latitudeDeg,
  longitudeEastDeg: SAVED_SAMPLE.site.longitudeEastDeg,
  utc: '2026-11-15T12:00:00Z',
};
/** Sun preset with the default 24 samples: 29.530589 d / 2 × 1440 / 23 ≈ 924 min. */
const STEP_MS = 924 * 60_000;
const utcAt = (index: number) => new Date(Date.parse(selection.utc) + index * STEP_MS).toISOString().replace('.000', '');

function frames(request: EphemerisSeriesRequest) {
  return Array.from({ length: request.count }, (_, index) => {
    const utc = new Date(Date.parse(request.startUtc) + index * request.stepMinutes * 60_000).toISOString().replace('.000', '');
    return { ...SAVED_SAMPLE, provenance: 'live' as const, requestedUtc: utc, ephemerisUtc: utc };
  });
}

function Harness() {
  const [open, setOpen] = useState(false);
  const [follow, setFollow] = useState<CameraFollow>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Interval</button>
      <HorizonPlayback selection={selection} open={open} onClose={() => setOpen(false)} onFrame={onFrame} onActive={onActive}
        follow={follow} onFollowChange={(next) => { onFollowChange(next); setFollow(next); }} />
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
  vi.mocked(fetchEphemerisSeries).mockImplementation(async (request) => ({ ok: true, frames: frames(request) }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function button(label: string) {
  return [...container.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label || item.textContent === label)!;
}

async function prepare() {
  act(() => button('Interval').click());
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

describe('HorizonPlayback', () => {
  it('prepares samples, plays, pauses, seeks and exits without fetching on playback', async () => {
    await prepare();
    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchEphemerisSeries).mock.calls[0]![0]).toMatchObject({ startUtc: selection.utc, stepMinutes: 924, count: 24 });
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
    expect(onActive.mock.lastCall).toEqual([true]);
    expect(container.querySelector('dialog')!.open).toBe(false);
    act(() => button('Play').click());
    act(() => vi.advanceTimersByTime(500));
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(utcAt(1));
    act(() => button('Pause').click());
    const calls = onFrame.mock.calls.length;
    act(() => vi.advanceTimersByTime(2000));
    expect(onFrame).toHaveBeenCalledTimes(calls);
    act(() => button('Back to start').click());
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(1);
    act(() => button('Exit player').click());
    expect(onFrame.mock.lastCall).toEqual([null]);
    expect(onActive.mock.lastCall).toEqual([false]);
  });

  it('offers to center the camera on the Sun or the Earth and resets it on exit', async () => {
    await prepare();
    const select = container.querySelector<HTMLSelectElement>(`select[aria-label="${MESSAGES.en.playback.follow.label}"]`)!;
    act(() => {
      select.value = 'earth';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onFollowChange.mock.lastCall).toEqual(['earth']);
    act(() => button('Exit player').click());
    expect(onFollowChange.mock.lastCall).toEqual([null]);
  });

  it('moves the start to the next rise of a body and picks its preset', async () => {
    vi.mocked(findNextRise).mockResolvedValue({ status: 'found', utc: '2026-11-20T08:30:15Z' });
    act(() => button('Interval').click());
    const earth = [...container.querySelectorAll<HTMLButtonElement>('.playback-rise button')].find((item) => item.textContent?.includes('Earth'))!;
    await act(async () => earth.click());
    expect(vi.mocked(findNextRise).mock.calls[0]![0]).toMatchObject({ utc: '2026-11-15T12:00:00Z' });
    expect(vi.mocked(findNextRise).mock.calls[0]![1]).toBe('earth');
    expect(container.querySelector('.playback-form [role="status"]')!.textContent).toContain('2026-11-20 08:30:15 UTC');
    await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    // Earth preset: 27.21222 d / 2 × 1440 / 23 ≈ 852 min, from the minute after the rise.
    expect(vi.mocked(fetchEphemerisSeries).mock.calls[0]![0]).toMatchObject({ startUtc: '2026-11-20T08:31:00Z', stepMinutes: 852, count: 24 });
  });

  it('takes a typed sample count and a custom step', async () => {
    act(() => button('Interval').click());
    const samples = container.querySelector<HTMLInputElement>('input[type="number"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(samples, '4');
      samples.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => button(MESSAGES.en.playback.step.presets.custom).click());
    await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(vi.mocked(fetchEphemerisSeries).mock.calls[0]![0]).toMatchObject({ stepMinutes: 60, count: 4 });
  });

  it('loads long intervals in chunks of at most 100 samples', async () => {
    act(() => button('Interval').click());
    const samples = container.querySelector<HTMLInputElement>('input[type="number"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(samples, '250');
      samples.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(vi.mocked(fetchEphemerisSeries).mock.calls.map(([request]) => request.count)).toEqual([84, 83, 83]);
    expect(container.querySelector<HTMLInputElement>('input[type="range"]')!.max).toBe('249');
  });

  it('stops at the endpoint and can replay', async () => {
    await prepare();
    act(() => button('Play').click());
    for (let step = 0; step < 23; step++) act(() => vi.advanceTimersByTime(500));
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(utcAt(23));
    expect(button('Play')).toBeDefined();
    act(() => button('Play').click());
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
  });

  it('rejects incomplete data and retains the previous sequence', async () => {
    await prepare();
    const calls = onFrame.mock.calls.length;
    vi.mocked(fetchEphemerisSeries).mockImplementation(async (request) => ({ ok: true, frames: frames(request).map((frame) => ({
      ...frame, bodies: { ...frame.bodies,
        earth: { status: 'error' as const, body: 'earth' as const, error: { code: 'UPSTREAM_UNAVAILABLE' as const, detail: 'Unavailable' } },
      },
    })) }));
    await prepare();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(MESSAGES.en.playback.error);
    expect(onFrame).toHaveBeenCalledTimes(calls);
    expect(onActive.mock.lastCall).toEqual([true]);
  });

  it('aborts a cancelled load and ignores its late answer', async () => {
    let resolve!: (result: Awaited<ReturnType<typeof fetchEphemerisSeries>>) => void;
    vi.mocked(fetchEphemerisSeries).mockImplementation(() => new Promise((done) => { resolve = done; }));
    await prepare();
    const signal = vi.mocked(fetchEphemerisSeries).mock.calls[0]![1]!;
    act(() => button('Cancel loading').click());
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ ok: true, frames: frames({ selection, startUtc: selection.utc, stepMinutes: 924, count: 24 }) }));
    expect(onFrame).not.toHaveBeenCalled();
    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(1);
    expect(onActive.mock.lastCall).toEqual([false]);
  });

  it('aborts when navigation replaces the player', async () => {
    vi.mocked(fetchEphemerisSeries).mockImplementation(() => new Promise(() => {}));
    await prepare();
    const signal = vi.mocked(fetchEphemerisSeries).mock.calls[0]![1]!;
    act(() => root.render(null));
    expect(signal.aborted).toBe(true);
  });
});
