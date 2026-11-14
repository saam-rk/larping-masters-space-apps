/**
 * Horizons-backed sampler for the inverse search: one Az/El range request per
 * conditioned body, made one after another (JPL asks API clients to send one
 * request at a time), merged on a common time axis.
 */

import type { BodyId } from '../../shared/ephemeris.js';
import { SKY_TARGETS, SKY_TARGET_INFO, type SkySearchSource, type SkyTarget } from '../../shared/skySearch.js';
import { fetchObserverSeries, type HorizonsClientOptions } from '../horizons/client.js';
import { HORIZONS_API_URL } from '../horizons/query.js';
import type { Sampler, SkySeries } from './search.js';

export interface HorizonsSamplerSite {
  readonly latitudeDeg: number;
  readonly longitudeEastDeg: number;
  readonly altitudeKm: number;
}

export interface HorizonsSampler {
  readonly sample: Sampler;
  /** Horizons requests made so far. */
  readonly requests: () => number;
  /** Provenance taken from the first successful response, or `null` before any. */
  readonly source: () => SkySearchSource | null;
}

export function createHorizonsSampler(
  site: HorizonsSamplerSite,
  bodies: readonly BodyId[],
  options: HorizonsClientOptions = {},
  signal?: AbortSignal,
): HorizonsSampler {
  let requests = 0;
  let source: SkySearchSource | null = null;

  const sample: Sampler = async (startMs, stopMs, step) => {
    let times: readonly number[] | null = null;
    const values: { [K in SkyTarget]?: readonly (number | null)[] } = {};

    for (const body of bodies) {
      requests += 1;
      const result = await fetchObserverSeries(
        { body, ...site, start: new Date(startMs), stop: new Date(stopMs), step },
        options,
        signal,
      );
      if (!result.ok) return result;
      const { series } = result;
      if (times !== null && !sameTimes(times, series.times)) {
        return { ok: false, error: { code: 'UPSTREAM_FORMAT', detail: 'Sun and Earth tables have different time tags' } };
      }
      times = series.times;
      for (const target of SKY_TARGETS) {
        const info = SKY_TARGET_INFO[target];
        if (info.body === body) values[target] = info.angle === 'azimuth' ? series.azimuthDeg : series.elevationDeg;
      }
      source ??= {
        name: 'NASA/JPL Horizons API',
        url: HORIZONS_API_URL,
        apiVersion: series.apiVersion,
        planetaryEphemeris: series.planetaryEphemeris,
        observerFrame: series.observerFrame,
        retrievedAt: result.retrievedAt.toISOString(),
      };
    }

    const merged: SkySeries = { times: times ?? [], values };
    return { ok: true, series: merged };
  };

  return { sample, requests: () => requests, source: () => source };
}

function sameTimes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((time, index) => time === b[index]);
}
