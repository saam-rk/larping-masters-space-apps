/**
 * HTTP client for the Horizons API. Classifies every failure into an
 * `ApiError` so callers never have to inspect raw fetch errors.
 */

import type { ApiError } from '../../shared/ephemeris.js';
import { parseObserverPayload, parseObserverSeries, type ParsedObserverSeries, type ParsedObserverTable } from './parse.js';
import { buildObserverRangeUrl, buildObserverUrl, HORIZONS_API_URL, type ObserverQuery, type ObserverRangeQuery } from './query.js';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface HorizonsClientOptions {
  readonly fetch?: FetchLike;
  /** Per-request timeout. Default 15 s. */
  readonly timeoutMs?: number;
  readonly baseUrl?: string;
  readonly now?: () => Date;
}

export const DEFAULT_HORIZONS_TIMEOUT_MS = 15_000;

export type ObserverTableResult =
  | { readonly ok: true; readonly table: ParsedObserverTable; readonly retrievedAt: Date; readonly url: string }
  | { readonly ok: false; readonly error: ApiError };

export async function fetchObserverTable(
  query: ObserverQuery,
  options: HorizonsClientOptions = {},
  signal?: AbortSignal,
): Promise<ObserverTableResult> {
  const url = buildObserverUrl(query, options.baseUrl ?? HORIZONS_API_URL);
  const fetched = await fetchPayload(url, options, signal);
  if (!fetched.ok) return fetched;
  const parsed = parseObserverPayload(fetched.payload, query.body);
  if (!parsed.ok) return parsed;
  return { ok: true, table: parsed.table, retrievedAt: fetched.retrievedAt, url };
}

export type ObserverSeriesResult =
  | { readonly ok: true; readonly series: ParsedObserverSeries; readonly retrievedAt: Date; readonly url: string }
  | { readonly ok: false; readonly error: ApiError };

/** Az/El sampled over a time range (see `buildObserverRangeParameters`). */
export async function fetchObserverSeries(
  query: ObserverRangeQuery,
  options: HorizonsClientOptions = {},
  signal?: AbortSignal,
): Promise<ObserverSeriesResult> {
  const url = buildObserverRangeUrl(query, options.baseUrl ?? HORIZONS_API_URL);
  const fetched = await fetchPayload(url, options, signal);
  if (!fetched.ok) return fetched;
  const parsed = parseObserverSeries(fetched.payload, query.body);
  if (!parsed.ok) return parsed;
  return { ok: true, series: parsed.series, retrievedAt: fetched.retrievedAt, url };
}

type PayloadResult =
  | { readonly ok: true; readonly payload: unknown; readonly retrievedAt: Date }
  | { readonly ok: false; readonly error: ApiError };

/** One GET to Horizons with timeout and failure classification; returns the decoded JSON. */
async function fetchPayload(url: string, options: HorizonsClientOptions, signal?: AbortSignal): Promise<PayloadResult> {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_HORIZONS_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: combinedSignal });
  } catch (cause) {
    const reason = timeout.aborted ? 'timed out' : signal?.aborted ? 'aborted by caller' : describe(cause);
    return unavailable(`request to Horizons ${reason}`);
  }

  const bodyText = await response.text().catch(() => '');

  if (response.status === 400 || response.status === 405) {
    return {
      ok: false,
      error: { code: 'UPSTREAM_REJECTED', detail: `Horizons HTTP ${response.status}: ${truncate(bodyText)}` },
    };
  }
  if (!response.ok) {
    // 500: database unavailable; 503: overload or maintenance (per API docs).
    return unavailable(`Horizons HTTP ${response.status}`);
  }

  try {
    return { ok: true, payload: JSON.parse(bodyText), retrievedAt: now() };
  } catch {
    return { ok: false, error: { code: 'UPSTREAM_FORMAT', detail: 'Horizons response is not valid JSON' } };
  }
}

function unavailable(detail: string): { readonly ok: false; readonly error: ApiError } {
  return { ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', detail } };
}

function describe(cause: unknown): string {
  return cause instanceof Error ? `failed: ${cause.message}` : 'failed';
}

function truncate(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
