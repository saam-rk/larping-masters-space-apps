# Architecture

Technical map of the CLPS Lunar Mission Browser for the team. Agreements live
in `DECISIONES.md`; the first-demo scope is in `docs/GUIA_PRIMERA_DEMO.md`.

## Run it

Requires Node.js 22 or later.

```bash
npm install
npm run dev        # app + /api/ephemeris on http://localhost:5173
npm run check      # typecheck + lint + tests
npm run build      # production build into dist/
```

`npm run dev` serves the API through a Vite middleware that calls the same
handler as the Vercel function, so `vercel dev` is not needed. The API calls
the live Horizons service, so it needs internet access. Tests do not: they use
saved fixtures.

## Layout and owners

```text
api/                 Vercel Functions (platform adapters only)      backend
  ephemeris.ts         GET /api/ephemeris
  sky-search.ts        GET /api/sky-search (inverse search)
server/              Backend logic, framework-independent            backend
  horizons/            Horizons API adapter
    query.ts             builds the observer-table request
    client.ts            HTTP call, timeout, error classification
    parse.ts             reads the JSON payload and CSV table row
    __fixtures__/        raw saved responses + README with parameters
  ephemeris/           Sun + Earth for one site and instant
    service.ts           runs both queries, assembles the response, caches
    handler.ts           validates the request, maps results to HTTP
  skySearch/           inverse search: closest instant matching Az/El ranges
    search.ts            hour -> minute -> second refinement, budgets
    sampler.ts           serial Horizons range requests per body
    handler.ts           validates the request, maps results to HTTP
  http.ts              JSON/error response helpers
shared/              Contract shared by browser and server            backend + science
  ephemeris.ts         API request/response types and error codes
  skySearch.ts         inverse search contract and 4-decimal range matching
  sites.ts             28 reference sites (4 featured), their source, custom points
  time.ts              UTC input parsing and the supported range
  presence.ts          meaning of the Horizons sky-presence markers
  missionAssessment.ts solar power and direct-to-Earth link screening (pure functions)
  samples/             saved sample derived from the fixtures
src/                 React application                                 interface
  App.tsx              three-panel dashboard
  features/
    mission-config/      site + UTC selection
    scene/               React Three Fiber horizon view (+ geometry.ts):
                         first person on Nobile Rim 1/2 terrain, third person
                         to scale (bodies.ts, terrain/models.ts,
                         horizonFloor.ts); full-screen switch
    results/             text summary, sources, limits
    sky-search/          inverse search: summary box, search window (form, examples, guide); a match is shown on the horizon
    mission/             feasibility screening box and side-by-side scenario comparison
                         (model in shared/missionAssessment.ts)
  hooks/useEphemeris.ts  selection state and the displayed result
  api/ephemerisClient.ts typed fetch of /api/ephemeris
  i18n/                  es (default) and en messages
public/models/       Static 3D assets (copies of docs/research/site-terrain)
public/terrain/      Nobile Rim 1 terrain/astronaut GLBs (assets/terrain/nobile-rim-1)
```

The science owner reviews the Horizons parameters (`server/horizons/query.ts`),
the marker interpretation (`shared/presence.ts`) and the fixtures before the
results are presented.

## API contract

`GET /api/ephemeris?site=<site>&utc=<YYYY-MM-DDTHH:mm[:ss]Z>`
`GET /api/ephemeris?lat=<deg>&lon=<deg>&utc=<YYYY-MM-DDTHH:mm[:ss]Z>`

- `site`: `nobile-rim-1`, `nobile-rim-2` or `shackleton-rim`.
- `lat`, `lon` (instead of `site`): custom point in plain decimal degrees,
  latitude in [-90, 90] (south negative), east longitude in [-180, 360].
  Values are rounded to 6 decimals and the longitude is returned in
  (-180, 180]. Coordinates equal to a reference site resolve to that site;
  otherwise `site.id` is `custom` and `site.source` is `null` (user-entered,
  no publication). The method is the same as for the reference sites.
- `utc`: UTC instant ending in `Z`, within [1969-01-01, 2100-01-01). The range
  is an application guard, not a Horizons limit.

| Status | Meaning | Body |
|---|---|---|
| 200 | At least one body computed | `EphemerisResponse`; check each `bodies.sun/earth.status` |
| 400 | Invalid `site`, `lat`/`lon` or `utc` | `{ error: { code: "INVALID_REQUEST", detail } }` |
| 405 | Method other than GET/HEAD | `METHOD_NOT_ALLOWED` |
| 502 | Horizons failed for both bodies | `UPSTREAM_UNAVAILABLE`, `UPSTREAM_REJECTED` or `UPSTREAM_FORMAT` |
| 500 | Unexpected server error | `INTERNAL` |

The full types are in `shared/ephemeris.ts`. Key rules:

- Missing values are `null` and failures carry an error code. Nothing is
  replaced with zero.
- `provenance` is `live` or `saved-sample`. The app starts by showing the saved
  sample and labels it as such.
- `warnings` may contain `PARTIAL_RESULT` (one body failed) or
  `HORIZONS_API_VERSION_UNVERIFIED` (the API returned a version other than
  the checked `1.2`).
- Complete responses are cacheable (`s-maxage=86400`); partial results and
  errors are `no-store`. Each warm server instance also keeps an in-memory
  cache for six hours.

## Inverse search

`GET /api/sky-search?site=<site>|lat=<deg>&lon=<deg>&from=<UTC>[&direction=nearest|after|before][&sunAz=..][&sunEl=..][&earthAz=..][&earthEl=..]`

- One to four conditions, each `min,max` or a single value (exact match).
  Degrees with at most 4 decimals; azimuth in [0, 360] (`min > max` wraps
  through north), elevation in [-90, 90]. A Horizons value matches when,
  rounded to 4 decimals, it lies in the inclusive range.
- Plausibility (`shared/skyFeasibility.ts`, used by the form and by the
  handler before any Horizons request): a body's conditions are rejected
  when no direction of its azimuth/elevation box can be occupied at the site.
  The Sun must stay within 1.5919° of the lunar equator and the Earth within
  10.4612° of the mean sub-Earth direction (0° N, 0° E) plus 0.2793° of
  topocentric parallax; both get 0.25° of margin. Bounds measured with
  Horizons on 2026-11-14 (DE441, `MOON_ME`, `COMMAND='301'`,
  `CENTER='500@399'`, quantities `14,15,20`, 2000–2100 every 12 h). Checked
  against 233,736 topocentric Horizons rows (8 sites, Sun and Earth,
  2010–2029 every 6 h): none rejected, least slack 0.25°. Necessary
  condition only: Sun and Earth are checked separately, and an accepted
  condition can still have no match in the window.
- Returns the whole UTC second closest to `from` (ties go to the later one)
  at which every condition holds, searching up to 366 days on the allowed
  side(s) and within the supported range.
- Method: Horizons range tables (`START_TIME`/`STOP_TIME`/`STEP_SIZE`,
  quantity `4` only, same observer and `AIRLESS` settings as above), hourly
  over ±32 days and then the rest of the window; linear interpolation with a
  discovery margin prioritizes candidate hours, which are resampled every
  minute and then every second (unitless `STEP_SIZE='60'`). Interpolation is
  not a certified error bound, especially near a zenith/nadir. Before declaring
  a match complete, every whole second in any remaining coarse interval that
  could contain a closer match is sampled (`STEP_SIZE='3600'` for one hour).
  Without a discovered match, this exhaustive fallback also checks intervals
  rejected by interpolation. `no-match` is only returned if the whole searched
  window has been verified. A match is always a row printed by Horizons, never
  an interpolated value. Partial hours and singleton instants at the supported
  date boundaries are included.
- Requests to Horizons are made one at a time. Budgets: 24 sampling steps and
  25 s per search; when they run out the response says so (`budget` or
  `complete: false`) instead of claiming there is no match or that an
  unverified match is the closest. Exhaustive certification consumes more
  requests than discovery, so distant matches can be real but incomplete.
- Limits: a range narrower than the motion of the body in one second can fall
  between whole seconds and be missed. Terrain is not modeled.

| Status | Meaning |
|---|---|
| 200 | `SkySearchResponse`; `outcome.status` is `found` or `not-found` |
| 400 | Invalid site, `from`, `direction` or conditions, or no condition |
| 502 | A Horizons request failed |

## Mission screening and scenario comparison

Client-side only; no new API route. `shared/missionAssessment.ts` turns one
`EphemerisResponse` (or a series) plus user assumptions into a screening:

- Power: `1361 W/m²` (IAU 2015 Resolution B3 nominal total solar irradiance)
  / (Sun range in au)² × fraction of the solar disk above the reference
  horizon and not occulted by Earth (uniform disk, from both Horizons
  directions and angular diameters) × incidence factor (vertical panel turned to the Sun: cos el; horizontal:
  sin el; two-axis tracking: 1) × area × efficiency, compared with the demand.
- Link: free-space loss `20 log10(4π d f / c)` (ITU-R P.525) with the Earth
  range (1 au = 149 597 870 700 m, IAU 2012 B2); C/N0 = EIRP − loss − other
  losses + G/T − 10 log10(k); Eb/N0 = C/N0 − 10 log10(Rb); margin against the
  required Eb/N0. Counts only with the Earth center at or above the mask;
  masks are restricted to 0–90° and cannot remove lunar occultation.
- Window: 100 samples from the scenario instant over about one mean synodic
  month (step 430 min) through `/api/ephemeris-series`; shares are sample
  counts and gaps are resolved to one step. If any sample for a criterion is
  unknown, its longest gap is unknown too: missing time cannot be compressed
  into a consecutive outage.
- Missing values are `unknown`, never zero. The starting assumptions are
  illustrative (not from a real mission or station); users replace them and
  they are kept in `localStorage`.
- Limits: terrain not modeled; no temperature, dust, degradation, batteries,
  pointing or Earth-station visibility. A "meets" verdict is a geometric
  screening, not a guarantee of power, communications or landing suitability.

Solar occultation uses small-angle planar disks with spherical center
separation (the existing `shared/skySearch.ts` calculation). Fully risen
disks use the analytic circle-lens area. At the horizon, horizontal slices of
the Sun are clipped to both the horizon and the opaque Earth disk, using
composite Simpson quadrature with 1024 intervals after
`y = solarRadius × sin(theta)`. Circle geometry: [Wolfram MathWorld,
Circle-Circle Intersection](https://mathworld.wolfram.com/Circle-CircleIntersection.html)
(consulted during PR #52 review). It does not multiply independent eclipse
and horizon fractions. Tests compare partial overlap with the analytic
equal-disk lens area and cover full occultation and simultaneous horizon
clipping. No limb darkening, Earth atmosphere or certified error bound is
modeled. Missing occultation geometry makes power unknown, unless the
entire solar disk is already below the horizon (known zero direct power).
Window loads reserve active and queued scenario keys synchronously so both
panels share one request per key; unmount aborts the entire reserved queue.

The comparison (`src/features/mission/ComparisonPanel.tsx`) holds up to four
scenarios (point + UTC), added from the current selection as is or shifted
by +1 d, +7 d or +½ mean synodic month. Each is one `/api/ephemeris` request.
The best value of each comparable row is marked; azimuth and elevation are
not ranked.

## Horizons query

One observer-table request per body (Sun `10`, Earth `399`) from a
topocentric site on the Moon (`CENTER='coord@301'`, geodetic coordinates,
altitude 0 km on the Horizons reference sphere). Quantities `4,13,20`,
`APPARENT='AIRLESS'`, `TIME_TYPE='UT'`, CSV output, one `TLIST` instant. The
exact parameter list is in `server/horizons/__fixtures__/README.md` and
pinned by `server/horizons/query.test.ts`.

The browser never calls Horizons directly; JPL's CORS policy requires a server
route.

## Limits

- Positions are geometric. Terrain (mountains, craters) is not modeled, so a
  positive elevation does not prove visibility from the ground, solar power,
  or a communication link.
- Range and range-rate are returned but not shown in the main summary.
- The 27 predefined points are reference points from the NASA Lunar Surface
  Data Book (table A2.1-1), not approved landing sites. Three are featured
  in the selector; the other 24 (docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md)
  are in a drop-down and use the third-person view only, since they have no
  terrain model. "Leibnitz Beta Plateau, extended boundaries" (PGDA Site20v2)
  shares the Site20 coordinates; typed coordinates resolve to Site20. Custom points are user input with no
  source; they are not checked against any terrain or landing data.

## Deployment

Vercel detects Vite and deploys `api/*.ts` as functions using the Web
`GET(request)` signature. Relative imports in `api/`, `server/` and `shared/`
use explicit `.js` extensions (enforced by `tsconfig.server.json`, NodeNext)
so the transpiled files load under Node's ESM loader. Deployment has not been
performed yet.
