/**
 * Selection state plus the result currently displayed. The scene and the
 * results panel both read `data`, so they always show the same values.
 *
 * The page starts at the default site (Apollo 11) and the current time, and
 * queries that selection once on load. The saved sample (Apollo 11 at
 * touchdown) stays on screen, labeled as a sample, until the answer arrives
 * or if the query fails.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EphemerisResponse } from '../../shared/ephemeris';
import { DEFAULT_SITE_ID, findSite, siteAt, type SiteId } from '../../shared/sites';
import { currentUtc } from '../../shared/time';
import { fetchEphemeris, type ClientError, type EphemerisSelection } from '../api/ephemerisClient';
import { SAVED_SAMPLE } from '../data/savedSample';

export interface EphemerisState {
  readonly selection: EphemerisSelection;
  /** Result on screen. Starts as the saved sample, until the first query answers. */
  readonly data: EphemerisResponse;
  readonly loading: boolean;
  /** Last request error. The previous `data` stays on screen, labeled with its own site and time. */
  readonly error: ClientError | null;
  /** True when the selection differs from the site/time of `data`. */
  readonly stale: boolean;
  readonly setSiteId: (siteId: SiteId) => void;
  /** Checked coordinates (see `checkCoordinates`); matching a reference site selects it. */
  readonly setCoordinates: (latitudeDeg: number, longitudeEastDeg: number) => void;
  readonly setUtc: (utc: string) => void;
  readonly update: () => void;
  /** Selects another instant for the current site and queries it right away (e.g. an inverse search match). */
  readonly showUtc: (utc: string) => void;
}

const DEFAULT_SITE = findSite(DEFAULT_SITE_ID);

export function useEphemeris(): EphemerisState {
  const [selection, setSelection] = useState<EphemerisSelection>(() => ({
    siteId: DEFAULT_SITE.id,
    latitudeDeg: DEFAULT_SITE.latitudeDeg,
    longitudeEastDeg: DEFAULT_SITE.longitudeEastDeg,
    utc: currentUtc(),
  }));
  const [data, setData] = useState<EphemerisResponse>(SAVED_SAMPLE);
  // True from the start: the selection is queried on load.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ClientError | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const run = useCallback((target: EphemerisSelection) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setError(null);

    void fetchEphemeris(target, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setData(result.data);
      } else {
        console.error('[ephemeris]', result.error.key, result.error.detail);
        setError(result.error);
      }
      setLoading(false);
    });
  }, []);

  const update = useCallback(() => run(selection), [run, selection]);

  // First query: the starting selection (current time), once on load.
  const initial = useRef(selection);
  useEffect(() => {
    run(initial.current);
  }, [run]);

  const showUtc = useCallback(
    (utc: string) => {
      const next = { ...selection, utc };
      setSelection(next);
      run(next);
    },
    [run, selection],
  );

  const setSiteId = useCallback((siteId: SiteId) => {
    const site = findSite(siteId);
    setSelection((current) => ({
      ...current,
      siteId,
      latitudeDeg: site.latitudeDeg,
      longitudeEastDeg: site.longitudeEastDeg,
    }));
  }, []);

  const setCoordinates = useCallback((latitudeDeg: number, longitudeEastDeg: number) => {
    const site = siteAt(latitudeDeg, longitudeEastDeg);
    setSelection((current) => ({ ...current, siteId: site.id, latitudeDeg, longitudeEastDeg }));
  }, []);

  const setUtc = useCallback((utc: string) => setSelection((current) => ({ ...current, utc })), []);

  const stale =
    selection.siteId !== data.site.id ||
    selection.latitudeDeg !== data.site.latitudeDeg ||
    selection.longitudeEastDeg !== data.site.longitudeEastDeg ||
    selection.utc !== data.requestedUtc;

  return { selection, data, loading, error, stale, setSiteId, setCoordinates, setUtc, update, showUtc };
}
