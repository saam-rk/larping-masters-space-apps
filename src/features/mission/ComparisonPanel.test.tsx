// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { findSite } from '../../../shared/sites';
import { fetchEphemeris, fetchEphemerisSeries, type EphemerisSelection } from '../../api/ephemerisClient';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { readAssumptions, EXAMPLE_INPUTS } from './assumptionsForm';
import { ComparisonPanel } from './ComparisonPanel';
import { useWindowSamples, type MissionState } from './useMission';

vi.mock('../../api/ephemerisClient', () => ({ fetchEphemeris: vi.fn(), fetchEphemerisSeries: vi.fn() }));
vi.mock('../../i18n/context', () => ({ useI18n: () => ({ locale: 'en', messages: MESSAGES.en }) }));

const text = MESSAGES.en.compare;
const site = findSite('nobile-rim-1');
const selection: EphemerisSelection = { siteId: site.id, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, utc: '2026-11-14T12:00:00Z' };
const mission: MissionState = { inputs: EXAMPLE_INPUTS, reading: readAssumptions(EXAMPLE_INPUTS), setInputs: () => undefined };

/** Sun elevation grows with the day of month (always well above the horizon). */
function response(target: EphemerisSelection): EphemerisResponse {
  const day = Number(target.utc.slice(8, 10));
  const sun = SAVED_SAMPLE.bodies.sun;
  if (sun.status !== 'ok') throw new Error('sample');
  return {
    ...SAVED_SAMPLE,
    provenance: 'live',
    requestedUtc: target.utc,
    ephemerisUtc: target.utc,
    bodies: { ...SAVED_SAMPLE.bodies, sun: { status: 'ok', observation: { ...sun.observation, elevationDeg: day / 10 } } },
  };
}

function Harness({ onShow }: { onShow: (selection: EphemerisSelection) => void }) {
  const windows = useWindowSamples();
  return (
    <ComparisonPanel
      selection={selection}
      mission={mission}
      windows={windows.windows}
      onLoadWindows={(selections) => void windows.load(selections)}
      onShow={onShow}
    />
  );
}

let container: HTMLDivElement;
let root: Root;
const onShow = vi.fn();

const button = (label: string) =>
  [...container.querySelectorAll('button')].find((element) => element.textContent === label) as HTMLButtonElement;

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
  vi.mocked(fetchEphemeris).mockImplementation(async (target) => ({ ok: true, data: response(target) }));
  vi.mocked(fetchEphemerisSeries).mockImplementation(async (request) => ({
    ok: true,
    frames: Array.from({ length: request.count }, () => response({ ...request.selection, utc: request.startUtc })),
  }));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness onShow={onShow} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('ComparisonPanel', () => {
  it('adds the current selection and a shifted copy, and shows them side by side', async () => {
    await act(async () => button(text.add.none).click());
    await act(async () => button(text.add.week).click());

    expect(fetchEphemeris).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchEphemeris).mock.calls.map(([target]) => target.utc)).toEqual(['2026-11-14T12:00:00Z', '2026-11-21T12:00:00Z']);
    const headers = [...container.querySelectorAll('.compare__scenario')].map((cell) => cell.textContent);
    expect(headers).toHaveLength(2);
    expect(headers[1]).toContain('2026-11-21 12:00:00 UTC');
    // Vertical panels (example assumption): incidence = elevation, so the lower Sun gives more power and is marked best.
    const powerRow = [...container.querySelectorAll('tr')].find((row) => row.querySelector('th')?.textContent === MESSAGES.en.mission.rows.power)!;
    const cells = powerRow.querySelectorAll('td');
    expect(cells[0]!.classList.contains('compare__best')).toBe(true);
    expect(cells[1]!.classList.contains('compare__best')).toBe(false);
  });

  it('refuses duplicates and more than four scenarios', async () => {
    await act(async () => button(text.add.none).click());
    await act(async () => button(text.add.none).click());
    expect(container.textContent).toContain(text.duplicate);
    expect(fetchEphemeris).toHaveBeenCalledTimes(1);

    await act(async () => button(text.add.day).click());
    await act(async () => button(text.add.week).click());
    await act(async () => button(text.add.halfMonth).click());
    expect(container.querySelectorAll('.compare__scenario')).toHaveLength(4);
    expect(button(text.add.none).disabled).toBe(true);
  });

  it('puts a scenario on the main view and removes scenarios', async () => {
    await act(async () => button(text.add.day).click());
    await act(async () => button(text.show).click());
    expect(onShow).toHaveBeenCalledWith({ ...selection, utc: '2026-11-15T12:00:00Z' });

    await act(async () => button(text.remove).click());
    expect(container.querySelectorAll('.compare__scenario')).toHaveLength(0);
    expect(container.textContent).toContain(text.empty);
  });

  it('screens the synodic-month window of every scenario on request', async () => {
    await act(async () => button(text.add.none).click());
    await act(async () => button(text.add.week).click());
    await act(async () => button(text.windows).click());

    expect(fetchEphemerisSeries).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchEphemerisSeries).mock.calls[0]![0]).toMatchObject({ startUtc: selection.utc, count: 100 });
    const shareRow = [...container.querySelectorAll('tr')].find(
      (row) => row.querySelector('th')?.textContent === MESSAGES.en.mission.windowRows.powerShare,
    )!;
    expect([...shareRow.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual(['100%', '100%']);
    expect(button(text.windows).disabled).toBe(true);
  });
});
