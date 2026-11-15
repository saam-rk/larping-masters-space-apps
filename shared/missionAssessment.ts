/**
 * Mission screening: checks one Horizons result (or a series of them) against
 * mission assumptions the user enters — solar array, power demand and a
 * direct-to-Earth radio link — and reports which criteria are met.
 *
 * This is a geometric screening aid, not a mission feasibility study. Every
 * number below is an upper bound under the stated assumptions:
 *
 * - Terrain is not modeled (the app's horizon is the Horizons reference plane
 *   at 0 km). A ridge or crater wall can block the Sun or the Earth that the
 *   geometry places above the horizon.
 * - Power ignores temperature, dust, cell degradation, shadowing by the lander
 *   itself, battery storage and conversion losses.
 * - The link ignores pointing losses, polarization, rain and atmospheric loss
 *   at the Earth station, and whether an Earth station actually has the Moon
 *   in view (Earth's rotation and the station network are not modeled). Put
 *   any of them into the "other losses" term.
 *
 * Power model (per instant):
 *   irradiance  = S0 / r²            S0 = 1361 W/m² at 1 au (IAU 2015 Resolution B3,
 *                                    nominal total solar irradiance), r = Sun range in au
 *   P           = irradiance × f × cos(incidence) × area × efficiency
 *   f           = fraction of the solar disk above the reference horizon, uniform
 *                 disk (no limb darkening), from the Horizons elevation of the
 *                 disk center and its angular diameter
 *   incidence   = angle between the Sun's center and the panel normal:
 *                 vertical panel turned to the Sun's azimuth → elevation,
 *                 horizontal panel → 90° − elevation, two-axis tracking → 0°
 *
 * Link model (per instant), standard free-space link budget:
 *   d           = Earth range (au) × 149 597 870 700 m (IAU 2012 Resolution B2)
 *   FSPL        = 20 log10(4π d f / c)                (ITU-R P.525)
 *   C/N0        = EIRP − FSPL − other losses + G/T − 10 log10(k)
 *   Eb/N0       = C/N0 − 10 log10(Rb)
 *   margin      = Eb/N0 − required Eb/N0
 *   c = 299 792 458 m/s and k = 1.380649 × 10⁻²³ J/K are exact SI values.
 *   The link counts only when the Earth's center is at or above the user's
 *   elevation mask.
 *
 * Missing values stay `null` and make the criterion "unknown"; they are never
 * replaced with zero.
 */

import type { BodyResult, EphemerisResponse } from './ephemeris.js';

/** IAU 2015 Resolution B3 nominal total solar irradiance at 1 au, W/m². */
export const SOLAR_IRRADIANCE_1AU_W_M2 = 1361;
/** IAU 2012 Resolution B2 astronomical unit, metres (exact). */
export const ASTRONOMICAL_UNIT_M = 149_597_870_700;
/** Speed of light in vacuum, m/s (exact, SI). */
export const SPEED_OF_LIGHT_M_S = 299_792_458;
/** Boltzmann constant, J/K (exact, SI). */
export const BOLTZMANN_J_K = 1.380649e-23;
/** 10 log10(k), dBW/(K·Hz): about −228.6. */
export const BOLTZMANN_DB = 10 * Math.log10(BOLTZMANN_J_K);

export const PANEL_ORIENTATIONS = ['vertical', 'horizontal', 'tracking'] as const;
export type PanelOrientation = (typeof PANEL_ORIENTATIONS)[number];

export interface PowerAssumptions {
  /** Active solar array area, m². */
  readonly panelAreaM2: number;
  /** Array conversion efficiency, fraction in (0, 1]. */
  readonly efficiency: number;
  readonly orientation: PanelOrientation;
  /** Power the mission needs at that instant, W. */
  readonly demandW: number;
}

export interface LinkAssumptions {
  /** Lander transmitter RF output power, W. */
  readonly transmitPowerW: number;
  /** Lander antenna gain, dBi. */
  readonly transmitGainDbi: number;
  /** Carrier frequency, GHz. */
  readonly frequencyGHz: number;
  /** Earth station figure of merit G/T, dB/K. */
  readonly receiverGOverTDbK: number;
  /** Data rate, bit/s. */
  readonly dataRateBps: number;
  /** Eb/N0 the modulation and coding need, dB. */
  readonly requiredEbN0Db: number;
  /** Every loss not modeled (pointing, polarization, station atmosphere, implementation), dB. */
  readonly otherLossesDb: number;
  /** Minimum margin above the required Eb/N0 for the link to count, dB. */
  readonly requiredMarginDb: number;
  /** Minimum elevation of the Earth's center, degrees. */
  readonly earthElevationMaskDeg: number;
}

export interface MissionAssumptions {
  readonly power: PowerAssumptions;
  readonly link: LinkAssumptions;
}

/**
 * Starting values so the screen is not empty. They are illustrative inputs,
 * not taken from any mission, lander or ground station; the interface says so
 * and lets the user replace every one.
 */
export const EXAMPLE_ASSUMPTIONS: MissionAssumptions = {
  power: { panelAreaM2: 2, efficiency: 0.28, orientation: 'vertical', demandW: 150 },
  link: {
    transmitPowerW: 10,
    transmitGainDbi: 20,
    frequencyGHz: 8.4,
    receiverGOverTDbK: 40,
    dataRateBps: 1_000_000,
    requiredEbN0Db: 2.5,
    otherLossesDb: 3,
    requiredMarginDb: 3,
    earthElevationMaskDeg: 0,
  },
};

export type CriterionStatus = 'met' | 'not-met' | 'unknown';

export interface PowerEstimate {
  /** Solar irradiance at the Moon (top of disk, no terrain), W/m². */
  readonly irradianceWM2: number | null;
  /** Fraction of the solar disk above the reference horizon, 0..1. */
  readonly diskFraction: number | null;
  /** Cosine of the incidence angle on the panel, 0..1. */
  readonly incidenceFactor: number | null;
  /** Electrical power at the array output, W. */
  readonly powerW: number | null;
  readonly status: CriterionStatus;
}

export interface LinkEstimate {
  readonly earthElevationDeg: number | null;
  /** The Earth's center is at or above the mask. */
  readonly earthAboveMask: boolean | null;
  readonly distanceKm: number | null;
  readonly freeSpaceLossDb: number | null;
  /** Carrier-to-noise-density ratio at the Earth station, dB·Hz. */
  readonly cOverN0DbHz: number | null;
  readonly ebN0Db: number | null;
  /** Eb/N0 minus the required Eb/N0, dB. */
  readonly marginDb: number | null;
  readonly status: CriterionStatus;
}

export interface InstantAssessment {
  readonly power: PowerEstimate;
  readonly link: LinkEstimate;
  /** `met` only when every criterion is met; `not-met` when any is not; otherwise `unknown`. */
  readonly overall: CriterionStatus;
}

function observation(result: BodyResult) {
  return result.status === 'ok' ? result.observation : null;
}

/**
 * Fraction of a uniform disk of angular radius `radiusDeg` whose center is
 * `elevationDeg` above a straight horizon line (small-angle, flat-sky
 * approximation, accurate for the Sun's ~0.27° radius).
 */
export function diskFractionAbove(elevationDeg: number, radiusDeg: number): number {
  if (!(radiusDeg > 0)) return elevationDeg >= 0 ? 1 : 0;
  const h = elevationDeg / radiusDeg;
  if (h >= 1) return 1;
  if (h <= -1) return 0;
  // Area of the circular segment below the line, for a unit circle whose center is |h| from it.
  const a = Math.abs(h);
  const segment = Math.acos(a) - a * Math.sqrt(1 - a * a);
  const below = segment / Math.PI;
  return h >= 0 ? 1 - below : below;
}

export function incidenceFactor(elevationDeg: number, orientation: PanelOrientation): number {
  const elevation = (elevationDeg * Math.PI) / 180;
  if (orientation === 'tracking') return 1;
  if (orientation === 'vertical') return Math.max(0, Math.cos(elevation));
  return Math.max(0, Math.sin(elevation));
}

export function estimatePower(sun: BodyResult, power: PowerAssumptions): PowerEstimate {
  const sunObs = observation(sun);
  const elevation = sunObs?.elevationDeg ?? null;
  const range = sunObs?.rangeAu ?? null;
  const diameter = sunObs?.angularDiameterArcsec ?? null;
  const irradiance = range !== null && range > 0 ? SOLAR_IRRADIANCE_1AU_W_M2 / (range * range) : null;
  const fraction = elevation !== null && diameter !== null ? diskFractionAbove(elevation, diameter / 7200) : null;
  const incidence = elevation !== null ? incidenceFactor(elevation, power.orientation) : null;
  const powerW =
    irradiance !== null && fraction !== null && incidence !== null
      ? irradiance * fraction * incidence * power.panelAreaM2 * power.efficiency
      : null;
  const status: CriterionStatus = powerW === null ? 'unknown' : powerW >= power.demandW ? 'met' : 'not-met';
  return { irradianceWM2: irradiance, diskFraction: fraction, incidenceFactor: incidence, powerW, status };
}

export function freeSpaceLossDb(distanceM: number, frequencyHz: number): number {
  return 20 * Math.log10((4 * Math.PI * distanceM * frequencyHz) / SPEED_OF_LIGHT_M_S);
}

export function estimateLink(earth: BodyResult, link: LinkAssumptions): LinkEstimate {
  const earthObs = observation(earth);
  const elevation = earthObs?.elevationDeg ?? null;
  const range = earthObs?.rangeAu ?? null;
  const aboveMask = elevation === null ? null : elevation >= link.earthElevationMaskDeg;
  if (range === null || !(range > 0)) {
    return {
      earthElevationDeg: elevation,
      earthAboveMask: aboveMask,
      distanceKm: null,
      freeSpaceLossDb: null,
      cOverN0DbHz: null,
      ebN0Db: null,
      marginDb: null,
      status: aboveMask === false ? 'not-met' : 'unknown',
    };
  }
  const distanceM = range * ASTRONOMICAL_UNIT_M;
  const fspl = freeSpaceLossDb(distanceM, link.frequencyGHz * 1e9);
  const eirp = 10 * Math.log10(link.transmitPowerW) + link.transmitGainDbi;
  const cOverN0 = eirp - fspl - link.otherLossesDb + link.receiverGOverTDbK - BOLTZMANN_DB;
  const ebN0 = cOverN0 - 10 * Math.log10(link.dataRateBps);
  const margin = ebN0 - link.requiredEbN0Db;
  let status: CriterionStatus;
  if (aboveMask === false) status = 'not-met';
  else if (aboveMask === null) status = 'unknown';
  else status = margin >= link.requiredMarginDb ? 'met' : 'not-met';
  return {
    earthElevationDeg: elevation,
    earthAboveMask: aboveMask,
    distanceKm: distanceM / 1000,
    freeSpaceLossDb: fspl,
    cOverN0DbHz: cOverN0,
    ebN0Db: ebN0,
    marginDb: margin,
    status,
  };
}

export function combineStatus(statuses: readonly CriterionStatus[]): CriterionStatus {
  if (statuses.includes('not-met')) return 'not-met';
  if (statuses.includes('unknown')) return 'unknown';
  return 'met';
}

export function assessInstant(data: EphemerisResponse, assumptions: MissionAssumptions): InstantAssessment {
  const power = estimatePower(data.bodies.sun, assumptions.power);
  const link = estimateLink(data.bodies.earth, assumptions.link);
  return { power, link, overall: combineStatus([power.status, link.status]) };
}

/** Share of samples (with data) that meet a criterion, and the longest run that does not. */
export interface CriterionWindow {
  /** Samples meeting the criterion / samples with data; `null` when no sample has data. */
  readonly fraction: number | null;
  /** Longest run of consecutive samples that do not meet it, in minutes (run length × step). `null` without data. */
  readonly longestGapMinutes: number | null;
  /** Samples without data for this criterion. */
  readonly unknownSamples: number;
}

export interface WindowAssessment {
  readonly samples: number;
  readonly stepMinutes: number;
  readonly power: CriterionWindow;
  readonly link: CriterionWindow;
  /** Both power and link met at the same sample. */
  readonly both: CriterionWindow;
  /** Mean array output over the samples with a power value, W. */
  readonly meanPowerW: number | null;
}

function criterionWindow(statuses: readonly CriterionStatus[], stepMinutes: number): CriterionWindow {
  let known = 0;
  let met = 0;
  let run = 0;
  let longest = 0;
  for (const status of statuses) {
    if (status === 'unknown') {
      // An unknown sample neither extends nor breaks a gap: it is simply not counted.
      continue;
    }
    known++;
    if (status === 'met') {
      met++;
      run = 0;
    } else {
      run++;
      longest = Math.max(longest, run);
    }
  }
  return {
    fraction: known === 0 ? null : met / known,
    longestGapMinutes: known === 0 ? null : longest * stepMinutes,
    unknownSamples: statuses.length - known,
  };
}

/**
 * Screening over equally spaced samples. Fractions are sample counts, not
 * time integrals, and gaps are only resolved to one step.
 */
export function assessWindow(frames: readonly EphemerisResponse[], stepMinutes: number, assumptions: MissionAssumptions): WindowAssessment {
  const instants = frames.map((frame) => assessInstant(frame, assumptions));
  const powers = instants.map((instant) => instant.power.powerW).filter((value): value is number => value !== null);
  return {
    samples: frames.length,
    stepMinutes,
    power: criterionWindow(instants.map((instant) => instant.power.status), stepMinutes),
    link: criterionWindow(instants.map((instant) => instant.link.status), stepMinutes),
    both: criterionWindow(instants.map((instant) => combineStatus([instant.power.status, instant.link.status])), stepMinutes),
    meanPowerW: powers.length === 0 ? null : powers.reduce((sum, value) => sum + value, 0) / powers.length,
  };
}

/** Screening window: about one mean synodic month (29.530589 d, NASA GSFC) in 100 samples from the scenario instant. */
export const WINDOW_SAMPLES = 100;
export const WINDOW_STEP_MINUTES = Math.round((29.530589 * 24 * 60) / (WINDOW_SAMPLES - 1));
