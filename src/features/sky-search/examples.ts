/**
 * Ready-made conditions for the inverse search window: one click fills the
 * form so a first-time user sees how ranges, open-ended bounds and the
 * north wrap are typed. They are input examples, not recommended conditions,
 * and they can still be impossible or unmet at a given site (the form checks
 * them like any typed value).
 *
 * The two eclipse examples look for the next eclipse seen from the site (they
 * also set the search direction to "after"): the Sun–Earth separation
 * thresholds come from `shared/eclipses.ts`, and the body that has to be seen
 * must be above the reference horizon (center elevation 0° to 90°).
 */

import { SOLAR_ECLIPSE_MAX_SEPARATION_DEG, TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG } from '../../../shared/eclipses';
import type { SkySearchDirection } from '../../../shared/skySearch';
import { EMPTY_INPUTS, type ConditionInputs } from './conditionForm';

export const SKY_SEARCH_EXAMPLES = ['sunLow', 'earthUp', 'sunNorth', 'both', 'solarEclipse', 'terrestrialEclipse'] as const;
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
  // The Earth covers part of the Sun while the Sun is above the horizon.
  solarEclipse: {
    ...EMPTY_INPUTS,
    sunElevation: { min: '0', max: '90' },
    sunEarthSeparation: { min: '0', max: String(SOLAR_ECLIPSE_MAX_SEPARATION_DEG) },
  },
  // The Moon's shadow is on the Earth while the Earth is above the horizon.
  terrestrialEclipse: {
    ...EMPTY_INPUTS,
    earthElevation: { min: '0', max: '90' },
    sunEarthSeparation: { min: String(TERRESTRIAL_ECLIPSE_MIN_SEPARATION_DEG), max: '180' },
  },
};

/** Search direction an example sets (the others keep the one chosen). */
export const EXAMPLE_DIRECTIONS: { readonly [K in SkySearchExample]?: SkySearchDirection } = {
  solarEclipse: 'after',
  terrestrialEclipse: 'after',
};
