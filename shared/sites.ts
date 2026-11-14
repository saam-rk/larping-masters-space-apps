/**
 * Predefined lunar south-pole reference points offered by the first demo.
 *
 * Source: NASA, "Lunar Surface Data Book", table A2.1-1 (M2M-30044, baseline).
 * The points are the centers of the original candidate-region polygons. They
 * are reference points for this demo, not approved landing sites.
 *
 * The user may also enter custom coordinates (`CUSTOM_SITE_ID`). Those are
 * computed with the same method and carry no publication source.
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

/** Id used for user-entered coordinates. */
export const CUSTOM_SITE_ID = 'custom';

export type ObserverSiteId = SiteId | typeof CUSTOM_SITE_ID;

/** Observer point: a predefined reference site or user-entered coordinates. */
export interface ObserverSite {
  readonly id: ObserverSiteId;
  /** Proper name as published by the source (not translated), or `CUSTOM_SITE_NAME`. */
  readonly name: string;
  /** Planetocentric latitude in degrees; negative is south. */
  readonly latitudeDeg: number;
  /** Longitude in degrees, positive east, range (-180, 180]. */
  readonly longitudeEastDeg: number;
  /** Publication the coordinates come from; `null` for user-entered coordinates. */
  readonly source: DataSource | null;
}

export interface ReferenceSite extends ObserverSite {
  readonly id: SiteId;
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

export function isObserverSiteId(value: unknown): value is ObserverSiteId {
  return value === CUSTOM_SITE_ID || isSiteId(value);
}

/** English fallback name of a custom point; the interface shows its own translated label. */
export const CUSTOM_SITE_NAME = 'Custom point';

/** User-entered coordinates are rounded to this many decimals (~0.03 m on the Moon at 1e-6°). */
export const COORDINATE_DECIMALS = 6;

export type CoordinateCheck =
  | { readonly ok: true; readonly latitudeDeg: number; readonly longitudeEastDeg: number }
  | { readonly ok: false; readonly reason: 'latitude' | 'longitude' };

function round(value: number): number {
  // `+ 0` turns -0 into 0.
  return Number(value.toFixed(COORDINATE_DECIMALS)) + 0;
}

/** Maps any east longitude to the range (-180, 180]. */
export function normalizeLongitudeEast(longitudeEastDeg: number): number {
  const wrapped = ((((longitudeEastDeg + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Validates coordinates in degrees: latitude in [-90, 90], east longitude in
 * [-180, 360]. Returns them rounded, with the longitude in (-180, 180].
 */
export function checkCoordinates(latitudeDeg: number, longitudeEastDeg: number): CoordinateCheck {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) return { ok: false, reason: 'latitude' };
  if (!Number.isFinite(longitudeEastDeg) || longitudeEastDeg < -180 || longitudeEastDeg > 360) {
    return { ok: false, reason: 'longitude' };
  }
  return {
    ok: true,
    latitudeDeg: round(latitudeDeg),
    longitudeEastDeg: round(normalizeLongitudeEast(round(longitudeEastDeg))),
  };
}

/** The reference site at exactly these (already checked) coordinates, if any. */
export function findSiteAt(latitudeDeg: number, longitudeEastDeg: number): ReferenceSite | undefined {
  return REFERENCE_SITES.find(
    (site) => site.latitudeDeg === latitudeDeg && site.longitudeEastDeg === longitudeEastDeg,
  );
}

/**
 * Observer for checked coordinates: the reference site when they match one
 * exactly, otherwise a custom point.
 */
export function siteAt(latitudeDeg: number, longitudeEastDeg: number): ObserverSite {
  return (
    findSiteAt(latitudeDeg, longitudeEastDeg) ?? {
      id: CUSTOM_SITE_ID,
      name: CUSTOM_SITE_NAME,
      latitudeDeg,
      longitudeEastDeg,
      source: null,
    }
  );
}
