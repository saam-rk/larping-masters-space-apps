/**
 * Ready-made conditions for the inverse search window: one click fills the
 * form so a first-time user sees how ranges, open-ended bounds and the
 * north wrap are typed. They are input examples, not recommended conditions,
 * and they can still be impossible or unmet at a given site (the form checks
 * them like any typed value).
 */

import { EMPTY_INPUTS, type ConditionInputs } from './conditionForm';

export const SKY_SEARCH_EXAMPLES = ['sunLow', 'earthUp', 'sunNorth', 'both'] as const;
export type SkySearchExample = (typeof SKY_SEARCH_EXAMPLES)[number];

export const EXAMPLE_INPUTS: { readonly [K in SkySearchExample]: ConditionInputs } = {
  // A range: the Sun between 0° and 2° of elevation.
  sunLow: { ...EMPTY_INPUTS, sunElevation: { min: '0', max: '2' } },
  // "At least 0°": the upper bound is the elevation limit.
  earthUp: { ...EMPTY_INPUTS, earthElevation: { min: '0', max: '90' } },
  // Minimum above maximum: the azimuth range wraps through north.
  sunNorth: { ...EMPTY_INPUTS, sunAzimuth: { min: '350', max: '10' } },
  // Two bodies at once.
  both: { ...EMPTY_INPUTS, sunElevation: { min: '0', max: '90' }, earthElevation: { min: '0', max: '90' } },
};
