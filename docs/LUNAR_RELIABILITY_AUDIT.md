# Lunar data and visualization reliability audit

**Audit date:** 2026-11-14 UTC.

**Inputs:** [LUNAR_DATA_RESEARCH.md](LUNAR_DATA_RESEARCH.md) and [LUNAR_SOUTH_POLE_RESEARCH.md](LUNAR_SOUTH_POLE_RESEARCH.md).

**Repository baseline:** `368b63b635b7570ba702db71a6d0c333ad4222bc`.

**Scope:** source verification, numerical spot checks, mathematical review, and a bounded inspection of the existing user-facing calculation pipeline. This is an audit, not an implementation change, flight certification, or approval of terrain functionality.

## 1. Executive decision

**Neither document, nor the current application, establishes 100% scientific correctness or end-to-end reliability for arbitrary users, sites and dates. Do not advertise that guarantee.**

The central sources are genuine and appropriate. Important numerical claims are reproducible:

- All three reference coordinates match NASA's Lunar Surface Data Book.
- All **15 containing-cell values** in the south-pole document's terrain table were independently read from the published rasters and agree at the reported rounding.
- The Nobile Rim 1 bilinear elevation and the four Sun/Earth results at reference altitude zero and altitude 5.948899 km were reproduced.
- The quoted obstructing ridge's elevation was reproduced in both the local 5 m and regional 20 m products. Its direction, distance and elevation angle agree approximately with the report.
- The spherical projection and terrain-angle equations are mathematically consistent under their stated assumptions. The application correctly converts azimuth/elevation into its chosen 3D axes.

However, **reproducing a model value is not establishing its physical accuracy**. The following prevent research-grade or safety-critical conclusions:

1. Horizons quantity 4 is **apparent**, not purely geometric. The existing application and demo documentation still mislabel it.
2. The application places the observer at **zero altitude on a reference sphere**, not on the actual terrain. At Nobile Rim 1, the sampled terrain is about **5.947 km above that sphere**.
3. The full terrain profiles and disk-wide visibility conclusions were **not independently reproduced in this audit**; a profile rerun stopped at an HTTP 403. Sparse rays, DEM interpolation, model boundaries and missing convergence/error analyses also prevent certification even if a rerun eventually agrees.
4. The terrain samples have **zero direct LOLA returns in the containing cells**. They are valid interpolated model values, not direct measurements at those locations. Their error layers are model RMS statistics, not guaranteed bounds.
5. The inspected application accepts some inconsistent or non-finite upstream values, and requests Sun/Earth concurrently despite JPL's serial-request policy.
6. The displayed object sizes and lighting are schematic, not a quantitative simulation of disks, terrain shadows, or illumination.

### Permitted interpretation by use case

| Use | Audit disposition |
|---|---|
| Teaching coordinates, azimuth, elevation and model assumptions | **Conditionally suitable after the scientific labels and interpretation issues below are corrected.** Keep the terrain exclusion, assumed altitude, saved/live provenance and schematic nature prominent. |
| Teaching actual terrain visibility or illumination at a named place | **Not validated.** The research example may be shown as a bounded model estimate with its uncertainty and missing checks, not as observational truth. |
| Serious research | The original NASA/JPL products can be legitimate research inputs. **The application's results are not yet a validated research pipeline.** A researcher must be able to reproduce the inputs, methods and uncertainties, and independently validate the requested quantity. |
| Landing safety, navigation, guaranteed power, thermal survival or communications | **Not supported.** Requires mission-specific models, requirements, qualified review and validation beyond these documents. |

No universal angular tolerance or confidence percentage is invented here. Scientific acceptance requires an explicit quantity, purpose, domain, uncertainty budget and numerical tolerance. Software test tolerances are not physical accuracy statements.

## 2. Evidence labels and boundaries

- **Verified source:** the owning documentation was read and supports the stated claim. This does not validate every pixel or derived output.
- **Reproduced value:** a new extraction/query/calculation matched the reported number. This establishes reproducibility for those inputs, not ground truth.
- **Conditional method:** mathematically or documentarily supported, but valid only under explicit assumptions and still requiring implementation validation.
- **Not independently verified:** insufficient evidence was obtained in this audit. This is not a declaration that the claim is false.
- **Correction required:** a contradiction, misleading label, or demonstrated implementation weakness.

The review covered the supplied documents in full, the project scope documents, relevant source catalogs and labels, and the relevant application modules. It did **not** execute SPICE, build a complete terrain product, perform a browser/visual usability test, test a deployed service, or validate the entire selectable 2000–2099 time range.

No original research document, application source, project decision or project status file was changed. This report is written in English under the repository's technical-documentation policy.

## 3. Findings requiring action

### F-01 — Apparent positions are incorrectly labelled geometric

**Status: correction required. Severity: high for scientific interpretation.**

Locations: the south-pole document's description of its line-of-sight result, `docs/GUIA_PRIMERA_DEMO.md`, `docs/ARCHITECTURE.md`, and the Spanish and English strings in `src/i18n/messages.ts`. The broader data document already correctly flags this issue.

The [Horizons manual, quantity 4](https://ssd.jpl.nasa.gov/horizons/manual.html#obsquan) defines apparent azimuth/elevation, including light-time and astronomical corrections. `APPARENT='AIRLESS'` removes atmospheric refraction; it does not remove light-time, stellar aberration or gravitational light deflection. A geometrically constructed terrain mask can be compared with apparent sight directions, but the complete result should not be described as using purely geometric astronomical positions.

**Required:** label the current output as “Apparent Sun/Earth center direction without atmospheric refraction; terrain not modeled.” Keep “geometric horizontal reference plane” for the plane itself. If a true instantaneous geometric-vector mode is wanted, specify it separately and validate the frame/time/observer transformation; do not just rename quantity 4.

### F-02 — The application's observer is not at the modeled ground

**Status: verified limitation; high impact if users interpret it as a surface view.**

`server/ephemeris/service.ts` sets `SITE_ALTITUDE_KM = 0`. This is consistent with the agreed first-demo assumption, not a new coding regression. Both source documents warn about it.

The selected local rasters put the containing cells at 5946.13 m, 1009.58 m and 771.04 m above the 1,737,400 m sphere. An altitude of zero must not be presented as an instrument standing on that terrain. The south-pole example instead uses a bilinear ground estimate plus a chosen **2 m radial height above ground**.

For the Nobile example, changing altitude from 0 to 5.948899 km changes Earth's center elevation by about **−3.0272 arcsec**. The small angular change does not make the zero-altitude observer physically correct. Local terrain occlusion is a different calculation and can change the interpretation completely.

**Required:** distinguish `referenceRadius`, `terrainElevation`, `observerHeightAboveTerrain` and the direction of that height. Do not mix the application's altitude-zero result with the terrain-based example. Keep the hypothetical reference-sphere observer explicit in teaching mode.

### F-03 — Full horizon and full-disk visibility remain unverified

**Status: not independently verified; blocker for terrain visibility claims.**

Named claims in `LUNAR_SOUTH_POLE_RESEARCH.md` that this audit does **not** certify:

- Solar center-ray maximum **−3.8795° at 153.1 km**.
- Maximum over sampled regional solar directions of approximately **−3.82°**.
- Earth-sector maxima spanning approximately **+6.33° to +6.79°**.
- The implication that all of the Earth disk is obscured, or all of the Sun disk is clear, at that time and height.
- Completeness of the **400 km** cutoff and the stated distance/azimuth sampling scheme.

A new profile implementation was attempted with the stated nested grids. It stopped while reading Site06 at byte range `32145408–32178175`, with **HTTP 403**. No complete profile or convergence result from that attempt is claimed. Selected cells and the ridge were successfully read separately. Access failure is not evidence that the original profile is wrong.

There are also scientific gaps independent of access:

- Nine regional azimuths, and only three near-field azimuths, do not exhaust a continuous disk. Unsampled ridges can invalidate a clear-sky conclusion; unsampled gaps can invalidate a fully-hidden conclusion.
- The highest *sampled* terrain angle is not automatically the continuous skyline maximum.
- The document does not provide a missing-sample ledger, a full output profile, or an executable archived pipeline.
- The transition from 5 m terrain after only 200 m to a coarser model needs a sensitivity check. Barker et al. (2021) use 5 m terrain out to 5 km in their published nested-grid example; the document's different scheme is an exploratory choice, not that validated configuration.
- A finite distance cutoff needs a conservative bound on omitted terrain or an extent-convergence test; “400 km” alone is not proof.

**Required:** preserve all sampled/unknown sectors, reproduce the profile with an independent geospatial reader, refine radial and angular sampling and spatial extent, compare overlapping DEMs, test near-field sensitivity, and propagate observer/terrain uncertainty. Until then, label it **an exploratory estimate, not a validated visibility prediction**.

### F-04 — Raster precision and RMS are not pointwise certainty

**Status: verified limitation; high impact for research.**

All three containing cells have `ldec = 0`. The provider explicitly fills empty cells by interpolation and describes large interpolated fractions in the studied 5 m grids. This does **not** mean the elevations are missing or unusable, but it means no laser spot directly sampled those cells.

The published `toterr` and `slperr` values are **RMS error estimates from the model/error method**. They are not deterministic maximum errors, automatically 95% confidence intervals, independent Gaussian standard deviations at every pixel, or the full uncertainty of a moved observer. The paper's regional median statistics cannot be substituted for local quality layers. The “about 90%” statement describes the studied products; it was not recomputed as a census of every later-added site.

NASA's reference-point table describes centers accurate to about **5–10 m**. That is already comparable to or greater than a grid cell. As an illustrative local-planar sensitivity, a 10 m horizontal shift **along the steepest slope** corresponds to approximately 2.69 m, 0.63 m and 6.13 m of height change at the three sampled slopes. These are derived examples, not new error bounds or measured displacements.

Reporting 5946.899 m to three decimal places describes interpolation arithmetic, **not millimeter terrain accuracy**. Retain precision internally, but present values with their model, uncertainty and spatial support. An error assigned to one containing cell is not automatically the propagated uncertainty of a four-cell bilinear estimate; spatial covariance matters.

### F-05 — Similar lunar frame names do not imply exact identity

**Status: important missing qualification; blocker for unbudgeted sub-meter claims.**

The source documents correctly distinguish ME from PA and identify the approximately 875 m great-circle-equivalent rotation. A further detail matters:

The [NAIF DE440 lunar frame kernel](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf) says `MOON_ME_DE440_ME421` is **closely aligned with**, not identical to, `MOON_ME_DE421`. Its sampled comparison finds a maximum great-circle-equivalent difference of approximately **53.4 cm over 2000–2040**, and slightly over **1 m over 1900–2051**. Those are sampled frame comparisons over stated intervals, not a universal error bound through 2099. The kernel also reports a considerably larger difference between the high-precision ME realization and `IAU_MOON`.

Horizons documents DE440-based lunar orientation rotated toward the DE421 mean-Earth standard; the queried position source is DE441. These are different roles and are not contradictory version numbers. Generic labels such as `MOON_ME`, `Moon 2015`, or the sphere radius alone are insufficient for exact reproducibility.

**Required:** archive the realization and epoch-dependent transformation, or explicitly budget the residual frame mismatch. Do not assert exact frame identity at centimeter accuracy just because both labels mention ME/DE421. No SPICE frame transform was executed in this audit.

### F-06 — Angular diameter is not a precise vertical Earth limb model

**Status: conditional approximation; missing qualification.**

Horizons quantity 13 is the **equatorial angular width of the full disk if fully illuminated and visible**. It is not an illuminated fraction, a terrain-visible fraction, or necessarily the precise vertical diameter of an oblate Earth at its current orientation.

`angularRadiusDeg = diameterArcsec / 7200` is a correct conversion for a circular-disk approximation. The reported Earth upper limb at about +0.31° and solar lower limb at about +1.83° reproduce under that approximation. For high-precision Earth contacts, use a limb/shape/orientation model or explicitly quantify the circular approximation.

The source document's `centerAzimuth ± angularRadius` sampling approximates the horizontal footprint **only near low elevation**. At higher elevations, azimuth extent is not simply angular radius; use a spherical angular-disk construction, including wraparound and the zenith singularity.

**Required:** distinguish center, any-part, partial-disk and full-disk visibility. Boundary contacts should be indeterminate within uncertainty. For a rugged skyline, integrate/ray-test the two-dimensional disk rather than applying a center-ray threshold everywhere.

### F-07 — Current response validation can accept scientifically inconsistent data

**Status: demonstrated implementation weakness; blocker for strong end-to-end reliability claims.**

Location: `server/horizons/parse.ts`, with aggregation in `server/ephemeris/service.ts`.

Three adversarial checks were executed against the existing parser, using an in-memory modified saved fixture, without changing repository files:

| Modified input | Observed result | Risk |
|---|---|---|
| Azimuth token changed to `1e999` | Parser returned `ok: true` and `Infinity` | Numeric syntax is checked, but finiteness is not. Invalid values can reach rendering/serialization. |
| Valid Sun payload passed with requested body `earth` | Parser returned `ok: true`, `body: earth`, `targetName: Sun (10)` | Requested and returned target identity are not enforced. |
| CSV time header changed from `Date__(UT)` to `Date__(TT)` | Parser returned `ok: true` and a UTC `Z` time | An incompatible timescale can be relabelled UTC. |

Source inspection also found no complete enforcement of returned center/site/altitude, lunar radius/frame, units, numeric ranges, or returned time against the request. `buildEphemerisResponse` takes shared provenance/time from the first successful body; it does not demonstrate per-body agreement in epoch, frame or API version. These are robustness findings, **not evidence that JPL sent incorrect data in the successful live queries**.

**Required:** validate each response against the exact request and supported scientific contract, reject non-finite/out-of-domain values, preserve per-body provenance, reject mismatches, and add regression tests. Version warnings alone cannot establish compatible semantics.

### F-08 — Upstream use does not follow the documented JPL policy

**Status: correction required; availability/reproducibility risk.**

The [current JPL fair-use policy](https://ssd-api.jpl.nasa.gov/) explicitly requires one request at a time, reasonable frequency, caching where practical, appropriate backoff/error handling, and a product/version/contact User-Agent.

`computeEphemeris` currently uses `Promise.all` for Sun and Earth. `fetchObserverTable` sets `Accept`, but no application-specific User-Agent. The audit's own four live requests were serialized and used an application-specific User-Agent with a repository contact URL.

**Required:** serialize upstream requests, including concurrent application requests where necessary; identify the application; retain caching and sensible failure behavior. A per-request sequential loop alone does not serialize multiple server instances. A backend route addresses browser CORS architecture but does not create a blanket exemption from JPL's policy or a service-availability guarantee. Obtain clarification where the intended deployment requires it.

### F-09 — 3D direction is correct, but disk sizes and lighting are not scientific

**Status: verified schematic limitation; medium/high educational risk if misread.**

`src/features/scene/geometry.ts` implements the documented axes correctly: east `+X`, zenith `+Y`, north `−Z`. Existing cardinal-direction, unit-vector and negative-elevation tests passed.

However, `SkyScene.tsx` places both bodies at radius 10 with fixed mesh radii **0.6 for the Sun and 0.45 for Earth**. The Horizons-reported angular diameters in this example are about **0.5394° and 1.8034°**, respectively. The Sun marker is drawn larger even though Earth's apparent disk is larger. The camera is an external orbiting camera, not the observer's eye. Mesh/plane intersections therefore do not measure visible disk fraction.

The scene's fixed `directionalLight` at `[5, 10, 5]` is not derived from the queried Sun direction. It is display lighting, not a solar illumination calculation. The current “not to scale” label is helpful and must remain, but is not a substitute for explaining these particular limitations.

**Required:** treat meshes as direction markers only, or implement an explicitly scaled angular view with validated disk geometry. Do not infer illumination, phase, terrain shadow or limb contacts from the current rendered appearance. Never use exaggerated display geometry as calculation geometry. Browser-rendered visual behavior was not tested here.

### F-10 — Future UTC, supported dates and numerical precision need explicit limits

**Status: verified limitation; not a demonstrated error in the reference case.**

Horizons explains that future UTC conversion uses the last known leap-second information when future changes are not yet determined. The application accepts 2000–2099, but an input guard is not a validation of every date or a century-long precision guarantee. The UI's date parser also does not represent a `:60` leap-second instant.

**Required:** distinguish supported input range, model/kernel coverage and independently tested range. Preserve time scale, query epoch, retrieval time and model versions. Document unsupported leap-second instants and future-time assumptions. Do not interpret extra printed decimals as an uncertainty estimate.

### F-11 — Reproducibility evidence is incomplete for derived terrain outputs

**Status: not research-ready as a complete archived calculation.**

The south-pole document provides useful coordinates, indices, formulas and URLs, but not an executable archived profile generator, complete raw responses, raster checksums for the full inputs, missing-data ledger, dependency versions or full calculated profiles. HTTP `Last-Modified` timestamps do not uniquely establish file contents.

The broader data document is unusually clear about its header-only terrain inspection and unexecuted ephemeris template. It must not be read as certifying its proposed pipeline. The later south-pole pixel extraction is additional evidence, not a contradiction of the earlier explicitly limited inspection.

The existing repository does now contain **altitude-zero raw Horizons fixtures** in `server/horizons/__fixtures__/`; old documentation saying that no package/application/fixtures exist is stale in places. The terrain-altitude responses and calculation assets are not equivalent to those fixtures.

**Required:** archive a reproducible scientific bundle for adopted outputs, including exact requests, raw responses, chosen raster windows/versions/checksums, source and derived metadata, processing code, tests and uncertainty results. This audit records compact evidence below; it is not that complete bundle.

### F-12 — Source agreement is not fully independent physical validation

**Status: methodological limitation.**

Agreement between the 5 m and 20 m ridge values is useful, but both derive from LOLA and related processing. Repeating the same Horizons service also does not independently verify its ephemeris solution. Agreement proves reproducibility and some consistency, not absence of shared systematic error.

A SPICE comparison must match observer, epoch, frame, ephemeris and correction convention. `azlcpo(..., 'CN+S', ...)` is not guaranteed to reproduce every Horizons correction: [NAIF explicitly states](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html) that its aberration corrections do not account for relativistic effects. Horizons quantity 4 includes gravitational light deflection. Do not treat any residual as a bug before accounting for these differences, and do not demand bit-for-bit identity between non-equivalent methods.

### F-13 — Energy, communications, thermal and ice conclusions are unsupported

**Status: outside validated scope; retain the documents' warnings.**

- A source above a modeled terrain horizon is not guaranteed solar power. Earth occultation of the Sun is a separate effect; panel orientation, irradiance, efficiency, temperature, degradation and storage also matter.
- The data document's irradiance formula is an **idealized approximation**, not an electrical-power model. Visible area fraction is not always irradiance fraction when disk radiance is nonuniform; partial solar-disk exposure, limb darkening and variation of incidence across the disk require a more complete radiometric model for demanding use.
- Earth-center or Earth-disk visibility is not a link to a named ground station. Station location/rotation, both-end masks, radio frequency, terrain diffraction/reflection and link budget are separate inputs.
- Long-term average illumination does not provide the longest darkness period or an arbitrary-hour prediction. Unknown samples must not be counted as dark, visible, or zero.
- Diviner observations/map statistics are not a hardware thermal prediction at an arbitrary date.
- LCROSS evidence at Cabeus and permanent shadow elsewhere do not establish local water abundance at the three reference points.

These warnings in the research documents are scientifically appropriate. Do not turn their source inventories into features claiming quantities that have never been calculated or validated.

## 4. Reproduced numerical evidence

### 4.1 Reference coordinates and projections

NASA's [Lunar Surface Data Book, table A2.1-1, p. 75](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf#page=75) confirms the three coordinates and the approximate 5–10 m center accuracy statement. They are centers of original regions, not approved landing sites.

Using the stated spherical south-polar projection, radius 1,737,400 m, pole −90°, central meridian 0° and unit scale:

| Site/product | Latitude / east longitude | Recomputed X / Y, m | Containing column / row, zero-based |
|---|---|---|---|
| Nobile Rim 1 / Site06 | −85.4381° / 37.36667° | 84000.010026 / 110000.010792 | 2000 / 1999 |
| Nobile Rim 2 / DM2 | −83.954° / 58.82206° | 157000.451965 / 95000.253401 | 2000 / 1999 |
| Shackleton Rim / Site04 | −89.7668° / −171.87° | −1000.036606 / −7000.345565 | 1599 / 1600 |

The coordinate wrapping `−171.87° = 188.13° east` is correct. Wrapping longitude is not a reference-frame transformation.

The three local TIFF dimensions, 5 m spacing, bounds, float32 encoding, uncompressed storage and NaN nodata agree with the broader research document. The 20 m adjusted TIFF metadata also agree: 30,400 × 30,400, 20 m spacing, top-left corner (−304000, +304000) m, float32, DEFLATE, 512 × 512 tiles and NaN. The regional files inspected use BigTIFF; a reader restricted to classic TIFF is insufficient.

### 4.2 All 15 local table values

New byte-range reads were made from the provider's [local LOLA archive](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/). File pattern: `<site>/<site>_final_adj_5mpp_<layer>.tif`. Layers are `surf`, `slp`, `toterr`, `slperr`, and `ldec`, as defined in the [README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README).

| Product | Elevation m | Slope ° | Elevation RMS m | Slope RMS ° | Returns |
|---|---:|---:|---:|---:|---:|
| Site06 | 5946.128417969 | 15.047022820 | 0.719861388 | 2.661574125 | 0 |
| DM2 | 1009.582153320 | 3.578342438 | 0.185861468 | 1.038028002 | 0 |
| Site04 | 771.043212891 | 31.489883423 | 0.206479505 | 1.282954693 | 0 |

**Result: all agree with the input document at its displayed rounding.** The extra digits above are extraction evidence only.

Observed elevation-file `Last-Modified` values also match:

- Site06: `2021-02-12 13:33:34 UTC`.
- DM2: `2021-02-08 18:59:33 UTC`.
- Site04: `2020-06-05 18:40:02 UTC`.

### 4.3 Bilinear elevation and observer altitude

For Nobile Rim 1, bilinear sampling around the pixel centers uses these four `surf` values, in upper-left, upper-right, lower-left, lower-right order:

```text
5947.43408203125, 5946.12841796875,
5947.66699218750, 5946.38085937500  meters
```

The result is **5946.899465547409 m**, agreeing with the reported **5946.899 m**. Adding the chosen 2 m radial observer height and converting to km gives **5.948899465547409 km**, rounded to **5.948899 km** in the reproduced Horizons query.

This is not the same statistic as the containing cell's 5946.128417969 m. The difference is not an error: it reflects a different sampling method. For comparison, bilinear values at the other two exact reference coordinates are 1009.6715787481011 m and 769.6762636393926 m. These are audit-derived checks, not newly adopted observer heights.

### 4.4 Live Horizons reproduction

Four serialized requests to `https://ssd.jpl.nasa.gov/api/horizons.api` succeeded between **09:48:26 and 09:48:28 UTC on 2026-11-14**. All returned API signature **1.2**, position source **DE441**, observer frame **MEAN_ME (high precision)**, spherical radii **1737.4 km**, and **NO (AIRLESS)** refraction.

Common inputs, with quoted values in the actual query:

```text
format=json
COMMAND=10 or 399
OBJ_DATA=NO
MAKE_EPHEM=YES
EPHEM_TYPE=OBSERVER
CENTER=coord@301
COORD_TYPE=GEODETIC
SITE_COORD=37.36667,-85.4381,<altitude_km>
TLIST=2026-11-14 12:00:00
TLIST_TYPE=CAL
TIME_TYPE=UT
QUANTITIES=4,13,20
APPARENT=AIRLESS
RANGE_UNITS=AU
CSV_FORMAT=YES
EXTRA_PREC=YES
TIME_DIGITS=SECONDS
```

| Altitude km | Target | Azimuth ° | Center elevation ° | Equatorial angular diameter arcsec |
|---:|---|---:|---:|---:|
| 0 | Sun (10) | 83.301542163 | +2.094722238 | 1941.825 |
| 0 | Earth (399) | 320.816667632 | −0.587903343 | 6492.344 |
| 5.948899 | Sun (10) | 83.301542163 | +2.094719934 | 1941.825 |
| 5.948899 | Earth (399) | 320.816667632 | −0.588744225 | 6492.343 |

These agree with the demo/fixture and south-pole research values. The extra-precision query produces expanded CSV column names (`Azimuth_(a-app)`, `Elevation_(a-app)`); it is not a drop-in raw fixture for the application's current shorter-name parser. The application does not currently request `EXTRA_PREC=YES`.

The [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html) labels its documentation version **1.3**; the live service returned **1.2**. Both statements in the research documents are therefore supported. Do not assume a documentation heading and runtime signature must be identical, and do not overwrite the observed runtime signature.

Using a circular-disk approximation at the elevated observer:

```text
Earth angular radius = 6492.343 / 7200 = 0.9017143056 degrees
Earth upper limb     = -0.588744225 + radius = +0.3129700806 degrees
Sun angular radius   = 1941.825 / 7200 = 0.2696979167 degrees
Sun lower limb       = +2.094719934 - radius = +1.8250220173 degrees
```

These are contacts with a mathematical horizontal plane, **not proof of local visibility**. The `*` and `i` markers indicate the documented upper-limb/reference-horizon states, not terrain clearance, power or a communications link.

### 4.5 Ridge check: strong center-ray evidence, not complete disk evidence

At the quoted, rounded ridge coordinates **−85.34185°, +36.40708°**:

- Local Site06 5 m bilinear height: **6384.412975779019 m**.
- Regional adjusted 20 m bilinear height: **6384.396680828406 m**.
- Spherical distance from the observer: **3739.941390 m**.
- Bearing from the observer: **320.815788°**.
- Terrain angle using observer altitude 5948.899 m: **+6.55719074°**.

The small bearing difference from Earth's azimuth is consistent with the ridge coordinates having been rounded in the document. The result supports the reported approximately 3.74 km / +6.56° ridge and the approximately 6384.4 m height agreement. It is strong evidence of obstruction near the Earth-center direction in those models, not proof of the global maximum or continuous full-disk obstruction.

## 5. Formula audit and visualization contract

### 5.1 Projection and pixel registration

For the specific spherical polar stereographic products:

```text
rho = 2 R tan(pi/4 + phi/2)
X = rho sin(lambda)
Y = rho cos(lambda)
```

Angles are radians, distances meters, longitude east-positive. This is consistent with the [PROJ stereographic parameters](https://proj.org/en/stable/operations/projections/stere.html) and the inspected metadata. This audit repeated the arithmetic; it did not execute PROJ as an independent projection oracle.

For the north-up, axis-aligned local rasters:

```text
columnContaining = floor((X - Xleft) / pixelSize)
rowContaining    = floor((Ytop - Y) / pixelSize)

columnCenterCoordinate = (X - Xleft) / pixelSize - 0.5
rowCenterCoordinate    = (Ytop - Y) / pixelSize - 0.5
```

Use the latter coordinates for interpolation between centers. Reject out-of-bounds/nodata neighborhoods according to a documented rule; never turn them into zero. This simplified indexing must not be reused for an arbitrary rotated affine transform.

### 5.2 Body-fixed terrain to local angles

The broader document's spherical basis is correct:

```text
U = (cos(phi) cos(lambda), cos(phi) sin(lambda), sin(phi))
E = (-sin(lambda), cos(lambda), 0)
N = (-sin(phi) cos(lambda), -sin(phi) sin(lambda), cos(phi))
pObserver = (R + zGround + hRadial) U
v = pTerrain - pObserver
azimuth   = atan2(dot(v,E), dot(v,N)) modulo 2pi
elevation = atan2(dot(v,U), hypot(dot(v,E), dot(v,N)))
```

For a terrain point a spherical arc distance `d` away at radius `R + z`, this reduces to the south-pole document's formula:

```text
theta = d/R
up = (R+z) cos(theta) - (R+zObserver)
horizontal = (R+z) sin(theta)
elevation = atan2(up, horizontal)
```

Both include lunar curvature. **Do not apply a second curvature correction.** Here `d` is an arc on the reference sphere, not a map-grid Euclidean distance or a 3D chord. Radial height is not necessarily height along the local terrain normal. A physical observer position must not be calculated with display exaggeration.

A local test compared scalar and body-fixed-vector forms for **2,000 deterministic randomized cases**, including a range of latitudes, bearings, radii and heights. The maximum angular discrepancy was **3.47 × 10⁻¹³ rad**; basis orthogonality/unit residual was at most **3.34 × 10⁻¹⁶**. This supports the algebra and implementation of the audit calculation, not real terrain accuracy.

For a smooth sphere and an observer at height `h` above that same sphere:

```text
horizonElevation = -acos(R / (R+h))
```

At `R=1737400 m`, `h=2 m`, this is **−0.0869365719°**. The tangent-point calculation agreed to about **4.0 × 10⁻¹⁴ rad**. A negative terrain horizon is therefore not inherently erroneous. Do not clamp every skyline to zero, and do not confuse 2 m above local terrain with 2 m above the reference sphere.

These equations alone do not prove completeness of a sampled horizon, account for unresolved boulders, or propagate DEM uncertainty.

### 5.3 Text, 2D and 3D must represent the same result

For the existing 3D axes, a unit direction is:

```text
x = cos(elevation) sin(azimuth)
y = sin(elevation)
z = -cos(elevation) cos(azimuth)
```

The current code matches this. Cardinal tests give north `(0,0,-1)`, east `(1,0,0)`, south `(0,0,1)`, west `(-1,0,0)`, and zenith `(0,1,0)`.

For any future 2D view, specify the projection rather than treating screen coordinates as angles. A horizon graph can use azimuth horizontally and elevation vertically, with wraparound handled explicitly. A sky map needs a stated projection and below-horizon convention. It must not silently collapse upper and lower hemispheres into the same marks.

The current scene and text panel share the `data` object. The hook aborts superseded requests and the results panel labels stale selections and errors. Those are good design features visible in source inspection, but there were no browser interaction/race-condition tests in this audit. A new projection, export or terrain view still needs checks that it shares the same site, time, height, frame, corrections and validity state.

### 5.4 SPICE, disks and physical metrics

The proposed routine descriptions are supported, with their boundaries:

- [azlcpo](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html): local ellipsoid-normal axes; clockwise azimuth with `azccw=false`, positive elevation with `elplsz=true`; no terrain horizon; km/radians output; correction differences noted in F-12.
- [illumf](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/illumf_c.html): the `lit` flag tests visibility of the **source center**, not integrated solar-disk exposure.
- [occult](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/occult_c.html): supports the documented ellipsoid/point combinations and DSK plus point, not a generic extended-disk/terrain integration shortcut.

A flat-angular-horizon comparison using center clearance `c` and circular radius `rho` is valid as an approximation: hidden for `c < -rho`, fully above for `c > rho`, partial between, uncertain at boundaries within model error. For rugged terrain, use the full disk and an uncertainty-aware skyline.

The proposed `irradiance ≈ solarIrradianceAtDistance × visibleFraction × max(0,n·s)` has units W/m² and requires unit vectors in the same frame. It assumes an appropriate radiance/exposure approximation and is **not** power in watts or energy in watt-hours. Those require additional area, efficiency and time integration, among other physical inputs.

## 6. Source and claim coverage register

This register groups related claims so that catalog verification is not confused with validation of all underlying products.

| Claim family in the input documents | Audit evidence and disposition |
|---|---|
| NASA reference book, 2025-03-18 baseline, 93 pages; three centers and 5–10 m accuracy | **Verified source.** PDF table and frame appendix read. Reference points are not certified landing sites. [Book](https://ntrs.nasa.gov/citations/20250002845). |
| PGDA local Site06/DM2/Site04 names, 5 m rasters, units, frame, interpolation and error layers | **Verified source and reproduced samples.** README explicitly gives raster heights in meters and local XYZI coordinates in **km**. [Product 78](https://pgda.gsfc.nasa.gov/products/78), [README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README). |
| PGDA regional adjusted products and metadata | **Verified source; selected headers and ridge sample reproduced.** Product 90 gives MOON_ME/DE421, layer meanings and regional XYZI coordinates in **meters**, unlike the local archive. The distinction must remain product-specific. The 10 m raster's pixels were not checked. [Product 90](https://pgda.gsfc.nasa.gov/products/90). |
| 87–90°S 5 m mosaic, fractional overlap counts, 30–55 cm mosaic-to-field RMS | **Verified source.** Supports nominal Shackleton latitude, not the two Nobile latitudes. RMS is a comparison statistic, not absolute local accuracy. Mosaic pixels were not checked. [Product 81](https://pgda.gsfc.nasa.gov/products/81). |
| Standard PDS LDEM_80S_20M and LDEM_875S_5M decoding and metadata | **Verified labels.** V2.0, 2017-06-15 creation, dimensions, int16 little-endian, `height_m = DN × 0.5`, `radius_m = height_m + 1737400`, no nodata constant in the inspected labels. 87.5° limit differs from the adjusted 87° mosaic. Full IMG files not downloaded. [20 m label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl), [5 m label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_875s_5m.lbl). |
| Archived binary sizes | **Arithmetic consistent with labels:** 30400² × 2 = 1,848,320,000 bytes; 30336² × 2 = 1,840,545,792 bytes. Approximate catalog download sizes are not memory budgets or scientific accuracy claims. No complete-file checksums obtained. |
| SLDEM2015 coverage and FLOAT units | **Verified label.** Equatorward of ±60°, so none of the demo points; 15360 × 23040 float32; unit km, scale 1, offset 1737.4. The comment saying radius “in meters” conflicts with the explicit fields; the research correctly flags it. Use `height_m = DN × 1000`. JP2 not validated. [Label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/tiles/float_img/sldem2015_512_00n_30n_000_045_float.lbl). |
| NAC NOBILE01 and SHACKRDGE02 | **Verified catalogs.** Their stated pixel scales, bounds and quoted error numbers match. The named selected sites are outside the respective catalog bounds. This does not prove no other NAC DTM covers them. [NOBILE01](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01), [SHACKRDGE02](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02). |
| NAC footprint collection and error definitions | **Verified source.** Page says through 2026-09-15; relative LE is vertical precision at 90% confidence, not interchangeable with LOLA RMS. Complete footprint intersection and valid-mask tests not run. [Footprints](https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS). |
| WAC GLD100 | **Verified source.** Native stereo ±79°, 100 m grid, about 300 m effective resolution, estimated 10–20 m elevations; non-100 m products fill poles with LOLA. Not native polar WAC terrain. [Catalog](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100). |
| USGS Kaguya DTM collection | **Verified collection documentation.** More than 127,000 DTMs, ±70° range, 7–37 m grid, version 2 update on 2026-08-12 and above-sphere rather than geoid-adjusted heights. No individual tiles validated. Native JAXA product details remain unverified here. [USGS](https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/). |
| Shape-from-shading archive | **Verified catalog/README.** 13 original 2022 regions, 5 m products, v1.0.0, 26.6 GB listed archives, Nobile boxes contain the coordinates; selected Shackleton longitude lies outside the README's stated overall longitude bounds. Exact raster masks/registration/vertical accuracy not tested; near-polar bounds are not substitutes for full footprints. [PGDA 104](https://pgda.gsfc.nasa.gov/products/104), [Zenodo](https://zenodo.org/records/17954508), [README](https://zenodo.org/records/17954508/files/README.md?download=1). |
| ME/PA distinction and SPICE kernel pairing | **Verified source, not executed.** Preserve realization, model and load order; add F-05's residual ME distinction. [NAIF FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf), [PGDA 95](https://pgda.gsfc.nasa.gov/products/95). |
| Polar illumination and Earth visibility maps | **Verified source.** Approximately 18.6-year hourly averages; Earth visible if any disk portion is unobscured; averaged COG overviews unsuitable as native-grid quantitative values. Not arbitrary-time or station-specific results. [PGDA 69](https://pgda.gsfc.nasa.gov/products/69). |
| Barker 2021 uncertainty and horizon methods | **Verified paper sections.** Interpolation/error modeling and 720 rays at 0.5° supported. Published nested-grid distances differ from the exploratory profile; no automatic transfer of its validation. [Paper](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf). |
| Shackleton regional dimensions | **Partially reverified.** Primary PDF supports 21 km diameter and 4.1 ± 0.05 km depth. Extracted table text corrupts the decimal in the reported **30.5° average wall slope**; that exact numeral was not independently confirmed from a visually inspected primary table here. It remains a contextual value to recheck, not an input certified by this audit. It is also distinct from the reproduced 31.49° local slope. [Zuber PDF, table 1](https://ntrs.nasa.gov/api/citations/20120013758/downloads/20120013758.pdf). |
| Nobile crater diameter 79.27 km | **Search-supported, not fully reverified from the retrieved feature page.** The official USGS result is indexed with this number, but direct page extraction did not expose the feature record. Recheck before treating this audit as its primary verification. Crater-center metadata cannot replace the selected reference point. [Gazetteer feature 4321](https://planetarynames.wr.usgs.gov/Feature/4321). |
| Diviner units/missing values and version | **Verified documentation.** PDS identifies `tb = -9999` in affected RDR records; instrument site identifies RDR 3.1. Individual products/quality flags still need inspection; do not infer that all files have the same state. [PDS](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm), [instrument team](https://www.diviner.ucla.edu/data). |
| ShadowCam and LCROSS contextual claims | **Verified NASA descriptions.** ShadowCam imagery reveals terrain in shadow; LCROSS observed impact material at Cabeus. Neither establishes a DEM height or ice concentration at the demo points. [ShadowCam](https://science.nasa.gov/image-article/apod-2023-may-5-shackleton-from-shadowcam/), [LCROSS](https://science.nasa.gov/mission/lcross/). |
| Thermal, radio and historical horizon references | **Reference existence/scope checked, not simulation validation.** HLS guide catalog is a January 2021 publication; DSN handbook is an entry point with module-specific revisions; Bryant abstract supports horizon-mask methodology. No thermal/link model or full Bryant-paper reproduction performed. [HLS](https://ntrs.nasa.gov/citations/20210010030), [DSN](https://deepspace.jpl.nasa.gov/dsndocs/810-005/), [Bryant](https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html). |
| Reuse/license claims | PDS FAQ's public-domain/citation guidance **verified**; this is not a license determination for every linked third-party asset. The earlier report's precise Zenodo `cc-by-4.0` API value was **not independently re-queried in this audit**. Retain the product license record before redistribution. [PDS FAQ](https://pds-geosciences.wustl.edu/faq.html). |
| Moon Trek WMTS, GDAL access commands, browser CORS and deployment | **Not operationally validated.** Documentation links and example commands are not evidence of a working browser deployment. No imagery-to-elevation decoding is justified. Successful partial raster access here coexisted with HTTP 403 failures. |
| Event/resource links and exhaustive catalog coverage | **Not certified.** General NASA portals supplied for discovery do not validate specific lunar calculations; Earthdata, Worldview and FIRMS are not substitutes for lunar frames/DEMs. This audit prioritizes the owning lunar products, JPL and NAIF, not exhaustive verification of unrelated portal functionality or event rules. |

## 7. Acceptance gates for a trustworthy user workflow

These are proposed engineering/scientific requirements, not new approved project decisions.

| User step | Required evidence before a strong reliability claim |
|---|---|
| Select a point | Exact coordinates, convention, source/frame, coordinate precision, and distinction between mathematical point and region/landing site. No silent default-Earth CRS. |
| Select date/time | Explicit UTC input/output, range and leap-second limitations; validated UTC-to-ephemeris conversion; no accidental local-time conversion. |
| Choose observer model | Visible choice/assumption of reference sphere versus terrain, sampled elevation method and radial/normal instrument height. Same observer in every panel. |
| Fetch/calculate | Correct Sun/Earth IDs and lunar center; returned target, center/site, epoch, units, frame, radii, corrections, finite ranges and version validated per body. Preserve exact request/response. |
| Display text | Correct apparent/geometric terminology, units, error/unknown state, effective uncertainty/precision and provenance. Never promote unavailable data to zero. |
| Display 2D/3D | Tested coordinate transform/projection, cardinal signs and angular wrap; distinguish direction markers from disk shapes; same snapshot as text. Schematic scaling and lighting clearly identified. |
| Add terrain | Valid masks and quality layers; controlled frame alignment, pixel registration and resampling; no unverified seam; observer not inside the surface; complete uncertainty-aware horizon. |
| Report visible/hidden | State center/any-part/full-disk semantics; disk shape and eclipse handling; convergence and error margins; “indeterminate” where coverage/model error prevents a conclusion. |
| Report hours/outages | Same validated timeline, interval weights, refined transitions, smaller-step convergence, unknown-duration accounting and interval-specific provenance. |
| Handle failures | Stale results visibly retain their own site/time; no silent fixture substitution; partial results remain partial; backend throttling/timeout/version changes do not masquerade as a successful current calculation. |
| Export/use in research | Export methods, inputs, versions, uncertainty, validity masks and reproducibility artifacts along with numbers. Independent reviewer signs off the intended scientific use. |

### Minimum test matrix still needed

1. All three sites, multiple dates, dates near visibility transitions and supported-range boundaries; compare convention-matched independent calculations, not just the reference instant.
2. Controlled sphere, isolated ridge, narrow unsampled gap/peak, below-zero horizon, changed instrument height, azimuth wrap, near-zenith and missing-tile cases.
3. Wrong target/site/epoch/units/frame/diameter, non-finite numbers and changed CSV columns/API versions; reject rather than guess.
4. Sun/Earth responses arriving out of order or with different provenance; edit selection during a request; stale, partial, timed-out and offline states.
5. Center/upper/lower limb, partial disk, oblate Earth where relevant, eclipses and grazing cases; explicit uncertainty classification.
6. Terrain radial/azimuth/extent refinement, source-overlap and observer-location perturbations; correlated uncertainty or justified conservative bounds.
7. Visual QA in both languages and every implemented view; no claim that an unscaled mesh or fixed light reproduces physical visibility.

## 8. Checks executed and evidence retention

### Observed checks

- **Passed:** `npm run check` — typecheck, lint and **87 tests across 9 files**.
- **Passed:** `npm run build` — production build completed; Vite emitted a **chunk-size warning above 500 kB**. Not a scientific failure and not addressed in this documentation-only task.
- **Passed:** 15 local containing-cell comparisons; 3 local bilinear extractions; selected TIFF metadata checks; local/regional ridge height and geometry checks; 4 live Horizons queries; 2,000 scalar/vector consistency cases and smooth-sphere tangent test.
- **Document diagnostics:** an active path probe reported one informational spelling suggestion for the existing filename `DECISIONES.md`; that filename is intentional. This is not scientific validation.
- **Demonstrated weaknesses:** 3 parser adversarial cases in F-07. These were external audit probes, not newly added passing regression tests.
- **Incomplete:** complete nested terrain-profile reproduction, stopped by HTTP 403; no convergence claim.
- **Not run:** SPICE numerical comparison, independent GDAL/PROJ raster/projection validation, deployed API tests, browser visual/interaction tests, power/radio/thermal simulations or full product-file checksum verification.

Temporary Python audit scripts used `requests` with TLS verification and standard-library binary/numerical processing. Local TIFF samples were decoded from the declared storage layout; the selected regional ridge was decoded from a DEFLATE/floating-point-predictor BigTIFF tile. This is a fresh extraction, **not independent verification by GDAL or a survey instrument**. No project dependencies were changed, and multi-gigabyte rasters were not downloaded in full.

Some small-range raster requests returned HTTP 403; larger bounded reads succeeded for the verified samples. The later profile attempt still encountered 403 and was stopped. No authentication or TLS verification was bypassed.

### Input fingerprints

SHA-256 of the audited local document bytes:

```text
LUNAR_DATA_RESEARCH.md
 a905d2667fda6c1c3eb169c0cdd1d3a954635b766637fbce2fda1bbdfbb5c41d
LUNAR_SOUTH_POLE_RESEARCH.md
 dc8488a502835d808ae8568478d65c7628fb51eb80e8be2dc0479c7bfe82a9c9
```

SHA-256 of the **first 32,768 bytes only** of the local elevation TIFFs (not complete-file hashes):

```text
Site06  8eaf8daaa961acda34582de1de745e4fbd5da153895d2d0bf17c76382d1efa34
DM2     befb9c24dbd4a530a7c7d931e5cad78079c0bd9982a1aabfe399021a2cfa703b
Site04  267b004fc054c775241b75d1e73db42ea42aa67aa579d772d1fe702612954962
```

SHA-256 of the four raw live JSON response byte strings:

```text
Sun,   h=0         cc011ce85d0d2b2b41904bd771962532404b40c8dfd260466dc2f77f3fff0ca1
Earth, h=0         45c18856e83f91f25a36d18d54e2f327ad8824b58241acf2c5db5b9312ec59b9
Sun,   h=5.948899  0d47436567cec3d34c4459b3bfd085c79bfbefe590bc485838e3bcdc2904a725
Earth, h=5.948899  30e16dfe4aa279bc86bc568ffd4c5d05ba19a4c49cf30019f3f5ed155226ef69
```

A fresh response includes a new generation timestamp, so its full-body hash can differ even if the numbers match. Compare the scientific inputs, model headers and rows, not just the response hash.

Audit working files were retained locally under `C:/Users/crown/AppData/Local/Temp/lunar_audit_20261114/`, with scripts `lunar_audit_20261114.py` and `lunar_profile_audit_20261114.py` in its parent directory. They are **temporary local evidence, not committed, durable, or included in the deliverable**. The compact inputs/results above remain in this report; a production research bundle must preserve its own durable raw assets and executable method. A future reviewer must not assume those temporary files still exist.

## 9. Recommended disposition for the team

1. **First, correct interpretation and reliability defects:** F-01, F-07 and F-08; clarify F-02 and F-09 visibly. This audit did not implement fixes.
2. **Keep the agreed no-terrain demo narrow:** apparent directions from an explicitly hypothetical reference-sphere observer; not a terrain-visibility, power or communications prediction.
3. **If terrain is adopted, treat the south-pole profile as a research example, not a production oracle:** close F-03 through F-06 and F-11/F-12, preserve the full evidence bundle and obtain science-owner review.
4. **For research use, agree the uncertainty and validation contract before promising accuracy:** include the tolerated errors, supported domain, shape/frame/time conventions and what “indeterminate” means.
5. **Request review by Diego and the integrator.** This audit is one review, not independent human scientific approval.

Proposed `ESTADO.md` update: record that data-source auditing and selected numerical reproductions are available, the application/fixtures now exist, and scientific terminology, response validation, upstream policy and terrain validation remain open. Proposed `DECISIONES.md` topics: explicitly choose apparent versus geometric output, observer-height model, visibility/disk semantics, uncertainty requirements and intended research-use limits. These are proposals only; neither file was modified.

**Bottom line:** the documents contain useful, largely well-sourced research and reproducible model numbers. They do not establish an application that is “100% correct” for research or safe mission decisions. Use the verified facts with their provenance; keep the named unverified outputs and physical approximations visible; and do not promote numerical reproducibility into a guarantee of reality.
