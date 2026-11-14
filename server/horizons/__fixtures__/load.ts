/** Test helpers for the raw Horizons fixtures in this folder. */

import { readFileSync } from 'node:fs';

export const FIXTURES = {
  nobileSun: 'nobile-rim-1_2026-11-14T12-00-00Z_sun.json',
  nobileEarth: 'nobile-rim-1_2026-11-14T12-00-00Z_earth.json',
  unreadableTlist: 'error_unreadable-tlist.json',
} as const;

/** Instant the Nobile Rim 1 fixtures were retrieved (see README.md). */
export const NOBILE_FIXTURE_RETRIEVED_AT = new Date('2026-11-14T08:38:36Z');

export function loadFixtureText(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
}

/** Top-level shape of a Horizons API JSON payload (`format=json`). */
export interface HorizonsJsonPayload {
  readonly signature?: { readonly version?: string; readonly source?: string };
  readonly result?: string;
  readonly error?: string;
}

export function loadFixture(name: string): HorizonsJsonPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(loadFixtureText(name));
  } catch (cause) {
    throw new Error(`Fixture ${name} is not valid JSON`, { cause });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Fixture ${name} is not a JSON object`);
  }
  return parsed as HorizonsJsonPayload;
}

/** Minimal fetch stub that answers with a fixed status and body. */
export function respondWith(status: number, body: string) {
  return async (): Promise<Response> => new Response(body, { status });
}
