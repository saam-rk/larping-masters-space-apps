import { describe, expect, it } from 'vitest';
import type { BodyResult, EphemerisResponse } from './ephemeris.js';
import {
  assessInstant,
  assessWindow,
  BOLTZMANN_DB,
  combineStatus,
  diskFractionAbove,
  estimateLink,
  estimatePower,
  EXAMPLE_ASSUMPTIONS,
  freeSpaceLossDb,
  incidenceFactor,
  visibleSolarDiskFraction,
  SOLAR_IRRADIANCE_1AU_W_M2,
  WINDOW_SAMPLES,
  WINDOW_STEP_MINUTES,
  type LinkAssumptions,
  type MissionAssumptions,
  type PowerAssumptions,
} from './missionAssessment.js';

function body(id: 'sun' | 'earth', elevationDeg: number | null, rangeAu: number | null, angularDiameterArcsec: number | null = 1920): BodyResult {
  return {
    status: 'ok',
    observation: {
      body: id,
      targetName: id,
      azimuthDeg: 0,
      elevationDeg,
      angularDiameterArcsec,
      rangeAu,
      rangeRateKmPerS: 0,
      markers: { solarPresence: '*', interferingBodyPresence: ' ' },
      interferingBody: null,
    },
  };
}

function frame(sun: BodyResult, earth: BodyResult): EphemerisResponse {
  return {
    provenance: 'saved-sample',
    site: { id: 'nobile-rim-1', name: 'Nobile Rim 1', latitudeDeg: -85.4381, longitudeEastDeg: 37.36667, altitudeKm: 0, source: null },
    requestedUtc: '2026-11-14T12:00:00Z',
    ephemerisUtc: '2026-11-14T12:00:00Z',
    bodies: { sun, earth },
    source: { name: 'NASA/JPL Horizons API', url: '', apiVersion: '1.2', planetaryEphemeris: null, observerFrame: null, retrievedAt: '' },
    method: { ephemerisType: 'OBSERVER', quantities: [4, 13, 20], refraction: 'AIRLESS', timeScale: 'UT', terrainModeled: false },
    warnings: [],
  };
}

/** Values of the saved Horizons sample `shared/samples/nobile-rim-1_2026-11-14T12-00-00Z.json`. */
const SAMPLE = frame(body('sun', 2.094722, 0.98796880248943, 1941.825), body('earth', -0.587903, 0.00270919295523, 6492.344));

const POWER: PowerAssumptions = { panelAreaM2: 1, efficiency: 1, orientation: 'tracking', demandW: 100 };

describe('diskFractionAbove', () => {
  it('is 0, 1/2 and 1 for a disk below, centered on and above the horizon', () => {
    expect(diskFractionAbove(-0.3, 0.25)).toBe(0);
    expect(diskFractionAbove(0, 0.25)).toBeCloseTo(0.5, 12);
    expect(diskFractionAbove(0.3, 0.25)).toBe(1);
  });

  it('is symmetric: the part above at +h equals the part below at −h', () => {
    for (const h of [0.05, 0.1, 0.2]) {
      expect(diskFractionAbove(h, 0.25) + diskFractionAbove(-h, 0.25)).toBeCloseTo(1, 12);
    }
  });

  it('grows monotonically through the horizon', () => {
    const values = [-0.25, -0.1, 0, 0.1, 0.25].map((h) => diskFractionAbove(h, 0.25));
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThan(values[i - 1]!);
  });
});

describe('incidenceFactor', () => {
  it('follows each panel orientation', () => {
    expect(incidenceFactor(30, 'tracking')).toBe(1);
    expect(incidenceFactor(60, 'vertical')).toBeCloseTo(0.5, 12);
    expect(incidenceFactor(30, 'horizontal')).toBeCloseTo(0.5, 12);
    expect(incidenceFactor(-5, 'horizontal')).toBe(0);
  });
});

describe('estimatePower', () => {
  const earthAway = body('earth', -80, 0.00257, 6500);
  const missingEarth: BodyResult = { status: 'error', body: 'earth', error: { code: 'UPSTREAM_UNAVAILABLE', detail: '' } };

  it('scales the solar constant by the inverse square of the Sun range', () => {
    const estimate = estimatePower(body('sun', 10, 2), POWER, earthAway);
    expect(estimate.irradianceWM2).toBeCloseTo(SOLAR_IRRADIANCE_1AU_W_M2 / 4, 9);
    expect(estimate.powerW).toBeCloseTo(SOLAR_IRRADIANCE_1AU_W_M2 / 4, 9);
    expect(estimate.status).toBe('met');
  });

  it('applies area, efficiency, disk fraction and incidence', () => {
    const estimate = estimatePower(body('sun', 0, 1), { panelAreaM2: 2, efficiency: 0.25, orientation: 'vertical', demandW: 1000 }, earthAway);
    expect(estimate.diskFraction).toBeCloseTo(0.5, 12);
    expect(estimate.powerW).toBeCloseTo(SOLAR_IRRADIANCE_1AU_W_M2 * 0.5 * 2 * 0.25, 9);
    expect(estimate.status).toBe('not-met');
  });

  it('gives zero power for a Sun fully below the reference horizon, even without Earth data', () => {
    expect(estimatePower(body('sun', -2, 1), POWER, missingEarth)).toMatchObject({ powerW: 0, status: 'not-met' });
  });

  it('keeps missing inputs as unknown instead of zero', () => {
    expect(estimatePower(body('sun', null, 1), POWER, earthAway)).toMatchObject({ powerW: null, status: 'unknown' });
    expect(estimatePower(body('sun', 5, null), POWER, earthAway)).toMatchObject({ powerW: null, status: 'unknown' });
    expect(estimatePower(body('sun', 5, 1, null), POWER, earthAway)).toMatchObject({ powerW: null, status: 'unknown' });
    expect(estimatePower({ status: 'error', body: 'sun', error: { code: 'UPSTREAM_UNAVAILABLE', detail: '' } }, POWER, earthAway).status).toBe('unknown');
  });

  it('cannot declare power sufficient when eclipse geometry is missing', () => {
    for (const earth of [missingEarth, body('earth', null, 0.00257), body('earth', 10, 0.00257, null)]) {
      expect(estimatePower(body('sun', 10, 1), POWER, earth)).toMatchObject({ powerW: null, status: 'unknown' });
    }
  });

  it('suppresses power and the overall verdict during total solar occultation', () => {
    const data = frame(body('sun', 10, 1, 1920), body('earth', 10, 0.00257, 6500));
    expect(assessInstant(data, EXAMPLE_ASSUMPTIONS)).toMatchObject({ power: { diskFraction: 0, powerW: 0, status: 'not-met' }, overall: 'not-met' });
    expect(assessWindow([data], 60, EXAMPLE_ASSUMPTIONS).power.fraction).toBe(0);
  });
});

describe('visibleSolarDiskFraction', () => {
  it('leaves a non-overlapping Sun unchanged and handles external tangency', () => {
    expect(visibleSolarDiskFraction(body('sun', 10, 1, 3600), body('earth', 11, 0.00257, 3600))).toBe(1);
    expect(visibleSolarDiskFraction(body('sun', 0, 1), body('earth', -80, 0.00257))).toBe(0.5);
  });

  it('matches the analytic area of two equal disks separated by one radius', () => {
    // Equal radii r: overlap = r² (2π/3 − √3/2), MathWorld Eq. 17.
    const expected = 1 - (2 * Math.PI / 3 - Math.sqrt(3) / 2) / Math.PI;
    expect(visibleSolarDiskFraction(body('sun', 10, 1, 3600), body('earth', 10.5, 0.00257, 3600))).toBeCloseTo(expected, 5);
  });

  it('handles a smaller opaque disk contained inside the Sun', () => {
    expect(visibleSolarDiskFraction(body('sun', 10, 1, 3600), body('earth', 10, 0.00257, 1800))).toBeCloseTo(0.75, 4);
  });

  it('does not subtract occultation below the horizon from the visible upper half', () => {
    expect(visibleSolarDiskFraction(body('sun', 0, 1, 3600), body('earth', -0.5, 0.00257, 3600))).toBeCloseTo(0.5, 6);
    expect(visibleSolarDiskFraction(body('sun', 0, 1, 3600), body('earth', 0.5, 0.00257, 3600))).toBeCloseTo(0.5 - (2 * Math.PI / 3 - Math.sqrt(3) / 2) / Math.PI, 4);
  });

  it('keeps fractions bounded while moving through partial occultation', () => {
    let previous = 0;
    for (let offset = 0; offset <= 2; offset += 0.05) {
      const fraction = visibleSolarDiskFraction(body('sun', 10, 1, 3600), body('earth', 10 + offset, 0.00257, 7200))!;
      expect(fraction).toBeGreaterThanOrEqual(previous - 1e-6);
      expect(fraction).toBeLessThanOrEqual(1);
      previous = fraction;
    }
  });
});

describe('estimateLink', () => {
  const LINK: LinkAssumptions = {
    transmitPowerW: 10,
    transmitGainDbi: 20,
    frequencyGHz: 8.4,
    receiverGOverTDbK: 40,
    dataRateBps: 1_000_000,
    requiredEbN0Db: 2.5,
    otherLossesDb: 3,
    requiredMarginDb: 3,
    earthElevationMaskDeg: 0,
  };

  it('uses the free-space loss formula of ITU-R P.525', () => {
    // 20 log10(4π d f / c) = 32.45 + 20 log10(f MHz) + 20 log10(d km) (ITU-R P.525 closed form).
    expect(freeSpaceLossDb(384_400e3, 8.4e9)).toBeCloseTo(32.45 + 20 * Math.log10(8400) + 20 * Math.log10(384_400), 2);
    expect(BOLTZMANN_DB).toBeCloseTo(-228.6, 1);
  });

  it('computes C/N0, Eb/N0 and the margin from the budget', () => {
    const estimate = estimateLink(body('earth', 5, 384_400e3 / 149_597_870_700), LINK);
    const fspl = freeSpaceLossDb(384_400e3, 8.4e9);
    expect(estimate.distanceKm).toBeCloseTo(384_400, 6);
    expect(estimate.cOverN0DbHz).toBeCloseTo(10 + 20 - fspl - 3 + 40 - BOLTZMANN_DB, 9);
    expect(estimate.ebN0Db).toBeCloseTo(estimate.cOverN0DbHz! - 60, 9);
    expect(estimate.marginDb).toBeCloseTo(estimate.ebN0Db! - 2.5, 9);
    expect(estimate.status).toBe('met');
  });

  it('fails when the Earth is below the mask, whatever the margin', () => {
    const estimate = estimateLink(body('earth', -1, 0.00257), LINK);
    expect(estimate.earthAboveMask).toBe(false);
    expect(estimate.marginDb).not.toBeNull();
    expect(estimate.status).toBe('not-met');
    expect(estimateLink(body('earth', 3, 0.00257), { ...LINK, earthElevationMaskDeg: 5 }).status).toBe('not-met');
  });

  it('cannot remove lunar occultation with a negative mask, even for old callers', () => {
    expect(estimateLink(body('earth', -80, 0.00257), { ...LINK, earthElevationMaskDeg: -90 })).toMatchObject({ earthAboveMask: false, status: 'not-met' });
  });

  it('fails when the margin is below the required one', () => {
    expect(estimateLink(body('earth', 5, 0.00257), { ...LINK, dataRateBps: 1e9 }).status).toBe('not-met');
  });

  it('is unknown without an elevation or range', () => {
    expect(estimateLink(body('earth', null, 0.00257), LINK).status).toBe('unknown');
    expect(estimateLink(body('earth', 5, null), LINK)).toMatchObject({ marginDb: null, status: 'unknown' });
  });
});

describe('assessInstant', () => {
  it('reads the saved Nobile Rim 1 sample: Sun up, Earth below the reference horizon', () => {
    const result = assessInstant(SAMPLE, EXAMPLE_ASSUMPTIONS);
    expect(result.power.powerW).toBeGreaterThan(0);
    expect(result.power.diskFraction).toBe(1);
    expect(result.link.earthAboveMask).toBe(false);
    expect(result.overall).toBe('not-met');
  });

  it('combines statuses: any failure wins, then unknown', () => {
    expect(combineStatus(['met', 'met'])).toBe('met');
    expect(combineStatus(['met', 'unknown'])).toBe('unknown');
    expect(combineStatus(['unknown', 'not-met'])).toBe('not-met');
  });
});

describe('assessWindow', () => {
  const assumptions: MissionAssumptions = { power: POWER, link: { ...EXAMPLE_ASSUMPTIONS.link } };
  const up = body('sun', 10, 1);
  const down = body('sun', -5, 1);
  const earthUp = body('earth', 5, 0.00257);
  const earthDown = body('earth', -5, 0.00257);

  it('counts samples and finds the longest gap', () => {
    const frames = [frame(up, earthUp), frame(down, earthUp), frame(down, earthDown), frame(up, earthDown), frame(down, earthUp)];
    const result = assessWindow(frames, 60, assumptions);
    expect(result.samples).toBe(5);
    expect(result.power.fraction).toBeCloseTo(2 / 5, 12);
    expect(result.power.longestGapMinutes).toBe(120);
    expect(result.link.fraction).toBeCloseTo(3 / 5, 12);
    expect(result.link.longestGapMinutes).toBe(120);
    expect(result.both.fraction).toBeCloseTo(1 / 5, 12);
    expect(result.both.longestGapMinutes).toBe(240);
    expect(result.meanPowerW).toBeCloseTo((2 * SOLAR_IRRADIANCE_1AU_W_M2 * Math.cos(0)) / 5, 9);
  });

  it('leaves unknown samples out of the fractions', () => {
    const missing = body('sun', null, 1);
    const result = assessWindow([frame(up, earthUp), frame(missing, earthUp)], 60, assumptions);
    expect(result.power).toEqual({ fraction: 1, longestGapMinutes: null, unknownSamples: 1 });
    expect(assessWindow([frame(missing, earthUp)], 60, assumptions).power.fraction).toBeNull();
  });

  it('does not compress missing time into a supposedly consecutive outage', () => {
    const result = assessWindow([frame(down, earthUp), frame(body('sun', null, 1), earthUp), frame(down, earthUp)], 60, assumptions);
    expect(result.power).toEqual({ fraction: 0, longestGapMinutes: null, unknownSamples: 1 });
    expect(result.link.longestGapMinutes).toBe(0);
    expect(result.both.longestGapMinutes).toBeNull();
  });

  it('spans about one mean synodic month', () => {
    expect(((WINDOW_SAMPLES - 1) * WINDOW_STEP_MINUTES) / 1440).toBeCloseTo(29.53, 1);
  });
});
