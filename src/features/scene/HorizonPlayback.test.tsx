// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEphemeris } from '../../api/ephemerisClient';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { HorizonPlayback } from './HorizonPlayback';

vi.mock('../../api/ephemerisClient', () => ({ fetchEphemeris: vi.fn() }));
vi.mock('../../i18n/context', () => ({ useI18n: () => ({ locale: 'en', messages: MESSAGES.en }) }));

let container: HTMLDivElement;
let root: Root;
const onFrame = vi.fn();
const onActive = vi.fn();
const selection = {
  siteId: SAVED_SAMPLE.site.id,
  latitudeDeg: SAVED_SAMPLE.site.latitudeDeg,
  longitudeEastDeg: SAVED_SAMPLE.site.longitudeEastDeg,
  utc: '2026-11-15T12:00:00Z',
};

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
  vi.mocked(fetchEphemeris).mockImplementation(async (target) => ({
    ok: true, data: { ...SAVED_SAMPLE, provenance: 'live', requestedUtc: target.utc, ephemerisUtc: target.utc },
  }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<HorizonPlayback selection={selection} onFrame={onFrame} onActive={onActive} />));
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
    expect(fetchEphemeris).toHaveBeenCalledTimes(25);
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
    expect(onActive.mock.lastCall).toEqual([true]);
    expect(container.querySelector('dialog')!.open).toBe(false);
    act(() => button('Play').click());
    act(() => vi.advanceTimersByTime(500));
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe('2026-11-15T13:00:00Z');
    act(() => button('Pause').click());
    const calls = onFrame.mock.calls.length;
    act(() => vi.advanceTimersByTime(2000));
    expect(onFrame).toHaveBeenCalledTimes(calls);
    act(() => button('Back to start').click());
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
    expect(fetchEphemeris).toHaveBeenCalledTimes(25);
    act(() => button('Exit player').click());
    expect(onFrame.mock.lastCall).toEqual([null]);
    expect(onActive.mock.lastCall).toEqual([false]);
  });

  it('stops at the endpoint and can replay', async () => {
    await prepare();
    act(() => button('Play').click());
    for (let step = 0; step < 24; step++) act(() => vi.advanceTimersByTime(500));
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe('2026-11-16T12:00:00Z');
    expect(button('Play')).toBeDefined();
    act(() => button('Play').click());
    expect(onFrame.mock.lastCall?.[0].requestedUtc).toBe(selection.utc);
  });

  it('rejects incomplete data and retains the previous sequence', async () => {
    await prepare();
    const calls = onFrame.mock.calls.length;
    vi.mocked(fetchEphemeris).mockResolvedValue({ ok: true, data: {
      ...SAVED_SAMPLE, provenance: 'live', bodies: { ...SAVED_SAMPLE.bodies,
        earth: { status: 'error', body: 'earth', error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'Unavailable' } },
      },
    } });
    await prepare();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(MESSAGES.en.playback.error);
    expect(onFrame).toHaveBeenCalledTimes(calls);
    expect(onActive.mock.lastCall).toEqual([true]);
  });

  it('aborts a cancelled load and ignores its late answer', async () => {
    let resolve!: (result: Awaited<ReturnType<typeof fetchEphemeris>>) => void;
    vi.mocked(fetchEphemeris).mockImplementation(() => new Promise((done) => { resolve = done; }));
    await prepare();
    const signal = vi.mocked(fetchEphemeris).mock.calls[0]![1]!;
    act(() => button('Cancel loading').click());
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ ok: true, data: { ...SAVED_SAMPLE, provenance: 'live' } }));
    expect(onFrame).not.toHaveBeenCalled();
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(onActive.mock.lastCall).toEqual([false]);
  });

  it('aborts when navigation replaces the player', async () => {
    vi.mocked(fetchEphemeris).mockImplementation(() => new Promise(() => {}));
    await prepare();
    const signal = vi.mocked(fetchEphemeris).mock.calls[0]![1]!;
    act(() => root.render(null));
    expect(signal.aborted).toBe(true);
  });
});
