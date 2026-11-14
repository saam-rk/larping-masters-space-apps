/**
 * Parses Horizons API JSON payloads with CSV observer tables: a single row
 * (`parseObserverPayload`) or an Az/El series (`parseObserverSeries`); see
 * `query.ts`. Anything unexpected is reported as an error instead of
 * being guessed; "n.a." values become `null`, never zero.
 */

import type { ApiError, BodyId, BodyObservation } from '../../shared/ephemeris.js';

/** API versions whose output this parser was checked against (see `__fixtures__/`). */
export const VERIFIED_HORIZONS_API_VERSIONS: readonly string[] = ['1.2'];

export interface ParsedObserverTable {
  readonly observation: BodyObservation;
  /** Row instant as ISO 8601 UTC. */
  readonly ephemerisUtc: string;
  readonly apiVersion: string | null;
  readonly planetaryEphemeris: string | null;
  readonly observerFrame: string | null;
}

export type ParseResult =
  | { readonly ok: true; readonly table: ParsedObserverTable }
  | { readonly ok: false; readonly error: ApiError };

const COLUMN = {
  azimuth: 'Azi_(a-app)',
  elevation: 'Elev_(a-app)',
  angularDiameter: 'Ang-diam',
  range: 'delta',
  rangeRate: 'deldot',
} as const;

const MONTHS: Readonly<Record<string, string>> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const ROW_TIME_PATTERN = /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;

interface RawTable {
  readonly result: string;
  readonly apiVersion: string | null;
  readonly header: readonly string[];
  readonly rows: readonly string[];
}

/** Reads the CSV table between `$$SOE` and `$$EOE` and its header line. */
function readRawTable(payload: unknown): { readonly ok: true; readonly table: RawTable } | { readonly ok: false; readonly error: ApiError } {
  if (typeof payload !== 'object' || payload === null) {
    return formatError('payload is not a JSON object');
  }
  const { error, result, signature } = payload as Record<string, unknown>;

  if (typeof error === 'string' && error.trim() !== '') {
    return { ok: false, error: { code: 'UPSTREAM_REJECTED', detail: `Horizons error: ${error.trim()}` } };
  }
  if (typeof result !== 'string') {
    return formatError('payload has no "result" text');
  }

  const apiVersion = readSignatureVersion(signature);
  const lines = result.split(/\r?\n/);

  const startIndex = lines.findIndex((line) => line.trim() === '$$SOE');
  const endIndex = lines.findIndex((line) => line.trim() === '$$EOE');
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return formatError('ephemeris table markers $$SOE/$$EOE not found');
  }

  const headerLine = findLast(lines.slice(0, startIndex), (line) => line.includes('Date__('));
  if (headerLine === undefined) {
    return formatError('CSV header line not found');
  }
  const header = headerLine.split(',').map((cell) => cell.trim());
  const rows = lines.slice(startIndex + 1, endIndex).filter((line) => line.trim() !== '');
  return { ok: true, table: { result, apiVersion, header, rows } };
}

/** Header metadata shared by single-row and multi-row tables. */
function readHeaderMetadata(result: string) {
  const targetHeader = /^Target body name:\s*(.+?)\s*\{source:\s*([^}]+?)\s*\}/m.exec(result);
  return {
    targetName: targetHeader?.[1] ?? '',
    planetaryEphemeris: targetHeader?.[2] ?? null,
    observerFrame: /^Center pole\/equ\s*:\s*(.+?)\s*\{/m.exec(result)?.[1] ?? null,
    interferingBody: /^Vis\. interferer\s*:\s*([A-Za-z]+)/m.exec(result)?.[1] ?? null,
  };
}

export function parseObserverPayload(payload: unknown, body: BodyId): ParseResult {
  const raw = readRawTable(payload);
  if (!raw.ok) return raw;
  const { result, apiVersion, header, rows } = raw.table;
  if (rows.length !== 1) {
    return formatError(`expected exactly 1 table row, found ${rows.length}`);
  }
  const cells = (rows[0] as string).split(',');

  // Column 0 is the time tag; columns 1 and 2 are the sky-presence markers.
  const timeCell = cells[0]?.trim() ?? '';
  const ephemerisUtc = parseRowTime(timeCell);
  if (ephemerisUtc === null) {
    return formatError(`unreadable row time "${timeCell}"`);
  }
  if (cells[1] === undefined || cells[2] === undefined) {
    return formatError('sky-presence marker columns missing');
  }

  const read = (name: string, required: boolean): number | null | ApiError => {
    const index = header.indexOf(name);
    if (index === -1) {
      return required ? { code: 'UPSTREAM_FORMAT', detail: `required column "${name}" missing` } : null;
    }
    const raw = cells[index]?.trim() ?? '';
    if (raw === 'n.a.') return null;
    if (!NUMBER_PATTERN.test(raw)) {
      return { code: 'UPSTREAM_FORMAT', detail: `column "${name}" has non-numeric value "${raw}"` };
    }
    return Number(raw);
  };

  const azimuthDeg = read(COLUMN.azimuth, true);
  const elevationDeg = read(COLUMN.elevation, true);
  const angularDiameterArcsec = read(COLUMN.angularDiameter, false);
  const rangeAu = read(COLUMN.range, false);
  const rangeRateKmPerS = read(COLUMN.rangeRate, false);
  for (const value of [azimuthDeg, elevationDeg, angularDiameterArcsec, rangeAu, rangeRateKmPerS]) {
    if (isApiError(value)) return { ok: false, error: value };
  }

  const { targetName, planetaryEphemeris, observerFrame, interferingBody } = readHeaderMetadata(result);

  return {
    ok: true,
    table: {
      ephemerisUtc,
      apiVersion,
      planetaryEphemeris,
      observerFrame,
      observation: {
        body,
        targetName,
        azimuthDeg: azimuthDeg as number | null,
        elevationDeg: elevationDeg as number | null,
        angularDiameterArcsec: angularDiameterArcsec as number | null,
        rangeAu: rangeAu as number | null,
        rangeRateKmPerS: rangeRateKmPerS as number | null,
        markers: {
          solarPresence: cells[1],
          interferingBodyPresence: cells[2],
        },
        interferingBody,
      },
    },
  };
}

/** Az/El sampled at several instants (a START/STOP/STEP request, see `buildObserverRangeParameters`). */
export interface ParsedObserverSeries {
  readonly body: BodyId;
  /** Row instants, milliseconds since the Unix epoch (UTC), strictly increasing. */
  readonly times: readonly number[];
  readonly azimuthDeg: readonly (number | null)[];
  readonly elevationDeg: readonly (number | null)[];
  readonly apiVersion: string | null;
  readonly planetaryEphemeris: string | null;
  readonly observerFrame: string | null;
}

export type SeriesParseResult =
  | { readonly ok: true; readonly series: ParsedObserverSeries }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Parses a multi-row Az/El table. As for single rows, "n.a." becomes `null`
 * and anything unreadable is an error rather than a guess.
 */
export function parseObserverSeries(payload: unknown, body: BodyId): SeriesParseResult {
  const raw = readRawTable(payload);
  if (!raw.ok) return raw;
  const { result, apiVersion, header, rows } = raw.table;
  if (rows.length === 0) return formatError('table has no rows');

  const azimuthIndex = header.indexOf(COLUMN.azimuth);
  const elevationIndex = header.indexOf(COLUMN.elevation);
  if (azimuthIndex === -1 || elevationIndex === -1) {
    return formatError(`required columns "${COLUMN.azimuth}" and "${COLUMN.elevation}" missing`);
  }

  const times: number[] = [];
  const azimuthDeg: (number | null)[] = [];
  const elevationDeg: (number | null)[] = [];
  for (const row of rows) {
    const cells = row.split(',');
    const timeCell = cells[0]?.trim() ?? '';
    const iso = parseRowTime(timeCell);
    const time = iso === null ? Number.NaN : Date.parse(iso);
    if (!Number.isFinite(time)) return formatError(`unreadable row time "${timeCell}"`);
    if (times.length > 0 && time <= (times[times.length - 1] as number)) {
      return formatError('row times are not strictly increasing');
    }
    const values: (number | null)[] = [];
    for (const index of [azimuthIndex, elevationIndex]) {
      const cell = cells[index]?.trim() ?? '';
      if (cell === 'n.a.') values.push(null);
      else if (NUMBER_PATTERN.test(cell)) values.push(Number(cell));
      else return formatError(`column "${header[index] ?? ''}" has non-numeric value "${cell}"`);
    }
    times.push(time);
    azimuthDeg.push(values[0] ?? null);
    elevationDeg.push(values[1] ?? null);
  }

  const { planetaryEphemeris, observerFrame } = readHeaderMetadata(result);
  return { ok: true, series: { body, times, azimuthDeg, elevationDeg, apiVersion, planetaryEphemeris, observerFrame } };
}

/** `2026-Nov-14 12:00:00.000` -> `2026-11-14T12:00:00Z`. B.C. dates are rejected. */
export function parseRowTime(cell: string): string | null {
  const match = ROW_TIME_PATTERN.exec(cell);
  if (!match) return null;
  const [, year, monthName, day, hour, minute, second = '00', fraction = ''] = match;
  const month = monthName === undefined ? undefined : MONTHS[monthName];
  if (month === undefined) return null;
  const trimmedFraction = fraction.replace(/0+$/, '');
  const fractionPart = trimmedFraction === '' ? '' : `.${trimmedFraction}`;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${fractionPart}Z`;
}

function readSignatureVersion(signature: unknown): string | null {
  if (typeof signature !== 'object' || signature === null) return null;
  const version = (signature as Record<string, unknown>).version;
  return typeof version === 'string' ? version : null;
}

function formatError(detail: string): { readonly ok: false; readonly error: ApiError } {
  return { ok: false, error: { code: 'UPSTREAM_FORMAT', detail } };
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value;
}

function findLast<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index] as T;
    if (predicate(item)) return item;
  }
  return undefined;
}
