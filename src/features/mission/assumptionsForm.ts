/**
 * Text fields of the mission assumptions (see `shared/missionAssessment.ts`)
 * and their parsing. Fields keep what the user typed; the assessment uses the
 * parsed values only when every field is valid, so a half-typed number never
 * produces a result. Decimal comma and decimal point are both accepted.
 *
 * The typed values are remembered in this browser (`localStorage`), as a
 * per-viewer convenience; if storage is unavailable the example values load.
 */

import {
  EXAMPLE_ASSUMPTIONS,
  PANEL_ORIENTATIONS,
  type MissionAssumptions,
  type PanelOrientation,
} from '../../../shared/missionAssessment';

export const POWER_FIELDS = ['panelArea', 'efficiency', 'demand'] as const;
export const LINK_FIELDS = [
  'transmitPower',
  'transmitGain',
  'frequency',
  'gOverT',
  'dataRate',
  'requiredEbN0',
  'otherLosses',
  'requiredMargin',
  'earthMask',
] as const;
export type FieldId = (typeof POWER_FIELDS)[number] | (typeof LINK_FIELDS)[number];

interface FieldSpec {
  /** Unit symbol, shown as typed (not translated). */
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  /** `min` itself is not allowed (e.g. a zero area). */
  readonly minExclusive?: boolean;
}

export const FIELD_SPECS: Readonly<Record<FieldId, FieldSpec>> = {
  panelArea: { unit: 'm²', min: 0, max: 10_000, minExclusive: true },
  efficiency: { unit: '%', min: 0, max: 100, minExclusive: true },
  demand: { unit: 'W', min: 0, max: 1e7 },
  transmitPower: { unit: 'W', min: 0, max: 1e6, minExclusive: true },
  transmitGain: { unit: 'dBi', min: -50, max: 100 },
  frequency: { unit: 'GHz', min: 0, max: 1000, minExclusive: true },
  gOverT: { unit: 'dB/K', min: -100, max: 100 },
  dataRate: { unit: 'kbit/s', min: 0, max: 1e9, minExclusive: true },
  requiredEbN0: { unit: 'dB', min: -20, max: 50 },
  otherLosses: { unit: 'dB', min: 0, max: 200 },
  requiredMargin: { unit: 'dB', min: -50, max: 100 },
  earthMask: { unit: '°', min: -90, max: 90 },
};

export type AssumptionInputs = Readonly<Record<FieldId, string>> & { readonly orientation: PanelOrientation };

function exampleText(value: number): string {
  // Avoid binary noise such as 28.000000000000004 when converting fractions to percent.
  return String(Number(value.toPrecision(12)));
}

export const EXAMPLE_INPUTS: AssumptionInputs = {
  panelArea: exampleText(EXAMPLE_ASSUMPTIONS.power.panelAreaM2),
  efficiency: exampleText(EXAMPLE_ASSUMPTIONS.power.efficiency * 100),
  demand: exampleText(EXAMPLE_ASSUMPTIONS.power.demandW),
  orientation: EXAMPLE_ASSUMPTIONS.power.orientation,
  transmitPower: exampleText(EXAMPLE_ASSUMPTIONS.link.transmitPowerW),
  transmitGain: exampleText(EXAMPLE_ASSUMPTIONS.link.transmitGainDbi),
  frequency: exampleText(EXAMPLE_ASSUMPTIONS.link.frequencyGHz),
  gOverT: exampleText(EXAMPLE_ASSUMPTIONS.link.receiverGOverTDbK),
  dataRate: exampleText(EXAMPLE_ASSUMPTIONS.link.dataRateBps / 1000),
  requiredEbN0: exampleText(EXAMPLE_ASSUMPTIONS.link.requiredEbN0Db),
  otherLosses: exampleText(EXAMPLE_ASSUMPTIONS.link.otherLossesDb),
  requiredMargin: exampleText(EXAMPLE_ASSUMPTIONS.link.requiredMarginDb),
  earthMask: exampleText(EXAMPLE_ASSUMPTIONS.link.earthElevationMaskDeg),
};

/** A plain decimal number, with `.` or `,` as the decimal mark; `null` otherwise. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function fieldValue(id: FieldId, text: string): number | null {
  const value = parseDecimal(text);
  if (value === null) return null;
  const spec = FIELD_SPECS[id];
  if (value > spec.max || value < spec.min || (spec.minExclusive && value === spec.min)) return null;
  return value;
}

export interface AssumptionsReading {
  /** Every field valid: the assumptions to assess with. */
  readonly assumptions: MissionAssumptions | null;
  readonly invalid: readonly FieldId[];
}

export function readAssumptions(inputs: AssumptionInputs): AssumptionsReading {
  const values = {} as Record<FieldId, number>;
  const invalid: FieldId[] = [];
  for (const id of [...POWER_FIELDS, ...LINK_FIELDS]) {
    const value = fieldValue(id, inputs[id]);
    if (value === null) invalid.push(id);
    else values[id] = value;
  }
  if (invalid.length > 0) return { assumptions: null, invalid };
  return {
    invalid,
    assumptions: {
      power: {
        panelAreaM2: values.panelArea,
        efficiency: values.efficiency / 100,
        orientation: inputs.orientation,
        demandW: values.demand,
      },
      link: {
        transmitPowerW: values.transmitPower,
        transmitGainDbi: values.transmitGain,
        frequencyGHz: values.frequency,
        receiverGOverTDbK: values.gOverT,
        dataRateBps: values.dataRate * 1000,
        requiredEbN0Db: values.requiredEbN0,
        otherLossesDb: values.otherLosses,
        requiredMarginDb: values.requiredMargin,
        earthElevationMaskDeg: values.earthMask,
      },
    },
  };
}

const STORAGE_KEY = 'clps_mission_assumptions_v1';

export function loadInputs(): AssumptionInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EXAMPLE_INPUTS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<string, string> = { ...EXAMPLE_INPUTS };
    for (const id of [...POWER_FIELDS, ...LINK_FIELDS]) {
      if (typeof stored[id] === 'string') next[id] = stored[id];
    }
    const orientation = (PANEL_ORIENTATIONS as readonly unknown[]).includes(stored.orientation)
      ? (stored.orientation as PanelOrientation)
      : EXAMPLE_INPUTS.orientation;
    return { ...(next as Record<FieldId, string>), orientation };
  } catch {
    return EXAMPLE_INPUTS;
  }
}

export function saveInputs(inputs: AssumptionInputs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Storage blocked or full: the values still work for this visit.
  }
}
