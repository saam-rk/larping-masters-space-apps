/**
 * Meaning of the Horizons sky-presence markers for an observer on the Moon.
 *
 * Source: Horizons manual, "Solar Presence" and "Lunar/Interfering Body
 * Presence" (https://ssd.jpl.nasa.gov/horizons/manual.html), and the column
 * notes printed in each response:
 *   - Solar marker '*': solar upper limb on or above the apparent horizon.
 *     ' ': night (or body-centered ephemeris, which this app never requests).
 *   - Interfering-body marker 'i': upper limb of the interfering body on or
 *     above the apparent horizon; ' ': below. For a lunar observer the
 *     interfering body is the Earth (the response header names it).
 *   - 'r', 'e', 't', 's' event codes can replace the interfering-body marker;
 *     they say nothing about its presence, so they map to 'unknown'.
 *
 * "Horizon" here is the reference plane of the Horizons model. Terrain is not
 * included, so these states never prove visibility from the real ground.
 */

import type { BodyObservation } from './ephemeris.js';

export type PresenceState = 'upper-limb-above-reference-horizon' | 'below-reference-horizon' | 'unknown';

export function interpretSolarMarker(marker: string): PresenceState {
  if (marker === '*') return 'upper-limb-above-reference-horizon';
  if (marker === ' ' || marker === '') return 'below-reference-horizon';
  return 'unknown';
}

/**
 * Earth presence from the interfering-body marker. Returns 'unknown' unless
 * the response header confirms the interfering body is the Earth.
 */
export function interpretEarthMarker(marker: string, interferingBody: string | null): PresenceState {
  if (interferingBody?.toUpperCase() !== 'EARTH') return 'unknown';
  if (marker === 'i') return 'upper-limb-above-reference-horizon';
  if (marker === ' ' || marker === '') return 'below-reference-horizon';
  return 'unknown';
}

/** Presence state for the observation's own target body. */
export function presenceOfTarget(observation: BodyObservation): PresenceState {
  return observation.body === 'sun'
    ? interpretSolarMarker(observation.markers.solarPresence)
    : interpretEarthMarker(observation.markers.interferingBodyPresence, observation.interferingBody);
}
