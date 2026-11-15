// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EphemerisResponse } from '../shared/ephemeris';
import { APOLLO_11_FLAG_UTC } from '../shared/time';
import type { EphemerisSelection } from './api/ephemerisClient';
import { fetchEphemeris, fetchEphemerisSeries } from './api/ephemerisClient';
import { App } from './App';
import { SAVED_SAMPLE } from './data/savedSample';
import { MESSAGES } from './i18n/messages';

vi.mock('./api/ephemerisClient', () => ({ fetchEphemeris: vi.fn(), fetchEphemerisSeries: vi.fn() }));
vi.mock('./i18n/context', () => ({ useI18n: () => ({ locale: 'en', messages: MESSAGES.en }) }));
vi.mock('./preferences/context', () => ({ usePreferences: () => ({ configured: true, preferences: { effects: 'off' } }) }));
vi.mock('./features/backdrop/Backdrop', () => ({ Backdrop: () => null }));
vi.mock('./features/backdrop/CrtCurvature', () => ({ CrtCurvature: () => null }));
vi.mock('./features/transition/Hyperspace', () => ({ Hyperspace: () => null }));
vi.mock('./features/shell/HeaderControls', () => ({ OptionsButton: () => null }));
vi.mock('./features/sky-search/SkySearchPanel', () => ({ SkySearchPanel: () => null }));
vi.mock('./features/scene/SkyScene', () => ({
  default: ({ data, playback }: { data: EphemerisResponse; playback: boolean }) =>
    <output data-testid="scene" data-playback={playback}>{data.requestedUtc}</output>,
}));
vi.mock('./features/results/ResultsPanel', () => ({
  ResultsPanel: ({ data }: { data: EphemerisResponse }) => <output data-testid="results">{data.requestedUtc}</output>,
}));
vi.mock('./features/mission-config/ConfigPanel', () => ({
  ConfigPanel: ({ selection, onCoordinatesChange }: {
    selection: EphemerisSelection;
    onCoordinatesChange: (latitude: number, longitude: number) => void;
  }) => <>
    <button onClick={() => onCoordinatesChange(selection.latitudeDeg, selection.longitudeEastDeg)}>Reselect coordinates</button>
    <button onClick={() => onCoordinatesChange(selection.latitudeDeg + 1, selection.longitudeEastDeg)}>Change coordinates</button>
    <button onClick={() => onCoordinatesChange(SAVED_SAMPLE.site.latitudeDeg, SAVED_SAMPLE.site.longitudeEastDeg)}>Restore coordinates</button>
  </>,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
  vi.mocked(fetchEphemeris).mockImplementation(async (target) => ({
    ok: true, data: { ...SAVED_SAMPLE, provenance: 'live', requestedUtc: target.utc, ephemerisUtc: target.utc },
  }));
  vi.mocked(fetchEphemerisSeries).mockImplementation(async (request) => ({
    ok: true,
    frames: Array.from({ length: request.count }, (_, index) => {
      const utc = new Date(Date.parse(request.startUtc) + index * request.stepMinutes * 60_000).toISOString().replace('.000', '');
      return { ...SAVED_SAMPLE, provenance: 'live' as const, requestedUtc: utc, ephemerisUtc: utc };
    }),
  }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<App />));
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
  act(() => container.querySelector<HTMLButtonElement>('.interval-button')!.click());
  await act(async () => { container.querySelector('.playback-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  act(() => button('Play').click());
  act(() => vi.advanceTimersByTime(500));
  act(() => button('Pause').click());
}

describe('App playback selection lifecycle', () => {
  it('keeps the playback frame when the same coordinates are selected again', async () => {
    await prepare();
    const scene = () => container.querySelector('[data-testid="scene"]')!;
    const previewUtc = scene().textContent;
    // Second sample of the default Sun preset: 924 min after the start.
    expect(previewUtc).toBe('1969-07-21T19:05:00Z');
    act(() => button('Reselect coordinates').click());
    expect(scene().textContent).toBe(previewUtc);
    expect(scene().getAttribute('data-playback')).toBe('true');
    expect(container.querySelector('[data-testid="results"]')!.textContent).toBe(previewUtc);
    expect(button('Play')).toBeDefined();
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(1);
  });

  it('discards the sequence and restores the ordinary result when coordinates actually change', async () => {
    await prepare();
    act(() => button('Change coordinates').click());
    expect(container.querySelector('[data-testid="scene"]')!.textContent).toBe(APOLLO_11_FLAG_UTC);
    expect(container.querySelector('[data-testid="scene"]')!.getAttribute('data-playback')).toBe('false');
    expect(button('Play')).toBeUndefined();
    act(() => button('Restore coordinates').click());
    expect(container.querySelector('[data-testid="scene"]')!.getAttribute('data-playback')).toBe('false');
    expect(button('Play')).toBeUndefined();
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(1);
  });
});
