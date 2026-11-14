/**
 * Predefined lunar south-pole reference points offered by the first demo.
 *
 * Source: NASA, "Lunar Surface Data Book", table A2.1-1 (M2M-30044, baseline).
 * The points are the centers of the original candidate-region polygons. They
 * are reference points for this demo, not approved landing sites.
 */

export const SITE_IDS = ['nobile-rim-1', 'nobile-rim-2', 'shackleton-rim'] as const;

export type SiteId = (typeof SITE_IDS)[number];

export interface DataSource {
  /** Human-readable source name. Proper noun; not translated. */
  readonly name: string;
  readonly url: string;
  /** Location inside the source, such as a table or section. */
  readonly locator?: string;
}

export interface ReferenceSite {
  readonly id: SiteId;
  /** Proper name as published by the source; not translated. */
  readonly name: string;
  /** Planetocentric latitude in degrees; negative is south. */
  readonly latitudeDeg: number;
  /** Longitude in degrees, positive east, range (-180, 180]. */
  readonly longitudeEastDeg: number;
  readonly source: DataSource;
}

export const LUNAR_SURFACE_DATA_BOOK: DataSource = {
  name: 'NASA Lunar Surface Data Book (M2M-30044)',
  url: 'https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf?attachment=true',
  locator: 'Table A2.1-1',
};

export const REFERENCE_SITES: readonly ReferenceSite[] = [
  {
    id: 'nobile-rim-1',
    name: 'Nobile Rim 1',
    latitudeDeg: -85.4381,
    longitudeEastDeg: 37.36667,
    source: LUNAR_SURFACE_DATA_BOOK,
  },
  {
    id: 'nobile-rim-2',
    name: 'Nobile Rim 2',
    latitudeDeg: -83.954,
    longitudeEastDeg: 58.82206,
    source: LUNAR_SURFACE_DATA_BOOK,
  },
  {
    id: 'shackleton-rim',
    name: 'Shackleton Rim',
    latitudeDeg: -89.7668,
    // Published as 171.87° W.
    longitudeEastDeg: -171.87,
    source: LUNAR_SURFACE_DATA_BOOK,
  },
];

export const DEFAULT_SITE_ID: SiteId = 'nobile-rim-1';

export function isSiteId(value: unknown): value is SiteId {
  return typeof value === 'string' && (SITE_IDS as readonly string[]).includes(value);
}

export function findSite(id: SiteId): ReferenceSite {
  const site = REFERENCE_SITES.find((candidate) => candidate.id === id);
  if (!site) {
    // Unreachable while SITE_IDS and REFERENCE_SITES stay in sync (covered by tests).
    throw new Error(`Unknown site id: ${id}`);
  }
  return site;
}
