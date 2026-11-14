import type { ApiError, ApiErrorResponse } from '../shared/ephemeris.js';

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function errorResponse(status: number, error: ApiError, headers: Record<string, string> = {}): Response {
  const body: ApiErrorResponse = { error };
  return jsonResponse(status, body, { 'Cache-Control': 'no-store', ...headers });
}
