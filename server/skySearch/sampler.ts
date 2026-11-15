/**
 * Horizons-backed sampler for the inverse search: one Az/El range request per
 * conditioned body, made one after another (JPL asks API clients to send one
 * request at a time), merged on a common time axis. The Sun–Earth separation
 * is computed from both bodies' values at each time tag
 * (`angularSeparationDeg`); it is missing where either value is.
 */

import type { BodyId } from '../../shared/ephemeris.js';
import { angularSeparationDeg, SKY_TARGETS, SKY_TARGET_INFO, type SkySearchSource, type SkyTarget } from '../../shared/skySearch.js';
import { fetchObserverSeries, fetchObserverTable, type HorizonsClientOptions } from '../horizons/client.js';
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
    const directions: Partial<Record<BodyId, Directions>> = {};

    for (const body of bodies) {
      requests += 1;
      // Horizons range tables require STOP_TIME > START_TIME. A one-sided
      // search at the supported boundary still includes that single instant.
      const result = startMs === stopMs
        ? await sampleInstant(body, startMs)
        : await fetchObserverSeries(
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
      directions[body] = { azimuthDeg: series.azimuthDeg, elevationDeg: series.elevationDeg };
      for (const target of SKY_TARGETS) {
        const info = SKY_TARGET_INFO[target];
        if (info.angle === 'separation' || info.bodies[0] !== body) continue;
        values[target] = info.angle === 'azimuth' ? series.azimuthDeg : series.elevationDeg;
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

    const { sun, earth } = directions;
    if (sun && earth) values.sunEarthSeparation = separationColumn(sun, earth);
    const merged: SkySeries = { times: times ?? [], values };
    return { ok: true, series: merged };
  };

  async function sampleInstant(body: BodyId, timeMs: number) {
    const result = await fetchObserverTable({ body, ...site, instant: new Date(timeMs) }, options, signal);
    if (!result.ok) return result;
    const { table } = result;
    return {
      ok: true as const,
      retrievedAt: result.retrievedAt,
      series: {
        ...table,
        times: [timeMs],
        azimuthDeg: [table.observation.azimuthDeg],
        elevationDeg: [table.observation.elevationDeg],
      },
    };
  }

  return { sample, requests: () => requests, source: () => source };
}

type Directions = { readonly azimuthDeg: readonly (number | null)[]; readonly elevationDeg: readonly (number | null)[] };

/** Sun–Earth separation at each time tag; `null` where a value is missing. */
function separationColumn(sun: Directions, earth: Directions): (number | null)[] {
  return sun.azimuthDeg.map((sunAz, index) => {
    const sunEl = sun.elevationDeg[index] ?? null;
    const earthAz = earth.azimuthDeg[index] ?? null;
    const earthEl = earth.elevationDeg[index] ?? null;
    if (sunAz === null || sunEl === null || earthAz === null || earthEl === null) return null;
    return angularSeparationDeg(sunAz, sunEl, earthAz, earthEl);
  });
}

function sameTimes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((time, index) => time === b[index]);
}
