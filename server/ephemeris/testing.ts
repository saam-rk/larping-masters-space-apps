/** Test helpers: a fetch stub that serves the saved Horizons fixtures by body. */

import type { FetchLike } from '../horizons/client.js';
import { FIXTURES, loadFixtureText } from '../horizons/__fixtures__/load.js';

export type BodyReply = { readonly status: number; readonly body: string } | 'network-error';

const OK_SUN: BodyReply = { status: 200, body: loadFixtureText(FIXTURES.nobileSun) };
const OK_EARTH: BodyReply = { status: 200, body: loadFixtureText(FIXTURES.nobileEarth) };

/** Serves Nobile angles as synthetic assembly data, with the requested observer
 * header. These are NOT scientific reference angles at the revised terrain height.
 * Explicit overrides remain untouched so malformed upstream metadata can be tested.
 */
export function fixtureFetch(overrides: { sun?: BodyReply; earth?: BodyReply } = {}): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fetch = async (url: string): Promise<Response> => {
    calls.push(url);
    const isEarth = url.includes('COMMAND=%27399%27');
    const reply = isEarth ? (overrides.earth ?? OK_EARTH) : (overrides.sun ?? OK_SUN);
    if (reply === 'network-error') throw new TypeError('fetch failed');
    const override = isEarth ? overrides.earth : overrides.sun;
    if (override === undefined) {
      const payload = JSON.parse(reply.body) as { result: string };
      const coords = new URL(url).searchParams.get('SITE_COORD')?.replaceAll("'", '') ?? '';
      payload.result = payload.result.replace(/Center geodetic\s*:[^{]+/, `Center geodetic : ${coords} `);
      return new Response(JSON.stringify(payload), { status: reply.status });
    }
    return new Response(reply.body, { status: reply.status });
  };
  return Object.assign(fetch, { calls });
}
