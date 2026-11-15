// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSite, siteAt, type SiteId } from '../../../shared/sites';
import { APOLLO_11_FLAG_UTC, APOLLO_11_LANDING_UTC } from '../../../shared/time';
import { fetchEphemeris } from '../../api/ephemerisClient';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { useEphemeris } from '../../hooks/useEphemeris';
import { MESSAGES } from '../../i18n/messages';
import { ConfigPanel } from './ConfigPanel';

vi.mock('../../api/ephemerisClient', () => ({ fetchEphemeris: vi.fn() }));
vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.mocked(fetchEphemeris).mockReset();
  vi.mocked(fetchEphemeris).mockImplementation(async (selection) => ({
    ok: true,
    data: {
      ...SAVED_SAMPLE,
      provenance: 'live',
      site: { ...siteAt(selection.latitudeDeg, selection.longitudeEastDeg), altitudeKm: 0 },
      requestedUtc: selection.utc,
      ephemerisUtc: selection.utc,
    },
  }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function ConfigPanelOnLoad() {
  const state = useEphemeris();
  return (
    <>
      <output>{state.data.requestedUtc}</output>
      <ConfigPanel selection={state.selection} loading={state.loading} upToDate={false}
        onSiteChange={state.setSiteId} onCoordinatesChange={state.setCoordinates}
        onUtcChange={state.setUtc} onUpdate={state.update} onShowUtc={state.showUtc} />
    </>
  );
}

async function mount() {
  function Harness() {
    const state = useEphemeris();
    // Same data-to-button contract as App: only a complete matching live result is up to date.
    const upToDate = !state.stale && !state.error && state.data.provenance === 'live'
      && !state.data.warnings.includes('PARTIAL_RESULT');
    return (
      <ConfigPanel selection={state.selection} loading={state.loading} upToDate={upToDate}
        onSiteChange={state.setSiteId} onCoordinatesChange={state.setCoordinates}
        onUtcChange={state.setUtc} onUpdate={state.update} onShowUtc={state.showUtc} />
    );
  }
  await act(async () => root.render(<Harness />));
  vi.mocked(fetchEphemeris).mockClear();
  return container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
}

function keyWheel(name: string, key: string) {
  const wheel = [...container.querySelectorAll<HTMLElement>('[role="spinbutton"]')].find((element) =>
    document.getElementById(element.getAttribute('aria-labelledby')!)?.textContent?.startsWith(name),
  )!;
  act(() => { wheel.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}

/** Picks a reference point from the site drop-down by its id. */
function chooseSite(id: SiteId) {
  const { name } = findSite(id);
  const option = [...container.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.querySelector('.wheel-select__text')?.textContent?.split(' · ')[0] === name,
  )!;
  act(() => option.click());
}

describe('D-020 duplicate-update policy', () => {
  it('blocks both clicks and form submission for the case queried on load, until the selection changes', async () => {
    const button = await mount();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Updated');
    act(() => button.click());
    act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(fetchEphemeris).not.toHaveBeenCalled();
    keyWheel('Min', 'ArrowUp');
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    act(() => button.click());
    act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
  });

  it('unlocks for another point, and locks again when returning to the case still displayed', async () => {
    const button = await mount();
    chooseSite('nobile-rim-2');
    expect(button.disabled).toBe(false);
    chooseSite('apollo-11');
    expect(button.disabled).toBe(true);
    chooseSite('nobile-rim-2');
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    chooseSite('apollo-11');
    expect(button.disabled).toBe(false);
  });

  it.each(['Day', 'Hour', 'Min'])('unlocks when %s changes at the same point and locks on returning to the displayed instant', async (part) => {
    const button = await mount();
    keyWheel(part, 'ArrowUp');
    expect(button.disabled).toBe(false);
    keyWheel(part, 'ArrowDown');
    expect(button.disabled).toBe(true);
    keyWheel(part, 'ArrowUp');
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
  });

  it('does not unlock when only the displayed time zone changes, preserving the same UTC instant', async () => {
    const button = await mount();
    keyWheel('Time zone', 'ArrowUp');
    expect(button.disabled).toBe(true);
    expect(fetchEphemeris).not.toHaveBeenCalled();
  });
});

describe('Apollo 11 moments', () => {
  const moment = (label: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('.apollo-moment')].find((button) => button.textContent?.startsWith(label));

  it('shows and queries Apollo 11 at flag raising on load', async () => {
    act(() => root.render(<ConfigPanelOnLoad />));
    expect(fetchEphemeris).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ siteId: 'apollo-11', utc: APOLLO_11_FLAG_UTC }), expect.any(AbortSignal),
    );
    expect(container.querySelector('output')?.textContent).toBe(APOLLO_11_FLAG_UTC);
    expect(moment(MESSAGES.en.config.apollo11.flag)?.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {});
  });

  it('queries each moment right away when selected and blocks repeating the displayed case', async () => {
    const update = await mount();
    const { landing, flag } = MESSAGES.en.config.apollo11;
    expect(container.textContent).toContain(MESSAGES.en.config.apollo11.title);
    expect(moment(flag)!.disabled).toBe(true);
    expect(moment(landing)!.getAttribute('aria-pressed')).toBe('false');
    expect(moment(landing)!.disabled).toBe(false);
    await act(async () => moment(landing)!.click());
    expect(vi.mocked(fetchEphemeris).mock.calls[0]![0].utc).toBe(APOLLO_11_LANDING_UTC);
    await act(async () => moment(flag)!.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchEphemeris).mock.calls[1]![0].utc).toBe(APOLLO_11_FLAG_UTC);
    expect(moment(flag)!.getAttribute('aria-pressed')).toBe('true');
    expect(moment(flag)!.disabled).toBe(true);
    expect(update.disabled).toBe(true);
  });

  it('is only offered while Apollo 11 is selected', async () => {
    await mount();
    chooseSite('nobile-rim-2');
    expect(container.querySelector('.apollo-moments')).toBeNull();
  });
});
