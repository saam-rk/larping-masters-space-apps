# Horizons API fixtures

Raw responses from the NASA/JPL Horizons API, saved byte-for-byte as returned
(`format=json`). Tests parse them; the saved sample shown by the app
(`shared/samples/`) is derived from the two Nobile Rim 1 files and a test keeps
it in sync.

These are saved responses, not live queries. Do not present them as a current
or validated landing-site assessment. Terrain is not modeled.

## Nobile Rim 1 — 2026-11-14 12:00:00 UT

- Files: `nobile-rim-1_2026-11-14T12-00-00Z_sun.json`,
  `nobile-rim-1_2026-11-14T12-00-00Z_earth.json`
- Retrieved: 2026-11-14 08:38:36 UTC (Horizons header prints
  `Sat Nov 14 00:38:36 2026 Pasadena`; the Earth query ran two seconds later).
- API signature: `{"version": "1.2", "source": "NASA/JPL Horizons API"}`
- Endpoint: `https://ssd.jpl.nasa.gov/api/horizons.api` (HTTP GET)
- Site: Nobile Rim 1, NASA Lunar Surface Data Book table A2.1-1,
  85.4381° S, 37.36667° E. Altitude 0 km relative to the Horizons lunar
  reference sphere (radius 1737.4 km), not measured terrain height.

Parameters (identical for both files except `COMMAND`: `'10'` Sun, `'399'` Earth):

| Parameter | Value |
|---|---|
| `format` | `json` |
| `COMMAND` | `'10'` / `'399'` |
| `OBJ_DATA` | `'NO'` |
| `MAKE_EPHEM` | `'YES'` |
| `EPHEM_TYPE` | `'OBSERVER'` |
| `CENTER` | `'coord@301'` |
| `COORD_TYPE` | `'GEODETIC'` |
| `SITE_COORD` | `'37.36667,-85.4381,0'` (E-longitude deg, latitude deg, altitude km) |
| `TLIST` | `'2026-11-14 12:00'` |
| `TLIST_TYPE` | `'CAL'` |
| `TIME_TYPE` | `'UT'` |
| `QUANTITIES` | `'4,13,20'` |
| `ANG_FORMAT` | `'DEG'` |
| `APPARENT` | `'AIRLESS'` |
| `RANGE_UNITS` | `'AU'` |
| `CSV_FORMAT` | `'YES'` |
| `TIME_DIGITS` | `'SECONDS'` |

The live adapter (`server/horizons/query.ts`) sends the same parameters, with
`TLIST` including seconds (`'2026-11-14 12:00:00'`) and longitude normalized to
[0, 360).

Values in the table rows:

| Body | Azimuth (deg) | Elevation (deg) | Ang. diameter (arcsec) | Markers |
|---|---:|---:|---:|---|
| Sun | 83.301542 | 2.094722 | 1941.825 | `*`, `i` |
| Earth | 320.816668 | -0.587903 | 6492.344 | `*`, `i` |

Header: planetary ephemeris DE441; observer frame `MEAN_ME (high precision)`;
interfering body EARTH; atmospheric refraction NO (AIRLESS).

## Error case

- File: `error_unreadable-tlist.json`
- Same query with `TLIST='2026-13-40 12:00'`. Horizons answers HTTP 200 with
  an `error` field. The API documentation states that Horizons-generated input
  errors return HTTP 200, so the payload must be checked.

## References

- Horizons API documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Horizons manual (observer quantities 4, 13, 20 and sky-presence markers):
  https://ssd.jpl.nasa.gov/horizons/manual.html
