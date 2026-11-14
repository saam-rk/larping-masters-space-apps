# Polar terrain validation follow-up

**Date:** 2026-11-14 UTC. **Scope authorized by the integrator:** reproducible research across the south pole, not application implementation. The user explicitly requires terrain elevation and nearby relief to be represented in the eventual product. This is a product need, not evidence that the current application implements it or that any landing site is safe.

This report supplements, rather than rewrites, [LUNAR_RELIABILITY_AUDIT.md](LUNAR_RELIABILITY_AUDIT.md). Preserve that audit's historical evidence and distinguish it from this session. Primary-source details and citations are in [POLAR_TERRAIN_SOURCE_REVIEW.md](POLAR_TERRAIN_SOURCE_REVIEW.md). Executable checks and retained evidence are in [research/polar-terrain-validation](research/polar-terrain-validation/).

## 1. What was verified, and what was not

### Newly verified

- **Source documentation:** regional adjusted LOLA products provide nested south-polar terrain and quality layers, including 10 m grids poleward of 83°S and 20 m grids poleward of 80°S, with wider support to 75°S and 60°S. These are nominal product coverages, not a new census of valid pixels. [PGDA 90](https://pgda.gsfc.nasa.gov/products/90), [Barker 2023](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf).
- **Independent software extraction:** GDAL/Rasterio freshly read a 5 × 5 elevation window and a 5 × 5 slope window from the published Site06 products. The containing-cell elevation **5946.12841796875 m**, slope **15.047022819519043°**, and bilinear ground **5946.899465547405 m** agree with the earlier audit. These are independent reader/projection checks on the same model, not independent physical observations.
- **New nearby-relief example:** the 25 retained elevation cells span **5942.9208984375–5949.17138671875 m**, a **6.25048828125 m** difference. The raster window has a 25 × 25 m footprint, with 20 m between its extreme cell centers. It is aligned to the grid around the containing cell, not an exactly centered circle. This verifies variation among those model cells, not a continuous minimum/maximum or a landing-hazard threshold.
- **Projection:** PROJ and the audit's spherical stereographic expression agree within **1.65 × 10⁻¹⁰ m** over 200 synthetic coordinate cases spanning 60–90°S and longitudes −180…180°. This validates this projection arithmetic, not the ME frame realization or physical geolocation.
- **Analytic geometry:** smooth-sphere tangent, curvature sign, observer-height direction and a synthetic ridge sanity check passed. At 2 m above a smooth 1,737,400 m sphere the horizon is approximately **−0.08693657°**.
- **Inherited-input recomputation:** the rounded ridge coordinates and the *earlier audit's* ridge height give distance **3739.941390 m**, bearing **320.815788°**, and terrain angle **6.557184°** using the unrounded bilinear observer altitude. This is not a newly read ridge height. Its tiny difference from the audit's 6.55719074° reflects the audit's rounded observer altitude of 5948.899 m.

### Not newly verified / still blocked

- New extraction of the other 13 local layers, regional ridge, or a complete 5 km near-field patch: **blocked by HTTP 403/read failures** after the first two windows succeeded. The live run retained **16 failed stages**, explicitly listed in `results.json`. A failed read is not an invalid terrain value or zero height.
- The earlier full solar/Earth profiles, the −3.8795° solar maximum at 153.1 km, disk-wide claims, 400 km completeness, and radial/angular/extent convergence: **not reproduced**. The new near-field read failed before profile generation. No CSV profile is claimed.
- Complete regional valid masks, quality statistics, all-pole elevation accuracy, exact NAC/SfS coverage intersections, independent physical terrain comparison, SPICE/frame transforms, or uncertainty propagation: **not executed**.
- Fresh Horizons requests or a new application/parser/security/visual review: **not performed**. The audit's F-01 and F-07–F-10 remain prior findings, not newly fixed defects.

**Conclusion:** there is enough sourced evidence to design a terrain-aware educational/exploratory product and demonstrate a local terrain-height extraction. There is not enough evidence to claim complete validated shadows or landing suitability across the south pole.

## 2. Corrections and qualifications to carry forward

| Audit topic | Disposition after this session |
|---|---|
| F-01: apparent versus geometric | Still requires application/documentation correction. Use “apparent airless Sun/Earth direction”; the terrain geometry can be geometric without making the astronomical direction instantaneous/geometric. No app change here. |
| F-02: observer at reference altitude zero | Reinforced by a fresh GDAL elevation sample. Terrain mode must use `referenceRadius + terrainElevation + observerRadialHeight`, not `h=0`. A 5947 m datum elevation is **not** a 5947 m mountain above neighboring ground. |
| F-03: full horizon | Remains open. A published study configuration is not proof for this site's sparse rays or all polar observers. See the cutoff analysis below. |
| F-04: uncertainty and interpolation | Strengthened: the regional error maps model uncertainty of **average pixel height/slope**, not every unresolved boulder or crater. The paper fits error versus effective resolution from four representative tiles; this is not a local independent survey of every pixel. Grid spacing, effective resolution and height RMS must be separate UI/export fields. |
| F-05: frames | Unchanged. PROJ agreement is not a DE421/DE440/IAU_MOON transformation. The GeoTIFF's generic/unknown datum WKT does not encode the complete realization; retain provider frame documentation separately. |
| F-06: disk visibility | Still open. The 2021 paper itself uses an approximation based on the skyline at solar-center azimuth for disk exposure, not exhaustive rugged-skyline disk integration. Do not cite it as validation of the latter. |
| F-07/F-08: response validation and upstream policy | Existing findings remain uncorrected; no implementation authorized. |
| F-09: schematic visualization | Existing limitation remains. A relief visualization must keep calculation heights separate from any display exaggeration, and fixed hillshade must not be called a time-specific shadow simulation. |
| F-10: time limits | No new time validation performed. |
| F-11: reproducibility | Improved only for the bounded new evidence: two retained GeoTIFF windows, metadata/hashes, software versions, source URLs, scripts and offline checks. Not a complete scientific bundle for the original terrain profile. |
| F-12: independence | Improved reader/projection independence; **not** independent physical validation. NAC stereo observes morphology differently but commonly uses LOLA for registration; SfS also retains LOLA control. No equally detailed independent whole-cap truth dataset was established. |
| F-13: mission conclusions | Still unsupported. Neither height nor visibility alone certifies approach, touchdown, power or communications. |

The source review further confirms that the 5 m mosaic is 87–90°S and local 5 m/SfS products do not cover the entire cap. GLD100 polar filling is LOLA-derived; SLDEM2015 and the reviewed USGS Kaguya collection exclude the polar core. Dataset names are not valid-pixel checks. [Source review §§2–5](POLAR_TERRAIN_SOURCE_REVIEW.md).

## 3. Why “whole south pole” needs two boundaries

An explicit northern observer boundary is still needed before implementation. **80–90°S, all longitudes** is a useful proposed research core, not a newly adopted application decision. Keep:

1. **Observer coverage:** locations where a user may select a point.
2. **Terrain support:** all surrounding terrain needed for that observer's horizon.
3. **Validated coverage:** locations/directions/scales actually tested successfully.

For `R = 1737400 m`, a 400 km surface arc subtends `400000/R = 13.19115449°`. A due-north ray from 80°S reaches approximately **66.80884551°S**. Thus the 80–90°S 20 m map does not by itself support that whole ray. Wider products may supply a halo, subject to their actual valid masks and resolution. Extending coverage is not equivalent to preserving narrow ridge heights: coarse products can average away peaks.

### A defensible finite cutoff is possible, but needs a bound

With observer radius `rO`, maximum terrain radius `rMax`, and central angle `theta`, an upper-angle envelope is:

```text
upperAngle(theta) = atan2(rMax*cos(theta) - rO, rMax*sin(theta))
```

For `rMax >= rO` and `0 < theta < pi`, this decreases with distance: the angle derivative has the sign of `rO*cos(theta) - rMax`. Therefore a **justified upper bound** on all omitted terrain can exclude it from controlling the horizon. A numerical maximum among sampled/coarsened cells is not automatically such a bound for real unresolved terrain.

For the Nobile observer at **5948.8994655 m** above the datum, a terrain point exactly 400 km away would require approximately:

- **53,195.29 m** above the datum to reach the observer's horizontal plane;
- **25,179.93 m** above the datum to reach a ray at **−3.8795°**.

These are conditional geometric thresholds, **not claims that lunar mountains have those heights**, and not validation of the inherited −3.8795° profile maximum. They explain how a cutoff could be justified rigorously instead of chosen without evidence. As a synthetic illustration only, assuming a 12,000 m upper cap gives a maximum angle of **−5.73715°** at 400 km; this session did **not** establish that cap as a validated global terrain bound. Record the assumed bound's source, validity and subpixel margin before using it operationally.

## 4. Nearby terrain matters even when altitude corrections to ephemerides are small

The fresh 25-cell example already has about **6.25 m of model elevation variation**. A single site's datum altitude therefore cannot describe the neighboring relief. Report altitude, slope and neighborhood variation separately, with scale and sampling method.

As a simple differential-height sensitivity, `atan2(1 m, distance)` is approximately **5.71° at 10 m**, **0.573° at 100 m**, **0.0573° at 1 km**, and **0.00573° at 10 km**. These are illustrative angular sensitivities near a horizontal line, not propagated physical uncertainty or a new error layer. At grazing illumination, nearby unresolved relief can matter much more than the small change in the astronomical direction caused by adding ground altitude.

Bilinear interpolation gives a reproducible subpixel value, not additional measured detail. A useful teaching label would be:

> Estimated terrain elevation: about 5,947 m above the 1,737.4 km lunar reference sphere. Source: adjusted LOLA Site06; 5 m grid; bilinear sampling. Nearby retained model cells vary by about 6.3 m across a 25 m grid window. Small obstacles are not resolved; this is not a landing-safety assessment.

This is a suggested wording, not an implemented bilingual string or a universal uncertainty statement. The earlier audit's `ldec=0` and RMS for the containing cell can be retained as **prior evidence**, but were not freshly re-read here. Do not attach that one-cell RMS to the bilinear estimate as if it were its propagated error.

## 5. Proposed implementation contract for the user's terrain requirement

No application work is included, but the research supports this ordering:

### First: measured/model terrain context

- Show estimated elevation with datum, units, frame realization, source, grid spacing, effective resolution where available, sampling method and quality/support state.
- Offer a terrain patch or contour/profile view plus a text alternative. Show the selected point on that patch, and explicitly label display exaggeration.
- Show nearby relief over **named distances**, and slope/roughness with their spatial baseline. Avoid a binary “elevated/dangerous” flag without mission-specific criteria.
- Distinguish `validInterpolated`, `directReturnsPresent`, `outsideCoverage`, `nodata`, `requestFailed` and `stale`. None of the last four becomes zero height.
- Use the same site, ground estimate, observer height and frame in text, geometry and subsequent ephemeris queries.

### Then: terrain horizon and shadow interpretation

- Archive a 360° horizon with controlling obstacle location/distance, source used, missing sectors, observer model and uncertainty.
- Independently refine near-field resolution, radial step, azimuth step, support extent and overlap seams. A converged interpolated grid is still not resolved boulder truth.
- Test the target disk across its angular footprint with explicit center/any-part/full-disk semantics; handle near-contacts as indeterminate. Include eclipses separately if claiming actual sunlight exposure.
- Do not claim whole-cap validation from the three sample sites. Test sparse-data, steep, boundary, seam, exact-pole and longitude-wrap cases across the declared domain.

### Finally: mission-specific questions

Landing approach, touchdown, astronaut/rover movement, power and radio links require their own scale, tolerances, models and review. Terrain context is useful without pretending to solve all of them. Diego and the integrator should review the scientific contract and residual risks before any user-facing prediction is adopted.

## 6. Reproduction, checks and blockers

See [bundle README](research/polar-terrain-validation/README.md). The research dependencies were installed in a temporary virtual environment, not in the React application or its lockfile. `check_offline.py` runs without network and passed **13 named checks**, including 200 projection cases. It checks retained-file hashes, values, geometry and assumptions; it does not fill failed data requests.

Observed live-reader outcome: two successful source windows, sixteen failed stages. No TLS/authentication bypass was attempted. No full source TIFF checksum, full regional raster or new raw Horizons result is claimed. The archived GeoTIFFs are decoded/re-encoded windows with their own hashes, not byte-identical subsets of the original files.

A development check initially exposed float32 scalar rounding in the offline verifier under NumPy 2; arithmetic was promoted to float64 and the check then passed. This is an implementation precision fix in the research checker, not improved physical precision. The successful live bilinear value was already computed at float64 precision. Standalone Pyright with the actual research interpreter passed; Ruff's selected correctness/import/modernization checks passed. Workspace LSP reported missing research imports because it uses a different interpreter; research-script import-only pi-lens dispositions were recorded, without changing application configuration. A final active LSP probe timed out for both scripts and is inconclusive; the successful explicit-interpreter Pyright run is the type-check evidence.

**Blocking next work:** obtain authorized, stable access to the required terrain windows (or provider-supplied local files), preserve them and rerun the near-field/regional profiles. Then perform convergence and uncertainty work. Source catalogs alone cannot close this blocker.

No application tests/build were rerun: this task did not change application code. No commit, push, merge, deployment or edits to the original audit were made.

## 7. Proposed status/decision updates — not silently adopted

- `ESTADO.md`: record that the app already exists, this source review and bounded GDAL/PROJ evidence are available, and full profiles remain blocked/unvalidated.
- `DECISIONES.md`: record the user's confirmed requirement to show terrain elevation/nearby relief, separately from implementation readiness. Agree the observer domain, height model, display quantities, horizon/disk semantics and acceptance tolerances. Existing no-terrain demo decisions remain historical scope, not proof that terrain should be permanently excluded.
- Request review from **Diego and the integrator**, including the core/halo distinction and the interpretation of model quality. This report is not independent human scientific approval.
