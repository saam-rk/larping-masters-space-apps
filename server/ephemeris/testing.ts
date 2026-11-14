/** Test helpers: a fetch stub that serves the saved Horizons fixtures by body. */

import type { FetchLike } from '../horizons/client.js';
import { FIXTURES, loadFixtureText } from '../horizons/__fixtures__/load.js';

export type BodyReply = { readonly status: number; readonly body: string } | 'network-error';

const OK_SUN: BodyReply = { status: 200, body: loadFixtureText(FIXTURES.nobileSun) };
const OK_EARTH: BodyReply = { status: 200, body: loadFixtureText(FIXTURES.nobileEarth) };

/** Serves the Nobile Rim 1 fixtures unless a body's reply is overridden. */
export function fixtureFetch(overrides: { sun?: BodyReply; earth?: BodyReply } = {}): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fetch = async (url: string): Promise<Response> => {
    calls.push(url);
    const isEarth = url.includes('COMMAND=%27399%27');
    const reply = isEarth ? (overrides.earth ?? OK_EARTH) : (overrides.sun ?? OK_SUN);
    if (reply === 'network-error') throw new TypeError('fetch failed');
    return new Response(reply.body, { status: reply.status });
  };
  return Object.assign(fetch, { calls });
}
