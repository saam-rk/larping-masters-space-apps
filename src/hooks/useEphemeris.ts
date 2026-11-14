/**
 * Selection state plus the result currently displayed. The scene and the
 * results panel both read `data`, so they always show the same values.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EphemerisResponse } from '../../shared/ephemeris';
import { DEFAULT_SITE_ID, type SiteId } from '../../shared/sites';
import { DEFAULT_UTC } from '../../shared/time';
import { fetchEphemeris, type ClientError, type EphemerisSelection } from '../api/ephemerisClient';
import { SAVED_SAMPLE } from '../data/savedSample';

export interface EphemerisState {
  readonly selection: EphemerisSelection;
  /** Result on screen. Starts as the saved sample. */
  readonly data: EphemerisResponse;
  readonly loading: boolean;
  /** Last request error. The previous `data` stays on screen, labeled with its own site and time. */
  readonly error: ClientError | null;
  /** True when the selection differs from the site/time of `data`. */
  readonly stale: boolean;
  readonly setSiteId: (siteId: SiteId) => void;
  readonly setUtc: (utc: string) => void;
  readonly update: () => void;
}

export function useEphemeris(): EphemerisState {
  const [selection, setSelection] = useState<EphemerisSelection>({ siteId: DEFAULT_SITE_ID, utc: DEFAULT_UTC });
  const [data, setData] = useState<EphemerisResponse>(SAVED_SAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  const update = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setError(null);

    void fetchEphemeris(selection, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setData(result.data);
      } else {
        console.error('[ephemeris]', result.error.key, result.error.detail);
        setError(result.error);
      }
      setLoading(false);
    });
  }, [selection]);

  const setSiteId = useCallback((siteId: SiteId) => setSelection((current) => ({ ...current, siteId })), []);
  const setUtc = useCallback((utc: string) => setSelection((current) => ({ ...current, utc })), []);

  const stale = selection.siteId !== data.site.id || selection.utc !== data.requestedUtc;

  return { selection, data, loading, error, stale, setSiteId, setUtc, update };
}
