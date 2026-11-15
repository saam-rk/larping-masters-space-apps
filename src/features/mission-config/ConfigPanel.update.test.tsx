// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSite, siteAt, type SiteId } from '../../../shared/sites';
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

function mount() {
  function Harness() {
    const state = useEphemeris();
    // Same data-to-button contract as App: only a complete matching live result is up to date.
    const upToDate = !state.stale && !state.error && state.data.provenance === 'live'
      && !state.data.warnings.includes('PARTIAL_RESULT');
    return (
      <ConfigPanel selection={state.selection} loading={state.loading} upToDate={upToDate}
        onSiteChange={state.setSiteId} onCoordinatesChange={state.setCoordinates}
        onUtcChange={state.setUtc} onUpdate={state.update} />
    );
  }
  act(() => root.render(<Harness />));
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
    (element) => element.textContent?.split(' · ')[0] === name,
  )!;
  act(() => option.click());
}

describe('D-020 duplicate-update policy', () => {
  it('allows the initial sample query, then blocks both clicks and form submission for the completed case', async () => {
    const button = mount();
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Updated');
    act(() => button.click());
    act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
  });

  it('unlocks for another point, and locks again when returning to the case still displayed', async () => {
    const button = mount();
    await act(async () => button.click());
    chooseSite('nobile-rim-2');
    expect(button.disabled).toBe(false);
    chooseSite('apollo-11');
    expect(button.disabled).toBe(true);
    chooseSite('nobile-rim-2');
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(2);
    expect(button.disabled).toBe(true);
    chooseSite('apollo-11');
    expect(button.disabled).toBe(false);
  });

  it.each(['Day', 'Hour', 'Min'])('unlocks when %s changes at the same point and locks on returning to the displayed instant', async (part) => {
    const button = mount();
    await act(async () => button.click());
    keyWheel(part, 'ArrowUp');
    expect(button.disabled).toBe(false);
    keyWheel(part, 'ArrowDown');
    expect(button.disabled).toBe(true);
    keyWheel(part, 'ArrowUp');
    await act(async () => button.click());
    expect(fetchEphemeris).toHaveBeenCalledTimes(2);
    expect(button.disabled).toBe(true);
  });

  it('does not unlock when only the displayed time zone changes, preserving the same UTC instant', async () => {
    const button = mount();
    await act(async () => button.click());
    keyWheel('Time zone', 'ArrowUp');
    expect(button.disabled).toBe(true);
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);
  });
});
