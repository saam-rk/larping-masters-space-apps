/**
 * Text fields of the inverse search form and their reading. Each quantity has
 * a "min" and a "max" field: both filled is a range, one filled is an exact
 * value (compared at 4 decimals), none leaves the quantity free. A decimal
 * comma is accepted, as typed in Spanish. Rows that are well formed but that
 * the Sun or the Earth can never meet at the site (`shared/skyFeasibility.ts`)
 * block the search too.
 */

import type { BodyId } from '../../../shared/ephemeris';
import { impossibleBodies, type SiteCoordinates } from '../../../shared/skyFeasibility';

import {
  ANGLE_BOUNDS,
  checkRange,
  parseAngleText,
  SKY_TARGET_INFO,
  SKY_TARGETS,
  type AngleRange,
  type SkyConditions,
  type SkyTarget,
} from '../../../shared/skySearch';

export interface ConditionInput {
  readonly min: string;
  readonly max: string;
}

export type ConditionInputs = { readonly [K in SkyTarget]: ConditionInput };

export const EMPTY_INPUTS: ConditionInputs = {
  sunAzimuth: { min: '', max: '' },
  sunElevation: { min: '', max: '' },
  earthAzimuth: { min: '', max: '' },
  earthElevation: { min: '', max: '' },
  sunEarthSeparation: { min: '', max: '' },
};

export type RowError = 'format' | 'bounds' | 'order';

export type RowState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ok'; readonly range: AngleRange }
  | { readonly kind: 'invalid'; readonly reason: RowError; readonly field: 'min' | 'max' | 'both' };

function readNumber(text: string): number | null | 'empty' {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return 'empty';
  return parseAngleText(trimmed);
}

export function readRow(target: SkyTarget, input: ConditionInput): RowState {
  const min = readNumber(input.min);
  const max = readNumber(input.max);
  if (min === 'empty' && max === 'empty') return { kind: 'empty' };
  if (min === null) return { kind: 'invalid', reason: 'format', field: 'min' };
  if (max === null) return { kind: 'invalid', reason: 'format', field: 'max' };
  const low = min === 'empty' ? (max as number) : min;
  const high = max === 'empty' ? low : max;
  const angle = SKY_TARGET_INFO[target].angle;
  const checked = checkRange(angle, low, high);
  if (checked.ok) return { kind: 'ok', range: checked.range };
  if (checked.reason === 'order') return { kind: 'invalid', reason: 'order', field: 'both' };
  const [lowBound, highBound] = ANGLE_BOUNDS[angle];
  const outside = (value: number | 'empty') => value !== 'empty' && (value < lowBound || value > highBound);
  const field = outside(min) && !outside(max) ? 'min' : outside(max) && !outside(min) ? 'max' : 'both';
  return { kind: 'invalid', reason: 'bounds', field };
}

export interface FormReading {
  readonly rows: { readonly [K in SkyTarget]: RowState };
  /** Number of quantities with a condition. */
  readonly active: number;
  /** Bodies whose well-formed rows cannot occur at the site (azimuth and elevation together). */
  readonly impossible: readonly BodyId[];
  /** Conditions to send, or `null` when a row is invalid or impossible, or none is filled. */
  readonly conditions: SkyConditions | null;
}

export function readForm(inputs: ConditionInputs, site: SiteCoordinates): FormReading {
  const rows = Object.fromEntries(SKY_TARGETS.map((target) => [target, readRow(target, inputs[target])])) as {
    [K in SkyTarget]: RowState;
  };
  const conditions: { [K in SkyTarget]?: AngleRange } = {};
  let invalid = false;
  for (const target of SKY_TARGETS) {
    const row = rows[target];
    if (row.kind === 'ok') conditions[target] = row.range;
    else if (row.kind === 'invalid') invalid = true;
  }
  const active = Object.keys(conditions).length;
  const impossible = impossibleBodies(site, conditions);
  return { rows, active, impossible, conditions: invalid || active === 0 || impossible.length > 0 ? null : conditions };
}
