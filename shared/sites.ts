/**
 * Predefined lunar reference points.
 *
 * Source: NASA, "Lunar Surface Data Book", table A2.1-1 (M2M-30044, baseline,
 * 2025-03-18, p. 75). The points are the centers of the original
 * candidate-region polygons ("accurate to 5 to 10 meters" per the book). They
 * are reference points for this demo, not approved landing sites.
 * Coordinates are planetocentric latitude and east longitude in degrees, kept
 * exactly as published (see docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md §3).
 *
 * The featured points (`FEATURED_SITE_IDS`) include Apollo 11 and the
 * original demo points (D-015); the others are offered in a drop-down. Every point uses the
 * same geometric method; only some featured points have a first-person
 * terrain model.
 *
 * The user may also enter custom coordinates (`CUSTOM_SITE_ID`). Those are
 * computed with the same method and carry no publication source.
 */

export const SITE_IDS = [
  'apollo-11',
  'nobile-rim-1',
  'nobile-rim-2',
  'shackleton-rim',
  'amundsen-rim',
  'haworth',
  'shackleton-rim-b',
  'shoemaker-rim-a',
  'shoemaker-rim-b',
  'shoemaker-rim-c',
  'shoemaker-rim-d',
  'shoemaker-rim-e',
  'faustini-rim-a',
  'shoemaker-rim-f',
  'cabeus-exterior-wall-1',
  'amundsen-1',
  'idelson-l-crater-1',
  'malapert-crater-1',
  'connecting-ridge',
  'peak-near-shackleton',
  'de-gerlache-rim-1',
  'leibnitz-beta-plateau',
  'leibnitz-beta-plateau-extended',
  'malapert-massif',
  'de-gerlache-kocher-massif',
  'shoemaker',
  'de-gerlache-rim-2',
  'connecting-ridge-extension',
] as const;

export type SiteId = (typeof SITE_IDS)[number];

export const APOLLO_11_SITE_ID = 'apollo-11';

/** The default and original demo points, listed first in the site selector. */
export const FEATURED_SITE_IDS = [APOLLO_11_SITE_ID, 'nobile-rim-1', 'nobile-rim-2', 'shackleton-rim'] as const satisfies readonly SiteId[];

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
  /**
   * Data Book / PGDA product codes and other search aliases (not translated).
   * The first one, when present, is the site's main code.
   */
  readonly codes: readonly string[];
  /**
   * Set when this entry shares its coordinates with another site and only
   * names a different terrain product (Site20v2 extends Site20). Both entries
   * get identical calculations.
   */
  readonly variantOf?: SiteId;
}

export const LUNAR_SURFACE_DATA_BOOK: DataSource = {
  name: 'NASA Lunar Surface Data Book (M2M-30044)',
  url: 'https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf?attachment=true',
  locator: 'Table A2.1-1',
};

export const APOLLO_11_COORDINATE_SOURCE: DataSource = {
  name: 'NASA/NSSDCA Apollo Landing Site Coordinates',
  url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  locator: 'Apollo 11 · Lunar Module',
};

/**
 * Site20v2 ("Leibnitz beta plateau, extended boundaries", added 2022-08-15)
 * is listed by NASA GSFC PGDA product 78, not as its own Data Book row; it
 * reuses the Data Book's Site20 coordinates.
 */
export const PGDA_78_SITE20V2: DataSource = {
  name: 'NASA GSFC PGDA product 78 (Site20v2) · Lunar Surface Data Book (M2M-30044)',
  url: 'https://pgda.gsfc.nasa.gov/products/78',
  locator: 'Table A2.1-1, Site20',
};

function dataBookSite(id: SiteId, name: string, latitudeDeg: number, longitudeEastDeg: number, codes: readonly string[]): ReferenceSite {
  return { id, name, latitudeDeg, longitudeEastDeg, source: LUNAR_SURFACE_DATA_BOOK, codes };
}

export const REFERENCE_SITES: readonly ReferenceSite[] = [
  {
    id: APOLLO_11_SITE_ID,
    name: 'Apollo 11',
    latitudeDeg: 0.67416,
    longitudeEastDeg: 23.47314,
    source: APOLLO_11_COORDINATE_SOURCE,
    codes: ['Apollo 11', 'Tranquility Base', 'Eagle', 'Mare Tranquillitatis'],
  },
  dataBookSite('nobile-rim-1', 'Nobile Rim 1', -85.4381, 37.36667, ['R06', 'Site06']),
  dataBookSite('nobile-rim-2', 'Nobile Rim 2', -83.954, 58.82206, ['DM2']),
  // Published as 171.87° W.
  dataBookSite('shackleton-rim', 'Shackleton Rim', -89.7668, -171.87, ['R04', 'Site04']),
  dataBookSite('amundsen-rim', 'Amundsen Rim', -84.2287, 69.44396, ['DM1']),
  dataBookSite('haworth', 'Haworth', -86.7639, -22.777, []),
  // LM1, not R04 (Shackleton Rim).
  dataBookSite('shackleton-rim-b', 'Shackleton Rim B', -89.5244, 56.30993, ['LM1']),
  dataBookSite('shoemaker-rim-a', 'Shoemaker Rim A', -88.0792, 11.88866, ['LM2']),
  dataBookSite('shoemaker-rim-b', 'Shoemaker Rim B', -88.3828, 16.58734, ['LM3']),
  dataBookSite('shoemaker-rim-c', 'Shoemaker Rim C', -88.9645, 37.23483, ['LM4']),
  dataBookSite('shoemaker-rim-d', 'Shoemaker Rim D', -88.632, 74.62375, ['LM5']),
  dataBookSite('shoemaker-rim-e', 'Shoemaker Rim E', -87.9458, 71.27421, ['LM6']),
  dataBookSite('faustini-rim-a', 'Faustini Rim A', -87.8897, 90, ['LM7']),
  dataBookSite('shoemaker-rim-f', 'Shoemaker Rim F', -87.3417, 60.25512, ['LM8']),
  dataBookSite('cabeus-exterior-wall-1', 'Cabeus Exterior Wall 1', -86.9243, -71.5651, ['NPA']),
  // NPB; distinct from Amundsen Rim (DM1).
  dataBookSite('amundsen-1', 'Amundsen 1', -83.9046, 89.53545, ['NPB']),
  dataBookSite('idelson-l-crater-1', "Idel'son L Crater 1", -84.5397, 126.9045, ['NPC', 'Idelson L Crater 1']),
  // NPD; distinct from Malapert Massif (R23).
  dataBookSite('malapert-crater-1', 'Malapert Crater 1', -84.8034, 8.387032, ['NPD']),
  dataBookSite('connecting-ridge', 'Connecting Ridge', -89.4632, -137.49, ['R01', 'Site01']),
  dataBookSite('peak-near-shackleton', 'Peak Near Shackleton', -88.811, 123.6901, ['R07', 'Site07']),
  dataBookSite('de-gerlache-rim-1', 'de Gerlache Rim 1', -88.6834, -67.9321, ['R11', 'Site11']),
  dataBookSite('leibnitz-beta-plateau', 'Leibnitz Beta Plateau', -85.4266, 31.74276, ['R20', 'Site20']),
  {
    id: 'leibnitz-beta-plateau-extended',
    name: 'Leibnitz Beta Plateau, extended boundaries',
    latitudeDeg: -85.4266,
    longitudeEastDeg: 31.74276,
    source: PGDA_78_SITE20V2,
    codes: ['Site20v2', 'R20v2'],
    variantOf: 'leibnitz-beta-plateau',
  },
  dataBookSite('malapert-massif', 'Malapert Massif', -85.9948, -0.23578, ['R23', 'Site23']),
  dataBookSite('de-gerlache-kocher-massif', 'de Gerlache-Kocher Massif', -85.8296, -116.322, ['R42', 'Site42']),
  dataBookSite('shoemaker', 'Shoemaker', -87.1835, 62.83502, []),
  dataBookSite('de-gerlache-rim-2', 'de Gerlache Rim 2', -88.23, -64.6284, ['SL2']),
  // The original request spelled it "Connencting"; kept only as a search alias.
  dataBookSite('connecting-ridge-extension', 'Connecting Ridge Extension', -89.0324, -101.999, ['SL3', 'Connencting Ridge Extension']),
];

/** Reference sites offered in the drop-down below the featured ones, in catalog order. */
export const MORE_SITES: readonly ReferenceSite[] = REFERENCE_SITES.filter(
  (site) => !(FEATURED_SITE_IDS as readonly string[]).includes(site.id),
);

export const FEATURED_SITES: readonly ReferenceSite[] = FEATURED_SITE_IDS.map((id) => findSite(id));

/** Main Data Book / PGDA code of a site when it differs from its name (e.g. "DM1"), else null. */
export function siteCode(site: ReferenceSite): string | null {
  const code = site.codes[0];
  return code && code !== site.name ? code : null;
}

export const DEFAULT_SITE_ID: SiteId = APOLLO_11_SITE_ID;

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

/**
 * The reference site at exactly these (already checked) coordinates, if any.
 * Coordinates shared by a variant entry resolve to the site it extends
 * (`variantOf`), never to the variant.
 */
export function findSiteAt(latitudeDeg: number, longitudeEastDeg: number): ReferenceSite | undefined {
  return REFERENCE_SITES.find(
    (site) => !site.variantOf && site.latitudeDeg === latitudeDeg && site.longitudeEastDeg === longitudeEastDeg,
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
