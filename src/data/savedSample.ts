/**
 * Saved Horizons result for Apollo 11 at touchdown, shown before
 * the first live query. Labeled `saved-sample`; never present it as live.
 *
 * Generated from the raw fixtures in `server/horizons/__fixtures__/` and kept
 * in sync by `server/ephemeris/savedSample.test.ts`.
 */

import type { EphemerisResponse } from '../../shared/ephemeris';
import sample from '../../shared/samples/apollo-11_1969-07-20T20-17-40Z.json';

export const SAVED_SAMPLE = sample as EphemerisResponse;
