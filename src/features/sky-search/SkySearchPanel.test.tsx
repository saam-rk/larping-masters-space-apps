// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkySearchResponse } from '../../../shared/skySearch';
import { findSite } from '../../../shared/sites';
import { MESSAGES } from '../../i18n/messages';
import { SkySearchPanel } from './SkySearchPanel';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

const site = findSite('nobile-rim-1');
const selection = { siteId: site.id, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, utc: '2026-11-14T12:00:00Z' };

const FOUND: SkySearchResponse = {
  site: { ...site, altitudeKm: 0 },
  referenceUtc: selection.utc,
  direction: 'nearest',
  conditions: { earthElevation: { min: 1.2345, max: 1.24 } },
  searched: { startUtc: '2026-10-13T12:00:00Z', endUtc: '2026-12-16T12:00:00Z' },
  outcome: {
    status: 'found',
    complete: true,
    match: { utc: '2026-11-16T02:19:35Z', offsetSeconds: 137_975, values: { earthAzimuth: 318.540263, earthElevation: 1.23445 } },
  },
  source: { name: 'NASA/JPL Horizons API', url: '', apiVersion: '1.2', planetaryEphemeris: 'DE441', observerFrame: null, retrievedAt: '' },
  method: {
    ephemerisType: 'OBSERVER',
    quantities: [4],
    refraction: 'AIRLESS',
    timeScale: 'UT',
    terrainModeled: false,
    coarseStepMinutes: 60,
    resolutionSeconds: 1,
    windowDays: 366,
    comparisonDecimals: 4,
  },
  horizonsRequests: 4,
};

let container: HTMLDivElement;
let root: Root;

// jsdom has no modal dialogs: open and close by the attribute, as browsers do.
function stubDialog() {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

beforeEach(() => {
  stubDialog();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function mount(onShow = vi.fn()) {
  act(() => root.render(<SkySearchPanel selection={selection} onShow={onShow} />));
  const field = (label: string) => container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  const submit = () => container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const dialog = () => container.querySelector<HTMLDialogElement>('dialog.sky-search-dialog')!;
  const button = (label: string) => [...container.querySelectorAll('button')].find((item) => item.textContent === label)!;
  return { onShow, field, submit, dialog, button };
}

describe('SkySearchPanel', () => {
  it('needs at least one valid field before searching', () => {
    const { field, submit } = mount();
    expect(submit().disabled).toBe(true);
    type(field('Sun, Elevation, minimum'), '1.23456');
    expect(submit().disabled).toBe(true);
    expect(container.textContent).toContain('Enter degrees with up to 4 decimals.');
    type(field('Sun, Elevation, minimum'), '0,5');
    expect(submit().disabled).toBe(false);
  });

  it('opens the search window from the box and keeps the fields when closed', () => {
    const { field, dialog, button } = mount();
    expect(dialog().open).toBe(false);
    act(() => button('Open').click());
    expect(dialog().open).toBe(true);
    type(field('Sun, Elevation, minimum'), '2');
    act(() => button('Close').click());
    expect(dialog().open).toBe(false);
    expect(container.querySelector('.sky-search__summary')?.textContent).toBe('1 condition');
    act(() => button('Open').click());
    expect(field('Sun, Elevation, minimum').value).toBe('2');
  });

  it('fills the form with an example', () => {
    const { field } = mount();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Try the example: Sun towards north"]')!.click());
    expect(field('Sun, Azimuth, minimum').value).toBe('350');
    expect(field('Sun, Azimuth, maximum').value).toBe('10');
    expect(container.textContent).toContain('wraps through north');
  });

  it('lists the possible values and blocks values that cannot occur at the site', () => {
    const { field, submit } = mount();
    const possible = (target: string) => container.querySelector(`.sky-search__possible[data-target="${target}"]`)?.textContent;
    expect(possible('sunElevation')).toBe('Possible here: -6.5° to 6.5°');
    expect(possible('sunAzimuth')).toBe('Possible here: any');
    expect(possible('earthElevation')).toBe('Possible here: -7.4° to 14.7°');
    expect(possible('earthAzimuth')).toBe('Possible here: 311.5° to 333.6°');
    type(field('Sun, Elevation, minimum'), '20');
    expect(submit().disabled).toBe(true);
    expect(container.textContent).toContain('Sun: never reaches these values from this point.');
    expect(field('Sun, Elevation, minimum').getAttribute('aria-invalid')).toBe('true');
    type(field('Sun, Elevation, minimum'), '5');
    expect(submit().disabled).toBe(false);
  });

  it('sends only the filled conditions and shows the match on the horizon', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(FOUND), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const { field, submit, onShow, dialog, button } = mount();
    act(() => button('Open').click());
    type(field('Earth, Elevation, minimum'), '1.2345');
    type(field('Earth, Elevation, maximum'), '1.24');
    await act(async () => submit().click());

    const url = new URL(String((fetch.mock.calls[0] as unknown[])[0]), 'http://localhost');
    expect(url.pathname).toBe('/api/sky-search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      site: 'nobile-rim-1',
      from: '2026-11-14T12:00:00Z',
      direction: 'nearest',
      earthEl: '1.2345,1.24',
    });
    expect(onShow).toHaveBeenCalledWith('2026-11-16T02:19:35Z');
    expect(container.textContent).toContain('2026-11-16 02:19:35 UTC');
    expect(container.textContent).toContain('+1 d 14 h 19 min 35 s');
    expect(container.querySelector('.sky-search__summary')?.textContent).toBe('1 condition · Last match: 2026-11-16 02:19:35 UTC');

    // The app selects the match; "Show on horizon" then only closes the window.
    act(() => root.render(<SkySearchPanel selection={{ ...selection, utc: '2026-11-16T02:19:35Z' }} onShow={onShow} />));
    expect(container.textContent).toContain('Already shown on the local horizon.');
    act(() => button('Show on horizon').click());
    expect(dialog().open).toBe(false);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('reports a search without matches', async () => {
    const notFound = { ...FOUND, outcome: { status: 'not-found', reason: 'no-match' } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(notFound), { status: 200 })));
    const { field, submit, onShow } = mount();
    type(field('Sun, Azimuth, minimum'), '350');
    type(field('Sun, Azimuth, maximum'), '10');
    expect(container.textContent).toContain('wraps through north');
    await act(async () => submit().click());
    expect(onShow).not.toHaveBeenCalled();
    expect(container.textContent).toContain('No date between 2026-10-13 12:00:00 UTC and 2026-12-16 12:00:00 UTC');
  });
});
