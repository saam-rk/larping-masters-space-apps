/**
 * Reads the reference-point search box: either coordinates in degrees or
 * (part of) the name of a reference site.
 *
 * Accepted coordinate forms (latitude first unless hemisphere letters say
 * otherwise; south and west are negative):
 *   -85.4381, 37.36667      -85,4381; 37,36667      -85.4381 37.36667
 *   85.4381 S, 37.36667 E   85.4381°S 37.36667°O    37.36667 E, 85.4381 S
 * Spanish "O" (oeste) and English "W" both mean west.
 */

import { checkCoordinates, REFERENCE_SITES, type ReferenceSite, type SiteId } from '../../../shared/sites';

export type CoordinateQuery =
  | { readonly kind: 'empty' }
  | { readonly kind: 'coordinates'; readonly latitudeDeg: number; readonly longitudeEastDeg: number }
  | { readonly kind: 'site'; readonly siteId: SiteId }
  | { readonly kind: 'ambiguous'; readonly matches: readonly ReferenceSite[] }
  | { readonly kind: 'invalid'; readonly reason: 'format' | 'latitude' | 'longitude' };

const NUMBER = String.raw`([+-]?\d{1,3}(?:[.,]\d+)?)`;
const HEMISPHERE = String.raw`(?:\s*°?\s*([NSEWO]))?\s*°?`;
const PAIR = new RegExp(String.raw`^${NUMBER}${HEMISPHERE}\s*(?:[,;]\s*|\s+)${NUMBER}${HEMISPHERE}$`, 'i');

/** Minimum characters before a name search selects anything. */
const MIN_NAME_QUERY = 2;

type Axis = 'lat' | 'lon';

function readComponent(raw: string, letter: string | undefined): { axis: Axis | null; value: number } | null {
  const value = Number(raw.replace(',', '.'));
  if (!letter) return { axis: null, value };
  // A hemisphere letter already gives the sign: "-85 S" is contradictory.
  if (/^[+-]/.test(raw)) return null;
  const upper = letter.toUpperCase();
  const axis: Axis = upper === 'N' || upper === 'S' ? 'lat' : 'lon';
  const negative = upper === 'S' || upper === 'W' || upper === 'O';
  return { axis, value: negative ? -value : value };
}

function parsePair(text: string): CoordinateQuery | null {
  const match = PAIR.exec(text);
  if (!match) return null;
  const first = readComponent(match[1]!, match[2]);
  const second = readComponent(match[3]!, match[4]);
  if (!first || !second) return { kind: 'invalid', reason: 'format' };

  let latitude = first;
  let longitude = second;
  if (first.axis === 'lon' || second.axis === 'lat') {
    latitude = second;
    longitude = first;
  }
  if (latitude.axis === 'lon' || longitude.axis === 'lat') return { kind: 'invalid', reason: 'format' };

  const checked = checkCoordinates(latitude.value, longitude.value);
  if (!checked.ok) return { kind: 'invalid', reason: checked.reason };
  return { kind: 'coordinates', latitudeDeg: checked.latitudeDeg, longitudeEastDeg: checked.longitudeEastDeg };
}

function searchName(text: string, sites: readonly ReferenceSite[]): CoordinateQuery {
  const query = text.toLocaleLowerCase().replace(/\s+/g, ' ');
  if (query.length < MIN_NAME_QUERY) return { kind: 'invalid', reason: 'format' };
  const matches = sites.filter((site) => site.name.toLocaleLowerCase().includes(query));
  const exact = matches.find((site) => site.name.toLocaleLowerCase() === query);
  if (exact) return { kind: 'site', siteId: exact.id };
  if (matches.length === 1) return { kind: 'site', siteId: matches[0]!.id };
  if (matches.length > 1) return { kind: 'ambiguous', matches };
  return { kind: 'invalid', reason: 'format' };
}

export function parseCoordinateQuery(input: string, sites: readonly ReferenceSite[] = REFERENCE_SITES): CoordinateQuery {
  const text = input.trim();
  if (text === '') return { kind: 'empty' };
  // Names may contain digits ("Nobile Rim 2"), so fall back to a name search.
  return parsePair(text) ?? searchName(text, sites);
}

/** Text written into the box for coordinates, in a form `parseCoordinateQuery` reads back. */
export function formatCoordinateQuery(latitudeDeg: number, longitudeEastDeg: number): string {
  return `${latitudeDeg}, ${longitudeEastDeg}`;
}
