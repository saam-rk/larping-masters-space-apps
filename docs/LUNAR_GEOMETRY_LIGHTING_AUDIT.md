# Lunar geometry and first-person lighting audit

**Audit date:** 2026-11-15, from the execution environment.

**Purpose:** preserve the complete analysis and actionable evidence for a later correction session.

**Disposition:** astronomical directions are consistent in the checked cases; physical surface illumination is not validated and has demonstrated implementation limitations.

**Scope of this document:** audit and proposed remediation, not authorization to change scientific interfaces or project agreements.

## 1. Executive conclusion

The stored coordinates and the placement of the Sun and Earth are consistent with NASA/JPL Horizons in the cases checked. However, **first-person surface lighting is not a physically reliable simulation**.

There are reproducible cases where the application's own terrain mesh intersects a ray toward the Sun, but that obstruction does not prevent the solar light from illuminating the surface. The implementation also does not calculate the reduction in direct sunlight when only part of the solar disk is exposed or when Earth eclipses it.

Consequently:

- **Reasonable bounded confidence:** obtaining and displaying apparent Sun/Earth directions relative to the reference horizon, with the current reference-sphere observer assumptions.
- **Not justified:** inferring actual surface illumination, partial exposure, terrain visibility, available solar power, communications, or landing suitability from the rendered view.
- Successful tests at the reference sites support the shared coordinate pipeline, but **do not validate arbitrary terrain or certify user-entered coordinates**.
- Adding graphics shadows alone would improve visual consistency, but would not establish scientific correctness of terrain illumination.

The requested behavior—do not illuminate places that sunlight cannot reach, and correctly represent partial illumination—is **not currently satisfied**.

## 2. Repository baseline, changes and evidence boundaries

The read-only investigation began at commit:

```text
72e6ae08fd70208b1c00928b5bbb32e08eb3e570
```

Other work was committed concurrently. The relevant changes were inspected again during the audit. The final inspected repository commit was:

```text
391f02b258f090bb68d6c531c98c84918984e0d7
```

The intermediate commit `567b6fbe1031700ea546b8e3f7524c90b2dc79a0` added horizon playback and related work. Its first-person changes concerned foreground rendering/material handling, not the solar intensity or polar shadow rules described here. Between that commit and the final baseline, no changes were found in the inspected site catalog, Horizons adapter, ephemeris service, first-person view, body placement, geometry or terrain modules.

**No application code or existing project documents were changed by the investigation.** This Markdown report was subsequently created at the user's explicit request, on `docs/lunar-geometry-lighting-audit`, based on the final inspected commit. No commit or push was made by this reporting task.

Line numbers below refer to the final inspected baseline. Locate the named functions if later edits move them.

### Evidence classification

- **Source checked:** a primary NASA/JPL publication was retrieved and inspected.
- **Numerically reproduced:** a fresh request or calculation returned the stated value.
- **Code established:** current implementation explicitly has the stated behavior.
- **Mesh counterexample:** a ray intersects the actual distributed mesh under the scene's placement assumptions. This is not a measurement of the real lunar surface.
- **Not validated:** the investigation did not establish correctness, including where no counterexample appeared.

This was a source-code, data and mesh-geometry audit. **It was not a browser visual inspection, a GPU pixel comparison, a SPICE cross-validation, a comparison with observations from the lunar surface, or an exhaustive test of every supported date.**

## 3. What was checked

### 3.1 Coverage

- All **28 selectable catalog entries**, representing **27 distinct coordinate pairs**.
- Coordinate provenance and transcription against NASA sources.
- **56 serialized live Horizons range requests:** Sun and Earth for each catalog entry.
- Interval: **2026-11-01 00:00 UTC through 2026-12-01 00:00 UTC**, inclusive, every six hours.
- **121 instants per body/site, 6,776 body-position rows in total**.
- Production range parsing, independent extraction of CSV values, and angle-to-vector round trips.
- Production single-row parsing, response assembly and scene placement for the representative instant, using one extracted row per range response: **56 checks**. These were not 56 additional live single-instant requests.
- Returned observer coordinates, altitude, lunar reference sphere, frame and airless setting in all 56 range response headers.
- Lunar globe orientation and exact-coordinate resolution back to catalog sites.
- All **10 first-person terrain assets**, including the nine polar models and Apollo 11.
- Solar ray/terrain intersections through the sampled month, plus Earth-center rays at the representative instant.
- Partial-disk and eclipse counterexamples.
- **16 additional live single-instant requests:** Sun and Earth for six custom points, Apollo 11 touchdown, and an Apollo 11 eclipse case.

The month sampling included 599 partial-disk, 2,018 fully-below and 4,159 fully-above states across both bodies and all entries, relative only to the mathematical elevation-zero plane and the circular-disk approximation. These counts do **not** represent terrain visibility, durations, probabilities or continuous transition coverage.

### 3.2 Observed software checks

The last observed execution of:

```bash
npm run check
```

passed TypeScript checking, ESLint and **607 tests in 55 test files**. An earlier execution during the same investigation passed 565 tests in 49 files, before the concurrent additions.

An active LSP probe over six relevant files returned no diagnostics but **six inconclusive outcomes**; it did not independently confirm clean files. The successful compiler command is the observed type-check evidence.

No production build or browser rendering test was performed for this audit. Passing software tests does not establish physical correctness of illumination.

## 4. Catalog coordinates and representative positions

### 4.1 Source verification

- All **26 coordinate pairs** from NASA's *Lunar Surface Data Book*, baseline 2025-03-18, table A2.1-1, page 75, match `shared/sites.ts`.
- Apollo 11 matches the **Lunar Module** coordinates in NASA/NSSDCA's Apollo landing-site table, not the laser retroreflector coordinates.
- `leibnitz-beta-plateau-extended` intentionally reuses the Site20 coordinates. PGDA product 78 documents Site20v2 as an extended-boundary terrain product; it is not a separate coordinate row in the Data Book.
- Thus, 28 entries correspond to 27 distinct observer locations.
- The Data Book describes reference centers of original polygons, with approximately 5–10 m center accuracy. These are not approved landing sites, and extra coordinate decimals are not evidence of centimeter accuracy.

### 4.2 Complete catalog ledger

All angles below are in **degrees**, at **2026-11-14T12:00:00Z**, with observer altitude **0 km above the Horizons reference sphere**. Longitude is east-positive; negative latitude is south. Elevations describe body centers. They do not include terrain obstruction.

The six decimal places preserve the retrieved numerical evidence; they are **not an uncertainty estimate**. The table is not a fixture to hard-code into the application.

| Site | Latitude | East longitude | First-person terrain | Sun azimuth | Sun elevation | Earth azimuth | Earth elevation |
|---|---:|---:|:---:|---:|---:|---:|---:|
| Apollo 11 | 0.67416 | 23.47314 | Yes | 91.485714 | -7.066569 | 277.587180 | 64.319834 |
| Nobile Rim 1 | -85.4381 | 37.36667 | Yes | 83.301542 | 2.094722 | 320.816668 | -0.587903 |
| Nobile Rim 2 | -83.954 | 58.82206 | Yes | 61.979835 | 4.411932 | 299.475344 | -1.155101 |
| Shackleton Rim | -89.7668 | -171.87 | Yes | 292.387658 | 1.645440 | 169.944161 | -4.350957 |
| Amundsen Rim | -84.2287 | 69.44396 | Yes | 51.344529 | 5.173846 | 288.914585 | -2.263045 |
| Haworth | -86.7639 | -22.777 | Yes | 143.309457 | -1.038435 | 20.806480 | -1.097317 |
| Shackleton Rim B | -89.5244 | 56.30993 | No | 64.226174 | 1.763457 | 301.793579 | -3.871004 |
| Shoemaker Rim A | -88.0792 | 11.88866 | Yes | 108.674743 | 0.942157 | 346.211905 | -2.256490 |
| Shoemaker Rim B | -88.3828 | 16.58734 | No | 103.973673 | 1.166581 | 341.517536 | -2.588124 |
| Shoemaker Rim C | -88.9645 | 37.23483 | No | 83.317902 | 1.677364 | 320.881861 | -3.318463 |
| Shoemaker Rim D | -88.632 | 74.62375 | No | 45.934825 | 2.508344 | 283.539669 | -3.802220 |
| Shoemaker Rim E | -87.9458 | 71.27421 | No | 49.310038 | 2.896783 | 286.925744 | -3.525588 |
| Faustini Rim A | -87.8897 | 90 | Yes | 30.569884 | 3.374084 | 268.221198 | -4.189558 |
| Shoemaker Rim F | -87.3417 | 60.25512 | No | 60.357933 | 2.873332 | 297.955514 | -2.878127 |
| Cabeus Exterior Wall 1 | -86.9243 | -71.5651 | Yes | 192.088186 | -1.450920 | 69.473906 | -3.047256 |
| Amundsen 1 | -83.9046 | 89.53545 | No | 31.217889 | 6.777060 | 268.961977 | -4.254279 |
| Idel'son L Crater 1 | -84.5397 | 126.9045 | No | 353.573679 | 6.982898 | 231.589713 | -7.529503 |
| Malapert Crater 1 | -84.8034 | 8.387032 | Yes | 112.185124 | -0.404747 | 349.711393 | 0.990970 |
| Connecting Ridge | -89.4632 | -137.49 | No | 257.999924 | 1.445064 | 135.540268 | -4.504514 |
| Peak Near Shackleton | -88.811 | 123.6901 | No | 356.831120 | 2.743793 | 234.458299 | -4.812960 |
| de Gerlache Rim 1 | -88.6834 | -67.9321 | No | 188.452726 | 0.254314 | 65.933267 | -3.585432 |
| Leibnitz Beta Plateau | -85.4266 | 31.74276 | No | 88.908988 | 1.648848 | 326.421480 | -0.313118 |
| Leibnitz Beta Plateau, extended boundaries | -85.4266 | 31.74276 | No | 88.908988 | 1.648848 | 326.421480 | -0.313118 |
| Malapert Massif | -85.9948 | -0.23578 | No | 120.791451 | -0.493368 | 358.316639 | -0.118577 |
| de Gerlache-Kocher Massif | -85.8296 | -116.322 | No | 236.820320 | -0.725644 | 114.084027 | -5.833708 |
| Shoemaker | -87.1835 | 62.83502 | No | 57.784724 | 3.060305 | 295.387664 | -2.917217 |
| de Gerlache Rim 2 | -88.23 | -64.6284 | No | 185.150213 | -0.206244 | 62.610059 | -3.308616 |
| Connecting Ridge Extension | -89.0324 | -101.999 | No | 222.508982 | 0.843392 | 100.010031 | -4.290100 |

The 18 entries without first-person terrain have no local surface-lighting simulation to validate. Their valid astronomical directions must not be interpreted as terrain-based visibility predictions.

## 5. What is consistent in the astronomical and rendering pipeline

### 5.1 Request and returned metadata

The request selects:

- Sun: target `10`.
- Earth: target `399`.
- Lunar topocentric observer: `CENTER='coord@301'`.
- Coordinates: longitude, latitude, altitude, in degrees/degrees/km.
- `COORD_TYPE='GEODETIC'` on the spherical lunar reference shape.
- `APPARENT='AIRLESS'` and `TIME_TYPE='UT'`.
- Quantities 4, 13 and 20 for azimuth/elevation, angular diameter and range/range rate.

All 56 range headers matched the requested observer coordinates within the printed precision, altitude zero within floating-point noise, spherical lunar radii **1737.4 km**, `MEAN_ME (high precision)` and `NO (AIRLESS)`. They returned API signature **1.2** and position source **DE441**.

This explicitly checked the successful responses received. It does not mean the production parser enforces all of these metadata invariants against unexpected upstream responses.

### 5.2 Scene axes and angles

`src/features/scene/geometry.ts:14`, `horizontalToDirection`, correctly implements:

```text
x = cos(elevation) * sin(azimuth)   // east
y = sin(elevation)                // up
z = -cos(elevation) * cos(azimuth) // north is -Z
```

Angles are converted from degrees to radians before trigonometry. Azimuth increases clockwise from north toward east. Negative elevations remain below the reference plane.

Across the 6,776 rows, conversion back from the resulting vectors recovered the angles with a maximum observed round-trip discrepancy of approximately **1.14e-13 degrees**. This is a numerical implementation check, not the physical accuracy of Horizons.

The lunar model orientation also placed each selected site normal along scene up, with maximum observed vector residual about **6.66e-16** across the catalog.

### 5.3 Body sizes and range

`src/features/scene/bodies.ts` correctly converts full angular diameter from arcseconds to degrees. For a sphere at center distance `d`, it uses:

```text
radius = d * sin(fullAngularDiameter / 2)
```

This is the appropriate tangent-sphere relation, rather than the tangent formula for a flat billboard disk. Recovering radii from the live angular diameters and ranges gave maximum discrepancies of approximately 0.1793 km for the Sun and 0.000889 km for Earth relative to the nominal target-header radii, consistent with the finite printed angular-diameter precision.

The first-person bodies use the reported angular size; the default third-person visual mode deliberately exaggerates sizes/elevation and must remain labeled schematic. Earth's detailed shape, orientation and phase are not scientifically established by these checks. Quantity 13 is an equatorial full-disk angular width, not an illuminated or terrain-visible fraction.

### 5.4 Apparent is not purely geometric

Horizons quantity 4 is **apparent azimuth/elevation**, including light-time and other astronomical corrections. `AIRLESS` removes atmospheric refraction; it does not remove those corrections.

Existing UI/documentation wording still describes the positions as geometric. The correct distinction is:

- **Apparent body-center direction without atmospheric refraction.**
- **Geometric local horizontal reference plane.**
- Terrain visibility is a separate calculation.

This terminology issue does not invalidate the retrieved angles, but it must be corrected before stronger scientific claims are made.

## 6. Findings: terrain obstruction is not solar shadowing

### F-01 — Polar terrain can hide a body without blocking its light

**Evidence:** code established and mesh counterexamples.

**Priority:** high for the requested first-person behavior.

Relevant locations:

- `src/features/scene/SkyScene.tsx:115`: canvas shadows are enabled only for Apollo.
- `src/features/scene/FirstPersonView.tsx`, `Sky`, approximately lines 545–557: the Sun light is gated by the upper limb above the zero-elevation plane; `castShadow` is restricted to the Apollo reenactment.
- `src/features/scene/bodies.ts:99`, `upperLimbAboveHorizon`.

A mesh can write depth and hide the Sun from the camera without participating in light occlusion. These are distinct rendering operations.

The materials do respond to surface orientation, so this finding does **not** mean every slope receives identical brightness. It means an intervening ridge does not cast the corresponding solar shadow onto the surface behind it in the polar scenes.

### 6.1 Executed mesh-check method

For each terrain GLB, an external temporary script:

1. Loaded the distributed geometry, removing texture/material dependencies only in the in-memory audit copy so geometry could be inspected without browser image APIs. No asset was modified.
2. Applied the site's placement/rotation into the same world axes as the application.
3. Sampled the site's ground height and reproduced the camera position: next to the astronaut for polar scenes; the saved reenactment eye position for Apollo.
4. Used the Sun azimuth to reproduce the polar camera bearing for each instant. The observer therefore follows the application's small position change around the astronaut, rather than an artificially fixed audit camera.
5. Cast a center-direction ray from eye level to detect terrain obstruction.
6. Cast another ray from the ground under the eye, lifted vertically by **0.03 m** to avoid self-intersection.
7. Computed incidence using the intersected ground triangle's upward-facing normal.
8. Recorded cases with the application solar-light gate on, positive incidence `normal dot sunDirection > 0.02`, and a terrain hit along the ground-to-Sun ray.

Intersections used double-sided geometry. This tests geometric blocking, not GPU material/shadow behavior. The incidence is based on triangle normals, not an assertion about a particular rendered pixel's interpolated normal. The missing polar-shadow path is independently established by code.

The ray checks are **center-ray checks**, not exhaustive solar-disk integration. They do not establish that the entire disk is hidden, nor a physical visible fraction. The finite mesh lacks a complete curved regional horizon.

### 6.2 Per-model results

“Light-on samples” means the solar upper limb was above the mathematical zero plane, not that actual sunlight reached the ground. “Blocked samples” means the criteria in section 6.1 were met. These are discrete samples, not hours of darkness or failure probabilities.

| Model | Light-on samples | Blocked positive-incidence samples | First recorded example, UTC | Sun center elevation, deg | Ground-ray first hit distance, m |
|---|---:|---:|---|---:|---:|
| apollo-11 | 59 | 0 | None in this month sample | — | — |
| nobile-rim-1 | 74 | 20 | 2026-11-20T12:00:00Z | 6.032969 | 4180.214 |
| nobile-rim-2 | 71 | 2 | 2026-11-28T00:00:00Z | 0.197006 | 6063.269 |
| shackleton-rim | 121 | 14 | 2026-11-08T18:00:00Z | 1.768310 | 7.037 |
| amundsen-rim | 71 | 21 | 2026-11-10T00:00:00Z | -0.047579 | 7.806 |
| haworth | 84 | 59 | 2026-11-01T00:00:00Z | 3.442680 | 23.279 |
| shoemaker-rim-a | 108 | 16 | 2026-11-04T12:00:00Z | 0.273466 | 45.387 |
| faustini-rim-a | 97 | 51 | 2026-11-05T00:00:00Z | -0.259932 | 242.804 |
| cabeus-exterior-wall-1 | 86 | 0 | None in this sample | — | — |
| malapert-crater-1 | 75 | 26 | 2026-11-01T00:00:00Z | 2.060048 | 21.296 |

**Eight of the nine polar terrain models produced counterexamples.** Cabeus Exterior Wall 1 did not produce this particular counterexample in the sample, but it shares the same disabled terrain-shadow implementation. Absence of a sampled counterexample is not validation.

Apollo has a different graphics-shadow path. Its lack of such a counterexample in this month sample does not validate it; the independent eclipse failure is described below.

An additional useful regression case is **Faustini Rim A, 2026-11-14T12:00:00Z**:

- Sun azimuth: 30.569884 degrees.
- Sun center elevation: +3.374084 degrees.
- First terrain hit from the eye along the solar center direction: approximately 169.210 m.
- First hit from the lifted ground point: approximately 40.272 m.
- Positive ground-normal incidence: approximately 0.046818.
- Solar source intensity remains 3.2; polar terrain shadows are disabled.

This is useful because the entire solar disk is above the mathematical zero plane, yet the mesh still blocks the center direction.

## 7. Findings: partial disks and eclipses

### F-02 — Partial solar exposure is reduced to a binary light switch

**Evidence:** code established and reproduced numerical case.

**Priority:** high.

The source-light rule in `FirstPersonView.tsx` is essentially:

```text
if sunCenterElevation + solarAngularRadius > 0:
    directionalLightIntensity = 3.2
else:
    directionalLightIntensity = 0
```

It does not compute the visible fraction of the solar disk against the terrain or even against the flat reference plane. Surface material incidence still affects shading, but the source intensity is not attenuated by the visible fraction.

**Regression case: Faustini Rim A, 2026-11-05T00:00:00Z.**

- Solar center elevation: -0.259932 degrees.
- Solar angular radius: approximately 0.269127083 degrees.
- Solar upper limb: approximately +0.009195083 degrees.
- Source intensity selected by the current code: **3.2**.

For a circular disk cut by a straight horizontal line, using a small-angle planar approximation:

```text
q = centerElevation / angularRadius
fractionAbovePlane = (acos(-q) + q * sqrt(1 - q*q)) / pi
```

For this case the area fraction is approximately **0.003771**, or **0.3771%**. This illustrates the missing partial-exposure handling.

**Do not interpret this area fraction as surface irradiance.** It excludes terrain, limb darkening, incidence variation over the disk and other radiometric effects. The terrain also obstructs rays in this case.

The inverse inconsistency is possible too: a real or assumed depressed horizon may expose a body below elevation zero, while the source light is switched off solely because its upper limb is below zero. Clamping every terrain horizon to zero is not an acceptable general fix.

### F-03 — Apollo lighting does not attenuate direct sunlight during an Earth eclipse

**Evidence:** live query plus code-established lighting rule.

**Priority:** high.

**Regression case: Apollo 11, 2025-03-14T06:58:00Z.**

| Quantity | Sun | Earth |
|---|---:|---:|
| Azimuth, deg | 267.967732 | 267.073154 |
| Center elevation, deg | 69.325285 | 69.258076 |
| Angular radius, deg | 0.267290278 | 0.913913056 |

Angular separation between centers, computed from their unit directions:

```text
separation = 0.323390103 degrees
separation + solarRadius = 0.590680381 degrees
Earth radius = 0.913913056 degrees
```

The solar disk is fully inside Earth's disk under this circular-limb approximation. The margin is large, so this is not a grazing-contact precision claim.

Nevertheless, the first-person light condition depends only on solar upper-limb elevation and leaves **direct solar source intensity at 3.2**. The existence of eclipse-search helpers in `shared/eclipses.ts` does not make the first-person light respond to an eclipse.

This is specifically a failure to suppress **direct sunlight**. Weak light refracted through Earth's atmosphere during an eclipse is a separate physical effect and is not modeled by this scene. Do not replace the finding with an unsupported claim that absolutely no photons can reach the surface.

### F-04 — Illustrative fill light remains, including a fixed Apollo light

**Evidence:** code established.

**Priority:** medium for readability mode; high if presented as physical lighting.

At the inspected baseline, `Sky` includes:

- Ambient light intensity **0.15** for polar scenes.
- Ambient light intensity **0.45** for Apollo.
- An additional Apollo directional light at `[-0.32, 0.46, 0.84]`, intensity **0.5**, independent of the Sun.
- A decorative contact-shadow disc under the polar astronaut, explicitly unrelated to solar direction.

These may be intentional readability choices. They are not a calculation of Earthshine, lunar interreflection or physically justified nighttime illumination. A future correction must distinguish a deliberately illustrative viewing mode from a mode claiming physical direct-solar exposure; do not silently treat fill lighting as measured illumination.

Apollo enables local graphics shadows for reenactment objects, but that is not a complete terrain-shadow solution. In the inspected path, terrain meshes are marked to receive shadows, while reenactment objects are marked to cast and receive them. The directional-light shadow camera is also a small local box, not regional lunar terrain coverage.

## 8. Findings: observer, terrain and visible horizon

### F-05 — The astronomical observer is not the rendered ground observer

**Evidence:** code established and mesh heights reproduced.

**Priority:** high for a consistent scientific surface-view contract.

`server/ephemeris/service.ts:25` sets:

```text
SITE_ALTITUDE_KM = 0
```

This is zero above the Horizons reference sphere, not zero above local terrain. For example, the inspected Nobile Rim 1 mesh puts the selected point at approximately **5946.895 m above that sphere**. The camera stands above the mesh, while the ephemeris observer remains on the sphere.

The angular impact of this height mismatch can be small, particularly for the distant Sun; the finding is not that all current direction values are grossly wrong. It is that the scene and the astronomical calculation do not share one physical observer.

The polar camera is also positioned next to the astronaut, not necessarily at the selected coordinates. Representative horizontal offsets from the selected point are about 11 m for Nobile Rim 1, 22 m for Nobile Rim 2 and 39 m for Shackleton Rim at the reference instant. The camera position changes slightly around the astronaut with the solar bearing.

Those offsets may be negligible for approximate celestial directions but can substantially change obstruction by nearby terrain. Do not reuse a horizon computed at one point as if it were a horizon at another without an explicit approximation/error argument.

### F-06 — The mesh and continuation do not form a validated curved lunar horizon

**Evidence:** code established; physical accuracy not validated.

**Priority:** high before making terrain-visibility claims.

Relevant modules:

- `src/features/scene/terrain/siteTerrain.ts`.
- `src/features/scene/horizonFloor.ts`.
- `FirstPersonView.tsx`: `floorProfile`, `floorGeometry`, `useTerrainFrame`.

Limitations:

1. Polar mesh coordinates are projected XY plus radial height, with **no lunar curvature correction within the crop**.
2. Outside each crop, the application uses an **assumed smooth continuation**, not measured terrain.
3. The assumed floor uses 180 azimuth sectors, i.e. 2-degree sectors; it is not a high-resolution disk-wide visibility analysis.
4. Mesh density decreases away from the viewer in several assets. Nominal source pixel spacing is not equivalent to resolved obstacles or exact exported mesh geometry.
5. Underlying LOLA elevations include interpolation and uncertainty. A visually detailed mesh is not independent evidence of measured local detail.
6. The local product frame is documented as MOON_ME/DE421, whereas the current Horizons orientation realization requires explicit alignment/uncertainty treatment for precision claims. Similar frame names must not be assumed exactly identical.

For scale, the small-angle lunar curvature drop over 10 km is about 28.8 m for radius 1,737,400 m, corresponding to roughly 0.165 degrees in the elevation direction. This is an illustrative calculation, not a correction applied by this audit. Near-horizon solar contacts can be sensitive to such differences.

Enabling a shadow map without correcting these assumptions may produce more plausible-looking images while retaining incorrect physical horizons.

### F-07 — Hidden body fragments are deliberately drawn as ghosts

**Evidence:** code established.

**Priority:** medium for interpretation and UI clarity.

`FirstPersonView.tsx`, `FarBody`, draws hidden parts of the Sun and Earth again with `GreaterDepth` and **0.35 opacity**. This is a locator overlay, not transmitted light through a mountain.

The assumed horizon floor writes depth without color, while the decorative stars remain visible. The green reference horizon is also drawn over terrain. These are visualization conventions, not literal surface visibility.

A correction should keep any locator overlay distinguishable from the physical disk and from illumination calculations. Its visibility or opacity must never drive solar exposure or be presented as a visible fraction.

### F-08 — Earth/reference-horizon status is not Earth/terrain visibility

**Evidence:** mesh rays and code inspection.

**Priority:** medium/high for user interpretation.

At Nobile Rim 1 on 2026-11-14T12:00:00Z:

- Earth's center elevation is -0.587903 degrees.
- Its circular upper limb is approximately +0.313811 degrees.
- The mesh nevertheless intercepts the Earth-center ray from the rendered eye.

At Malapert Crater 1 at the same instant:

- Earth's center elevation is +0.990970 degrees.
- A mesh obstacle intersects the eye-to-Earth-center ray at approximately 38.937 m.

These checks concern center rays, not full Earth-disk visibility. They demonstrate why a positive elevation or reference-horizon marker must not be described as actual visibility from the terrain. Likewise, seeing any part of Earth's disk does not establish a link to a specific ground station.

## 9. Custom coordinates and extrapolation

Custom coordinates use the same astronomical pipeline as reference sites. The following additional points were queried at **2026-11-14T12:00:00Z**, all with altitude zero:

| Latitude | East longitude | Purpose | Sun elevation, deg | Earth elevation, deg |
|---:|---:|---|---:|---:|
| 0 | 0 | Near-side equator | -30.511791 | 85.654838 |
| 0 | 180 | Far-side equator / longitude boundary | 30.510631 | -85.691894 |
| 90 | 0 | North pole | -1.557956 | 3.631330 |
| -90 | 0 | South pole | 1.556609 | -4.121411 |
| -85.5 | 40 | Unlisted south-polar point | 2.292074 | -0.770032 |
| 45 | -120 | Unlisted northern point | -21.533171 | -16.748604 |

All returned finite apparent directions. At an exact pole, a reported azimuth depends on the adopted meridian convention; numerical availability is not a unique physical north-bearing definition.

Exact custom-coordinate matches were also checked for every catalog entry. They resolve to the corresponding predefined point, with the extended Leibnitz variant resolving to the base site as intended.

Apollo touchdown was independently queried at **1969-07-20T20:17:40Z**:

- Sun: azimuth 88.805495 degrees, elevation +10.703313 degrees.
- Earth: azimuth 272.195241 degrees, elevation +59.224237 degrees.

### What can be generalized

The checks support using the shared method to obtain and display **apparent celestial directions relative to the mathematical horizon**, with the stated reference-sphere observer assumption.

### What cannot be generalized

They do not establish:

- Actual illumination or partial exposure at a new location.
- Terrain occlusion of either body.
- Correct observer altitude or local ground position.
- Solar energy, communications, thermal conditions or landing suitability.
- The provenance, coordinate frame or accuracy of user-supplied coordinates.
- Correctness for every instant in the supported date range.

Custom points currently have no first-person terrain asset. Syntactically valid latitude/longitude input must not be promoted to a verified terrain location. Do not silently select the nearest catalog terrain or substitute missing elevation with zero.

## 10. Proposed correction order for the next session

These are **recommendations, not newly approved project decisions**. A future session must read `README.md`, `ESTADO.md`, `DECISIONES.md` and this report, inspect the current code and Git status, and obtain approval for decisions affecting scientific methods, data or interfaces.

### Stage A — Preserve correct behavior and clarify the contract

- [ ] Preserve the verified coordinate conventions, body IDs, angle conversion, units and explicit missing-data behavior.
- [ ] Correct apparent/geometric terminology in both languages and relevant technical documentation.
- [ ] State the current altitude-zero assumption explicitly.
- [ ] Separate reference-horizon status, mesh visibility, physical solar exposure and illustrative display lighting.
- [ ] Decide whether the next milestone is visual consistency only or a quantitatively defensible terrain-visibility calculation. Do not claim the latter after only enabling rendering shadows.
- [ ] Retain clear warnings that power, communications and landing suitability are outside the validated scope.

### Stage B — Fix direct-light contradictions

- [ ] Make the direct solar light respond to obstruction by the terrain, not only the observer's zero-elevation plane.
- [ ] Ensure obstructions are evaluated for the illuminated surface points; one camera visibility flag is not sufficient to darken/light an entire terrain crop. A shadowed camera can coexist with sunlit distant slopes, and vice versa.
- [ ] Handle solar-disk exposure continuously for partial contacts; define and test the approximation used.
- [ ] Apply Earth/Sun disk occultation to direct sunlight during eclipses, using consistent directions, distances and shapes.
- [ ] Keep decorative ambient/fill lights separate from physical direct-solar exposure, with an explicit display-mode policy.
- [ ] Preserve locator ghosts only as overlays; they must not contribute light or visibility fractions.
- [ ] If shadow maps are used for visual consistency, verify cast/receive flags, coverage, bias, resolution, low-Sun behavior and performance. Apollo's small local shadow box cannot automatically cover polar terrain crops.

**Do not implement a global `sunVisibleFromCamera` switch as a substitute for terrain shadowing.** It would create a different physical error.

### Stage C — Unify the observer and terrain geometry

- [ ] Define reference radius, terrain radial elevation and observer height above ground as distinct values, with units and datum.
- [ ] Decide whether the scientific observer is at the selected coordinate or at the rendered camera. Use the same effective position for ephemerides and terrain visibility, or explicitly label and bound any approximation.
- [ ] Determine terrain elevation from a documented source/interpolation method; do not use visual exaggeration or a decorative asset as unqualified scientific altitude.
- [ ] Align terrain and ephemeris frames, or document an adequate residual uncertainty budget.
- [ ] Include curvature exactly once in the terrain-to-local-frame transformation.
- [ ] Treat missing terrain beyond a crop as unknown or a clearly labeled assumption, not certified clear sky.
- [ ] Add regional coverage and convergence/error tests before making stronger horizon claims.

### Stage D — Validate and then extend to arbitrary coordinates

- [ ] Add targeted regression tests for every finding below, not just helper arithmetic.
- [ ] Test all ten terrain scenes, all 28 entries and representative custom locations.
- [ ] Validate dates near transitions with finer steps; a six-hour sampling grid can miss short events.
- [ ] Compare with a convention-matched independent calculation where required, accounting for correction/frame differences rather than demanding bit-identical non-equivalent results.
- [ ] Perform browser/GPU visual QA in Spanish and English after implementation.
- [ ] Preserve exact inputs, raw responses, asset versions/checksums, method and limits for accepted reference cases.
- [ ] Only then decide what confidence statement is justified for custom-coordinate users.

### Existing agreement safeguards

- Preserve the intentional duplicate-update behavior in D-020 unless the integrator explicitly changes it.
- Do not remove or reinterpret recently added playback, inverse-search or eclipse-search behavior opportunistically. Inspect its current contract before changing shared data.
- Do not merge, commit or push unless the follow-up assignment explicitly authorizes it.
- Reuse existing dependencies and architecture where adequate. No new terrain pipeline, radiometry model or library has been selected by this report.

## 11. Minimum regression and acceptance matrix

| Area | Required case | Expected evidence |
|---|---|---|
| Coordinate pipeline | All catalog sites, east/west wrapping, custom matches, poles, near/far side | Consistent request metadata, finite in-domain values, correct axes and documented pole convention. |
| Local normals | Sun-facing slope versus back-facing slope | Orientation-based direct shading behaves consistently; distinguish this from occlusion by other geometry. |
| Terrain shadows | Isolated ridge blocks a sun-facing patch | Patch loses direct sunlight although its normal faces the Sun; other unblocked patches may remain lit. |
| Known mesh cases | Cases in section 6, especially Faustini 2026-11-14 and Nobile Rim 1 2026-11-20 | The demonstrated contradiction is removed without relying on the ghost overlay or camera-only visibility. |
| Partial disk | Hidden, first contact, partial, half, fully exposed | Correctly defined exposure changes continuously; no full-intensity jump for a tiny visible sliver. |
| Negative horizon | Elevated observer above a smooth sphere or declining rim | Below-zero apparent directions can be exposed where physically appropriate; no universal zero clamp. |
| Eclipse | Apollo 11, 2025-03-14T06:58:00Z | Direct sunlight is suppressed under total occultation; any atmospheric/refracted contribution is separately modeled or explicitly omitted. |
| Apollo fill | Sun absent, normal day, eclipse | Artistic fill is not confused with solar illumination; display-mode behavior is documented. |
| Observer position | Reference site versus offset camera, different instrument heights | Same observer contract across ephemeris and horizon, or explicit validated approximation. |
| Curvature | Controlled sphere and known elevated/remote obstacles | Curvature is applied once; calculated horizon agrees with the chosen geometry. |
| Crop boundary | Clear local mesh but unknown regional terrain | Missing data remains unknown/assumed, not certified visible. |
| Earth visibility | Nobile Rim 1 and Malapert Crater 1 reference instant | Plane status, center-ray blockage and full-disk visibility remain distinct. |
| Failure states | Missing Sun, missing diameter, invalid upstream values, changed epoch/frame | No invented zeros or unlabelled physical-light assertions; nominal fallbacks remain explicit. |
| Rendering | Every first-person asset, near-horizon light, both languages | Browser screenshots/pixel or image checks plus relevant numerical tests; no unsupported claim based only on a static source review. |
| Temporal behavior | Playback, date change, selection change, stale/partial responses | Display, calculations and illumination refer to the same result snapshot; preserve approved update semantics. |

Acceptance tolerances must be set for the intended purpose with a scientific justification. The tiny floating-point round-trip residual in section 5 is not an acceptable physical-error budget.

## 12. Reproducing the evidence

### 12.1 Exact Horizons settings

Endpoint:

```text
https://ssd.jpl.nasa.gov/api/horizons.api
```

For the month-long checks, the production range URL builder was used and its quantity list was changed from `4` to `4,13,20` **only in the external audit request**, without modifying project code.

```text
format=json
COMMAND='10' or '399'
OBJ_DATA='NO'
MAKE_EPHEM='YES'
EPHEM_TYPE='OBSERVER'
CENTER='coord@301'
COORD_TYPE='GEODETIC'
SITE_COORD='<east longitude normalized to [0,360)>,<latitude>,0'
START_TIME='2026-11-01 00:00:00'
STOP_TIME='2026-12-01 00:00:00'
STEP_SIZE='6h'
TIME_TYPE='UT'
QUANTITIES='4,13,20'
ANG_FORMAT='DEG'
APPARENT='AIRLESS'
CSV_FORMAT='YES'
TIME_DIGITS='SECONDS'
```

The range builder did not explicitly add `RANGE_UNITS`; returned range columns were in the default AU convention used for the audit. The production single-instant builder explicitly sets `RANGE_UNITS='AU'`.

For a single-instant reproduction, replace the range fields with:

```text
TLIST='<YYYY-MM-DD HH:MM:SS>'
TLIST_TYPE='CAL'
RANGE_UNITS='AU'
```

Use the coordinates and UTC instant from the regression case, percent-encode parameter values correctly, make requests **serially**, and identify the application in the User-Agent. The audit used:

```text
CLPS-ReadOnly-Audit/1.0 (+https://github.com/saam-rk/larping-masters-space-apps)
```

Inspect the raw target, center, coordinates, radii, time scale, units and frame before comparing numbers. A new API/model version or print precision can require deliberate comparison updates; do not blindly overwrite expected values.

### 12.2 Temporary evidence files

The audit scripts and responses were saved outside the repository at:

```text
C:/Users/crown/AppData/Local/Temp/lunar-audit-72e6/
```

Contents include:

- `loader.mjs`: temporary Node/TypeScript import adapter.
- `check-live.mjs`: catalog range requests and angle checks.
- `check-contract.mjs`: source coordinate comparison, representative row parsing, assembly, body placement and lunar orientation checks.
- `check-terrain.mjs`: in-memory GLB geometry loading and ray checks.
- `check-extra.mjs`: custom-coordinate, Apollo touchdown and eclipse checks.
- `live-results.json`: month results and summary.
- `terrain-results.json`: per-model ray evidence.
- `extra-results.json`: additional live cases.
- `raw-<site-id>-<sun|earth>.json`: 56 raw range responses with request URLs.

The fetched Data Book text was temporarily available at:

```text
C:/Users/crown/AppData/Local/Temp/pi-web-pdf/document-template.md
```

**These are temporary local files, not a committed reproducibility bundle.** They may be cleaned up or absent in another environment. The loader includes machine-specific absolute paths. The scripts were audit probes, not reviewed production tests. Additional metadata and radius-recovery checks were run as inline Node commands rather than saved scripts.

The source links, parameters, complete catalog table, regression instants and mesh-check method in this report remain the portable record. Before depending on the temporary evidence for a long-lived validation effort, preserve/adapt it deliberately and record asset fingerprints. This reporting task does not add those scripts, raw responses or a new dependency to the repository.

### 12.3 Relevant implementation map

| Path | Why it matters |
|---|---|
| `shared/sites.ts` | Catalog, coordinate validation/rounding and custom-site identity. |
| `server/horizons/query.ts` | Target IDs, observer coordinates, time and quantities. |
| `server/horizons/parse.ts` | Parsing and upstream data contract. |
| `server/ephemeris/service.ts` | Fixed altitude zero, response assembly and provenance. |
| `src/features/scene/geometry.ts` | Horizontal angles to scene directions. |
| `src/features/scene/bodies.ts` | Apparent sizes, ranges and flat-horizon upper-limb test. |
| `src/features/scene/celestialOrientation.ts` | Moon orientation and illustrative Sun/Earth orientation. |
| `src/features/scene/SkyScene.tsx` | Shared body data, view selection and renderer shadow enablement. |
| `src/features/scene/FirstPersonView.tsx` | Terrain/camera placement, solar and fill lights, assumed floor and ghost disks. |
| `src/features/scene/horizonFloor.ts` | Assumed continuation beyond terrain coverage. |
| `src/features/scene/terrain/models.ts` | First-person terrain availability. |
| `src/features/scene/terrain/siteTerrain.ts` | Projection, reference radius and terrain-axis mapping. |
| `src/features/scene/terrain/*.ts` | Per-site origins, astronaut positions and asset metadata. |
| `src/features/scene/ThirdPersonView.tsx` | Real-scale scene; not a certified terrain/phase simulation. |
| `src/features/scene/VisualScaleView.tsx` | Deliberately exaggerated schematic scene. |
| `shared/eclipses.ts` | Eclipse-search helpers; not currently linked to direct-light attenuation. |
| `src/i18n/messages.ts` | Scientific terminology, warnings and illustrative-mode explanations. |
| `public/terrain/` and `public/models/nobile-rim-2/` | Distributed first-person mesh assets. |

## 13. Sources and relationship to earlier reports

Primary sources retrieved during this investigation:

1. **NASA, Lunar Surface Data Book, M2M-30044, baseline 2025-03-18**, especially table A2.1-1, page 75:
   <https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf>
2. **NASA/NSSDCA, Apollo Landing Site Coordinates**, planetocentric Mean Earth/Polar Axis lunar reference system, DE421; page last updated 2017-03-06:
   <https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html>
3. **NASA GSFC PGDA product 78, High-Resolution LOLA Topography for Lunar South Pole Sites**, source products, frame, interpolation/uncertainty and Site20v2 provenance:
   <https://pgda.gsfc.nasa.gov/products/78>
4. **JPL Horizons manual**, retrieved version 4.98e, 2026-08-25; particularly quantities 4 and 13 and horizontal-coordinate definitions:
   <https://ssd.jpl.nasa.gov/horizons/manual.html>
5. **Live NASA/JPL Horizons API responses**, parameters and metadata recorded above:
   <https://ssd.jpl.nasa.gov/api/horizons.api>

Related repository documents:

- `docs/LUNAR_RELIABILITY_AUDIT.md`: an earlier audit against an older implementation, including broader parser, scientific-provenance and uncertainty concerns. Its old renderer-specific statements must not be applied blindly to the current scene. Conversely, this report does not establish that every older finding has been resolved.
- `docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`: catalog and terrain-product provenance.
- `docs/LUNAR_SOUTH_POLE_RESEARCH.md`: exploratory terrain/observer research, not automatic validation of the shipped renderer.
- `docs/POLAR_TERRAIN_VALIDATION_REPORT.md` and per-asset metadata: additional evidence to inspect when defining a future physical terrain pipeline; not newly re-certified by this audit.
- `docs/ARCHITECTURE.md`, `DECISIONES.md` and `docs/HORIZON_PLAYBACK.md`: existing technical and product contracts to preserve or explicitly revise.

## 14. Proposed project-status update

No status or decision file was modified for this report. The suggested status statement is:

> Apparent Sun/Earth directions and coordinate conversion have been checked across the complete reference-site catalog and a bounded date sample. Physical terrain illumination remains unvalidated: polar terrain shadowing, partial solar-disk exposure, eclipse attenuation, observer/terrain consistency and regional curved-horizon coverage require correction and validation. The current first-person lighting is illustrative and must not support power, communications or landing-suitability claims.

No new scientific method, terrain source, observer-height policy, physical-lighting mode or acceptance tolerance is confirmed by this report. Those choices require explicit agreement before implementation.
