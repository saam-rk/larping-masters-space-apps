import { describe, expect, it } from 'vitest';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import nobileSample from '../../../shared/samples/nobile-rim-1_2026-11-14T12-00-00Z.json';
import { findSite } from '../../../shared/sites';
import type { SkySearchResponse } from '../../../shared/skySearch';
import { formatDuration } from '../../format';
import { placeBodies, type SceneBody } from './bodies';
import { countdownConditions, countdownOutcome, countdownPlan, countdownRecord, horizonThresholdDeg, recallCountdown } from './horizonEvents';

const NOBILE_SAMPLE = nobileSample as EphemerisResponse;
const nobile = findSite('nobile-rim-1');
const apollo = findSite('apollo-11');

function body(partial: Partial<SceneBody> & Pick<SceneBody, 'body' | 'elevationDeg'>): SceneBody {
  return {
    azimuthDeg: 0,
    direction: [0, 0, -1],
    angularDiameterDeg: 0.5,
    rangeKm: 1,
    nominalSize: false,
    nominalRange: false,
    ...partial,
  };
}

describe('horizonThresholdDeg', () => {
  it('is minus the angular radius, rounded outward to 4 decimals', () => {
    expect(horizonThresholdDeg(0.5)).toBe(-0.25);
    // Sun radius 0.269698° (Horizons sample) -> -0.2697°.
    expect(horizonThresholdDeg(1941.825 / 3600)).toBe(-0.2697);
  });
});

describe('countdownPlan', () => {
  it('counts down to the set while the upper limb is above the horizon', () => {
    // The Earth center is below the plane in this sample, but its upper limb is above it.
    const earth = placeBodies(NOBILE_SAMPLE).placed.find((item) => item.body === 'earth')!;
    const plan = countdownPlan(earth, nobile);
    expect(plan.event).toBe('set');
    expect(plan.never).toBe(false);
    expect(countdownConditions(plan)).toEqual({ earthElevation: { min: -90, max: horizonThresholdDeg(earth.angularDiameterDeg) } });
  });

  it('counts down to the rise while the body is below the horizon', () => {
    const plan = countdownPlan(body({ body: 'sun', elevationDeg: -3 }), nobile);
    expect(plan.event).toBe('rise');
    expect(plan.afterEvent).toEqual({ min: -0.25, max: 90 });
    expect(countdownConditions(plan)).toEqual({ sunElevation: { min: -0.25, max: 90 } });
  });

  it('needs no search where the body can never set', () => {
    // From the Apollo 11 site the Earth always stays high in the sky.
    const plan = countdownPlan(body({ body: 'earth', elevationDeg: 66, angularDiameterDeg: 1.9 }), apollo);
    expect(plan).toMatchObject({ event: 'set', never: true });
    expect(countdownPlan(body({ body: 'sun', elevationDeg: 20 }), apollo).never).toBe(false);
  });
});

describe('countdownOutcome', () => {
  const base = {
    referenceUtc: '2026-11-14T12:00:00Z',
    searched: { startUtc: '2026-11-14T12:00:00Z', endUtc: '2027-11-15T12:00:00Z' },
  } as const;

  it('reads a match as the time left', () => {
    const response = {
      ...base,
      outcome: { status: 'found', complete: true, match: { utc: '2026-11-16T02:19:35Z', offsetSeconds: 137_975, values: {} } },
    } as unknown as SkySearchResponse;
    expect(countdownOutcome(response)).toEqual({ status: 'found', utc: '2026-11-16T02:19:35Z', seconds: 137_975, complete: true });
  });

  it('reports the searched span when there is no match', () => {
    const response = { ...base, outcome: { status: 'not-found', reason: 'no-match' } } as unknown as SkySearchResponse;
    expect(countdownOutcome(response)).toEqual({ status: 'beyond', days: 366 });
    const budget = { ...base, outcome: { status: 'not-found', reason: 'budget' } } as unknown as SkySearchResponse;
    expect(countdownOutcome(budget)).toEqual({ status: 'budget' });
  });
});

describe('formatDuration', () => {
  it('keeps the three largest units', () => {
    expect(formatDuration(137_975)).toBe('1 d 14 h 19 min');
    expect(formatDuration(3 * 3600 + 5)).toBe('3 h 0 min 5 s');
    expect(formatDuration(65)).toBe('1 min 5 s');
    expect(formatDuration(0)).toBe('0 s');
  });
});

describe('recallCountdown', () => {
  const sunset = { body: 'sun', event: 'set', afterEvent: { min: -90, max: -0.2697 }, never: false } as const;
  const sunrise = { ...sunset, event: 'rise' } as const;
  const record = countdownRecord('nobile', sunset, {
    referenceUtc: '2026-11-14T12:00:00Z',
    searched: { startUtc: '2026-11-14T12:00:00Z', endUtc: '2027-11-15T12:00:00Z' },
    outcome: { status: 'found', complete: true, match: { utc: '2026-11-16T12:00:00Z', offsetSeconds: 172_800, values: {} } },
  } as unknown as SkySearchResponse);

  it('answers later instants before the event from the same search', () => {
    expect(recallCountdown([record], 'nobile', sunset, Date.parse('2026-11-14T12:00:00Z'))).toMatchObject({ seconds: 172_800 });
    expect(recallCountdown([record], 'nobile', sunset, Date.parse('2026-11-15T12:00:00Z'))).toMatchObject({ status: 'found', seconds: 86_400 });
  });

  it('needs a new search once the event has passed, for another event, site or an earlier instant', () => {
    expect(recallCountdown([record], 'nobile', sunset, Date.parse('2026-11-16T12:00:01Z'))).toBeUndefined();
    expect(recallCountdown([record], 'nobile', sunrise, Date.parse('2026-11-15T12:00:00Z'))).toBeUndefined();
    expect(recallCountdown([record], 'shackleton', sunset, Date.parse('2026-11-15T12:00:00Z'))).toBeUndefined();
    expect(recallCountdown([record], 'nobile', sunset, Date.parse('2026-11-14T11:59:59Z'))).toBeUndefined();
  });

  it('keeps a span without crossings for later instants inside it', () => {
    const beyond = countdownRecord('nobile', sunset, {
      referenceUtc: '2026-11-14T12:00:00Z',
      searched: { startUtc: '2026-11-14T12:00:00Z', endUtc: '2026-11-24T12:00:00Z' },
      outcome: { status: 'not-found', reason: 'no-match' },
    } as unknown as SkySearchResponse);
    expect(recallCountdown([beyond], 'nobile', sunset, Date.parse('2026-11-20T00:00:00Z'))).toEqual({ status: 'beyond', days: 4 });
    expect(recallCountdown([beyond], 'nobile', sunset, Date.parse('2026-11-24T12:00:00Z'))).toBeUndefined();
  });
});
