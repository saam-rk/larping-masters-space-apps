/**
 * Mission assumptions shared by the assessment box and the scenario
 * comparison, and the screening-window request both use.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { WINDOW_SAMPLES, WINDOW_STEP_MINUTES, type CriterionWindow } from '../../../shared/missionAssessment';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../../shared/time';
import { formatMinutes } from '../../format';
import { fetchEphemerisSeries, type ClientError, type EphemerisSelection } from '../../api/ephemerisClient';
import { loadInputs, readAssumptions, saveInputs, type AssumptionInputs, type AssumptionsReading } from './assumptionsForm';

export interface MissionState {
  readonly inputs: AssumptionInputs;
  readonly reading: AssumptionsReading;
  readonly setInputs: (update: (current: AssumptionInputs) => AssumptionInputs) => void;
}

export function useMission(): MissionState {
  const [inputs, setInputsState] = useState<AssumptionInputs>(loadInputs);
  useEffect(() => saveInputs(inputs), [inputs]);
  const setInputs = useCallback((update: (current: AssumptionInputs) => AssumptionInputs) => setInputsState(update), []);
  return { inputs, reading: readAssumptions(inputs), setInputs };
}

/** The data on screen as a selection, so its screening window can be requested. */
export function dataSelection(data: EphemerisResponse): EphemerisSelection {
  return {
    siteId: data.site.id,
    latitudeDeg: data.site.latitudeDeg,
    longitudeEastDeg: data.site.longitudeEastDeg,
    utc: data.requestedUtc,
  };
}

/** Longest run without the criterion, e.g. `2 d 9 h 40 min`; `0 min` when there is none. */
export function windowGap(window: CriterionWindow): string | null {
  return window.longestGapMinutes === null ? null : formatMinutes(window.longestGapMinutes);
}

/** Same point and instant, regardless of how the point was chosen. */
export function selectionKey(selection: EphemerisSelection): string {
  return `${selection.latitudeDeg}|${selection.longitudeEastDeg}|${selection.utc}`;
}

/** The screening window starting at `utc` stays inside the supported range. */
export function windowFits(utc: string): boolean {
  const start = parseUtcInstant(utc);
  if (!start.ok) return false;
  const endMs = start.instant.getTime() + (WINDOW_SAMPLES - 1) * WINDOW_STEP_MINUTES * 60_000;
  return endMs < Date.parse(SUPPORTED_UTC_RANGE.endExclusive);
}

export type WindowState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'done'; readonly frames: readonly EphemerisResponse[] }
  | { readonly status: 'error'; readonly error: ClientError };

/**
 * Screening-window samples per scenario (keyed by `selectionKey`), loaded on
 * request one scenario at a time. Frames are kept, not statistics, so a
 * change of assumptions is reflected without another request.
 */
export function useWindowSamples() {
  const [windows, setWindows] = useState<Readonly<Record<string, WindowState>>>({});
  const controllers = useRef(new Map<string, AbortController>());
  const completed = useRef(new Set<string>());
  useEffect(() => {
    const active = controllers.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const load = useCallback(async (selections: readonly EphemerisSelection[]) => {
    // Reserve the whole queue synchronously: another panel or click may ask
    // for a key before React renders its loading state or its turn starts.
    const queue = selections.flatMap((selection) => {
      const key = selectionKey(selection);
      if (controllers.current.has(key) || completed.current.has(key)) return [];
      const controller = new AbortController();
      controllers.current.set(key, controller);
      return [{ selection, key, controller }];
    });
    if (queue.length === 0) return;
    setWindows((current) => ({ ...current, ...Object.fromEntries(queue.map(({ key }) => [key, { status: 'loading' } as const])) }));
    for (const { selection, key, controller } of queue) {
      if (controller.signal.aborted) return;
      const result = await fetchEphemerisSeries(
        { selection, startUtc: selection.utc, stepMinutes: WINDOW_STEP_MINUTES, count: WINDOW_SAMPLES },
        controller.signal,
      );
      controllers.current.delete(key);
      if (controller.signal.aborted) return;
      if (result.ok) completed.current.add(key);
      else console.error('[mission-window]', result.error.key, result.error.detail);
      setWindows((current) => ({
        ...current,
        [key]: result.ok ? { status: 'done', frames: result.frames } : { status: 'error', error: result.error },
      }));
    }
  }, []);

  return { windows, load };
}
