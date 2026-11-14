/**
 * HTTP client for the Horizons API. Classifies every failure into an
 * `ApiError` so callers never have to inspect raw fetch errors.
 */

import type { ApiError } from '../../shared/ephemeris.js';
import { parseObserverPayload, type ParsedObserverTable } from './parse.js';
import { buildObserverUrl, HORIZONS_API_URL, type ObserverQuery } from './query.js';

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
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const url = buildObserverUrl(query, options.baseUrl ?? HORIZONS_API_URL);
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

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return { ok: false, error: { code: 'UPSTREAM_FORMAT', detail: 'Horizons response is not valid JSON' } };
  }

  const parsed = parseObserverPayload(payload, query.body);
  if (!parsed.ok) return parsed;
  return { ok: true, table: parsed.table, retrievedAt: now(), url };
}

function unavailable(detail: string): ObserverTableResult {
  return { ok: false, error: { code: 'UPSTREAM_UNAVAILABLE', detail } };
}

function describe(cause: unknown): string {
  return cause instanceof Error ? `failed: ${cause.message}` : 'failed';
}

function truncate(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
