# Bounded lunar geometry and lighting correction

## Scope and disposition

Implementation branch: `fix/lunar-geometry-lighting`. Baseline: `e48e81d` (the audited application plus the audit document). The application tree at that baseline matched `origin/main` at `39c7fa7`; the extra file was the audit. No commit, push or merge is part of this task.

The integrator explicitly chose **bounded geometry with existing data**, a **fixed observer at the selected coordinates, 1.70 m above the mesh**, and **separate direct-solar and illustrative display modes** (D-022). This supersedes the altitude-zero assumption for new queries at the ten covered sites, not for unknown terrain or historical saved samples.

**Result:** the demonstrated direct-light contradictions have regression coverage and a receiver-local rendering correction. This is not a certified lunar illumination, irradiance, power, communications or landing model. No physical accuracy percentage can be inferred from passing software tests.

## Finding-by-finding disposition

| Finding | Before | Current bounded implementation | Remaining limit |
|---|---|---|---|
| F-01: terrain blocking | Polar meshes hid disks but cast no solar shadows | Every terrain mesh casts and receives solar shadows. A crop-wide map includes distant casters; a fine local map resolves nearby receivers. Lighting is evaluated at each surface point, not switched by camera visibility. | Finite maps, bias and a PCSS-style blocker approximation; not exact ray tracing. |
| F-02: partial disk | Source jumped to 3.2 as soon as the upper limb crossed elevation zero | Uniform finite-disk integration, continuously clipped intervals, bilinear depth comparisons, and a visible-ray direction/cosine integral. No universal elevation-zero gate. | 16 integration strips, four samples per exposed interval, finite precision; very thin crescents may be unresolved. Not limb-darkened radiometry. |
| F-03: Earth eclipse | Apollo direct light stayed at 3.2 during the audited total eclipse | Consistent Sun/Earth directions, sizes and ranges suppress total occultation; partial Earth/solar overlap participates in disk integration together with terrain and the assumed inner sphere. | Circular angular limbs; Earth atmosphere, refraction and noncircular limb are omitted. |
| F-04: artistic fill | Ambient plus fixed Apollo light mixed into the scene | Direct solar is the initial mode, with no ambient/fixed fill, no surface emission and no unlit surface-material bypass. Illustrative mode explicitly adds fill. | Brightness is still renderer/material response, not W/m². |
| F-05: observer | Sphere-height ephemerides; camera offset from the point and moving with solar bearing | Ten mesh-derived height records shared by live ephemerides, inverse searches and the fixed camera. Third-person real-scale Moon placement also uses the returned altitude. | Heights are triangle-derived model values; frame/DTM uncertainty is not eliminated. Original Apollo presentation framing changes intentionally. |
| F-06: curvature and coverage | Flat projected crop; invisible invented continuation | Inverse projection → sphere embedding → site-local axes, applied once. No invented external terrain floor. Unknown regional relief stays explicitly unknown. | No regional dataset or certified ME/DE421-to-Horizons alignment was added. A conservative smooth interior is an explicit assumption for excluding rays through the lunar body. |
| F-07: locator ghosts | Hidden disk fragments always redrawn at 0.35 opacity | Ghosts and decorative contact shadow only in illustrative mode. They never cast light or determine a visible fraction. | Labels, compass and stars remain overlays, not literal sky visibility. |
| F-08: Earth visibility | Reference-horizon status could be read as terrain visibility | Both languages distinguish apparent direction, zero-elevation reference plane, rendered mesh obstruction, unknown regional terrain and actual visibility. | No full Earth-disk terrain-visibility or ground-station communication service is claimed. |

“Corrected” in this document means corrected within D-022, not that absent regional data or scientific validation has been manufactured.

## Observer and geometry contract

- Lunar reference radius: **1,737,400 m**.
- Input mesh height: radial elevation relative to that sphere, not eye height.
- Instrument height: **1.70 m above the selected mesh point**, separate from the illustrative astronaut's height.
- Ephemeris altitude: `(groundElevationM + 1.7) / 1000`, km above the same reference sphere.
- `shared/terrain-observers.json` records exact site coordinates, source GLB path, SHA-256, interpolated radial height and instrument height. It is generated, not hand-maintained.
- Polar meshes: invert their spherical south-polar stereographic projection. Apollo: invert the metadata equirectangular projection (standard parallel 1°, central meridian 180°). Embed every vertex at `R + radialHeight`, then resolve east/up/north at the selected site. The cached GLBs and published assets are not edited.
- Ray/triangle interpolation of the curved mesh finds the radial ground coordinate; no vertical exaggeration is introduced. Applying curvature to an already-curved copy is rejected.
- Exact coordinate matches can reuse a known observer. A nearby arbitrary point cannot. All other catalog/custom points retain an **explicit reference-sphere observer**, not an invented zero terrain elevation.
- Historical samples retain their actual altitude-zero observer. Their celestial directions remain available, but they cannot silently activate the revised direct-solar surface calculation. A new compatible query is required.
- D-020 duplicate-update behavior remains intact. Both bodies and lighting read the same displayed result snapshot, including playback.

### Metadata and failure handling

Single-instant upstream results are checked for target, Moon center, geodetic observer coordinates/altitude, 1737.4 km spherical radii, UT header, airless convention, range units and requested epoch. Coordinate/header tolerances are `1e-5 deg` and `1e-5 km`, for the observed printed metadata precision only—not physical accuracy bounds. Inconsistent body epochs/frames become explicit partial failures. Unexpected frame/model realizations cannot activate direct surface lighting.

Nonfinite/out-of-domain parsed numbers are rejected; missing values remain missing. Nominal diameters/ranges may still support a labeled illustrative body drawing, but do not count as known direct-solar input. Range-series parsing retains its existing request/header contract apart from finite/domain checks; it is not claimed to have the complete new single-instant metadata guard.

## Rendering method and limitations

`solarExposure.ts` supplies the analytic straight-horizon circular segment and angular-circle eclipse overlap, using spherical separation of the apparent centers. These are **uniform-disk area fractions**, not surface irradiance.

`solarMaterial.ts` uses a PCSS-style shadow approximation with the measured angular solar radius:

1. Crop-wide 4096² depth map with all terrain casters, including remote ridges.
2. Local 2048² map over a 256 m light-space width (**0.125 m/texel**), retaining crop-wide depth. Its carrier light has zero intensity: it is not fill light. The coarse map is used when the local filter footprint would leave its coverage.
3. Central blocker depth when present; otherwise a bounded nearby blocker search. Averaging unrelated near/far blockers was rejected after it leaked light into fully blocked audited receiver patches.
4. Receiver-plane depth-gradient correction for search and bilinear comparisons, avoiding false self-shadowing of a clear sun-facing slope.
5. Sixteen exact-area disk strips, four midpoint samples per exposed interval. Earth occultation removes intervals, rather than independently multiplying two possibly overlapping visibility fractions. The exposed rays determine an effective direction and cosine integral, so the center direction alone cannot discard an exposed upper limb.
6. A smooth spherical interior below the minimum known crop height blocks rays through the lunar body and permits depressed horizons. It is **not a measured external horizon**. Outside-crop obstacles remain unknown.

The implementation is an orthographic, finite-map graphics approximation. Different blockers at different depths, mesh resolution/interpolation, material normals, shadow bias, source quadrature and map boundaries can still produce errors. Directions are parallel across the crop; near-surface parallax and different lunar-frame realizations have not received a certified error budget. Quantitative watts, thermal balance, Earthshine, interreflection, limb darkening and atmospheric eclipse light are not modeled. Apollo props are a reenactment, not surveyed obstacles.

### Frame cost

The first version of this shader compared all 64 disk samples against the depth map for every lit pixel (about 270 depth reads, and twice that where the local map hands over to the crop-wide one), redrew both depth maps on every frame and recompiled the material program for every new snapshot. On an integrated GPU the first-person view fell to roughly 8-11 frames per second in a large window. The method above is unchanged; the work is now done only where it can change the result:

1. **Receivers facing away from the whole disk** return before any depth read. The sampled integral was already exactly zero there.
2. **Footprint classification.** Without a blocker every sample is the center point, so one comparison is exact. A footprint that lies inside one texel cell, with a complete disk and a receiver facing all of it, uses its center comparison: the comparison is bilinear inside the cell, so the continuous disk average is the center value. The 16x4 quadrature differs from it by less than 0.5%, and the mean direction is left at the disk center, less than a quarter of the solar radius away. Wider footprints are probed at the center and at eight rim points and are treated as uniform only when all nine agree; a straight shadow edge that avoids every probe removes less than 1.2% of the disk. Mixed footprints run the complete 64-sample comparison as before.
3. **Uniform footprints need no comparisons.** A complete disk uses the same quadrature evaluated once per snapshot (`completeDiskIntegral`); a disk clipped by the smooth horizon or the Earth evaluates the same strips and midpoints arithmetically.
4. **Only the Sun integrates.** The zero-energy light that carries the local map, and a source with zero intensity (unknown inputs, total eclipse), skip the integration.
5. **Depth maps are redrawn on request**: a new snapshot, model or lighting mode, or a moved reenactment prop. Nothing else moves a caster.
6. **A new snapshot rewrites uniform values in place.** Materials and their compiled program stay installed, so playback and updates no longer recompile.
7. **Low performance mode** draws the 3D view at one pixel per CSS pixel instead of up to 1.5.

Observed after the change:

- `check-lighting-gpu.mjs` reproduces every recorded number without change: ridge 0/187, eclipse 0, fill 86, the seven first-contact readbacks (0, 0, 0, 6, 188, 254, 254) and all nine receiver probes, including Nobile Rim 1 at 46.05086%.
- Full-frame comparison of the eleven harness renders against the previous shader: at most 0.13% of pixels differ by more than 2/255 and at most 0.02% by more than 8/255 (largest single difference 35/255). They are isolated pixels inside the depth-comparison speckle that both versions show on grazing slopes; the classification changes which pixel of that noise is drawn, not its amount.
- In the production build, changing the date on an already loaded terrain gives the same image as loading that date directly, so held depth maps and in-place uniforms follow the snapshot.

Median frame time while dragging the first-person view of the production build (Intel UHD Graphics, Chromium 158 through ANGLE/Direct3D 11, each frame forced to complete with a pixel readback; Apollo 11 with the Sun raised to 10.7 deg for load, a timing fixture and not an ephemeris):

| Window and mode | Before | After |
|---|---:|---:|
| 1280x720 at 150% scaling, low performance | 33-51 ms | 16 ms (display rate) |
| 1280x720 at 150% scaling, full effects | 40-47 ms | 16-24 ms |
| 2560x1440, low performance (1924x1013 view) | 94-118 ms | 29-63 ms |
| 2560x1440, full effects (1924x1013 view) | 118-133 ms | 54-81 ms |

These are engineering timings of three sites on one machine, not a cross-device or mobile certification. The slowest case is a grazing lit slope whose depth comparison sits at its noise floor (Amundsen Rim, Nobile Rim 2): its speckled pixels are classified as mixed and still pay the complete comparison. Full effects also include the CRT filter, which this change does not touch. `window.lightingReview.timing(id, azimuth, elevation, width, height)` in `tools/lunar-terrain/lighting-review.html` times the shader alone.

## Observed validation

### Software and assets

- `npm run check`: TypeScript, ESLint and **677 tests in 60 files**, observed passing after the frame-cost change.
- `npm run build`: production build passed. Vite's large scene-chunk warning appeared in earlier executions; no warning threshold was raised.
- `node tools/lunar-terrain/generate-observers.mjs --check`: all **10** asset hashes and observer records reproduced.
- Existing coordinate/catalog, inverse-search, playback, D-020 and Apollo timeline tests remain enabled.
- Active LSP checks are supplementary: at least one server outcome was inconclusive, so the compiler—not an empty diagnostics cache—is the type-check evidence.

### Fresh Horizons evidence

`lighting-validation/horizons/` preserves **26 raw responses with exact URLs and retrieval times**, assembled into **13** paired snapshots in `lighting-validation/snapshots.json`:

- All ten terrain sites at `2026-11-14T12:00:00Z`.
- Apollo eclipse at `2025-03-14T06:58:00Z`.
- Faustini partial contact at `2026-11-05T00:00:00Z`.
- Nobile Rim 1 obstruction case at `2026-11-20T12:00:00Z`.

Requests were serial. Returned coordinates, altitude, radius, airless setting, epoch, ME frame and DE441 source were checked. The broader 28-entry/month audit remains historical evidence; this session did **not** repeat its 6,776-row sweep or claim a SPICE cross-validation.

At Nobile Rim 1, the new observer altitude is **5.948594584 km**. The representative Earth elevation changes from **−0.587903°** to **−0.588744°** (−0.000841°, about −3.028 arcseconds). This is a change due to observer consistency, **not** a measurement of absolute error in the old or new ephemeris.

### Browser/GPU evidence

Reproducible harnesses use production geometry/material functions and installed Chromium, with Playwright supplied externally (no new project dependency):

- Synthetic ridge: blocked patch RGB **0**, simultaneous clear patch RGB **187**; removing the ridge preserves the clear-patch brightness. These are readback values, not irradiance units.
- Total eclipse: direct source intensity **0**, clear-patch RGB **0**. Explicit illustrative fill yields RGB **86** with the source still zero.
- First contact: hidden, tangent, tiny sliver, half and full disks tested in order; no binary jump to full intensity. Eight-bit pixel output is not a high-precision small-exposure instrument.
- All **10 terrain assets** loaded/rendered without shader or page errors.
- Production UI replayed the recorded snapshots for all **10 sites in Spanish and English**, in both modes. Countdown failures were explicitly injected to avoid network searches; this was not a live countdown validation. Preferences were operated by keyboard in the harness.
- Screenshots and raw GPU/UI reports are retained under the local temporary `lunar-lighting-qa` directory. Portable numerical summaries are copied into `lighting-validation/`; the scripts reproduce screenshots on another machine.

### Comparison against actual mesh rays

Nine receiver-patch regressions cover all eight polar models with audit counterexamples and an additional Faustini case. These reuse audited directions and nearby audit receiver offsets, re-casting ground on the **new curved** meshes; they do not claim to be the unchanged old camera or independent lunar observations.

A small sun-facing diagnostic receiver isolates exposure from albedo/surface normal. GPU linear-light readback is normalized against the same receiver with terrain casting disabled. CPU double-sided rays sample the actual distributed triangles. Both use a **0.27°** solar radius for this fixed rendering regression (not a claim that every date has that exact radius).

| Receiver case | Old source-exposure rule | Mesh reference in this test | New GPU estimate | Absolute difference |
|---|---:|---:|---:|---:|
| Nobile Rim 1, Nov 20 | 100% | 49.21875% (1024 rays) | 46.05086% | 3.16789 percentage points |
| Nobile Rim 2, Nov 28 | 100% | 0.68359% (1024 rays) | 0% | 0.68359 percentage points |
| Shackleton, Amundsen, Haworth, Shoemaker A, two Faustini cases and Malapert | 100% | 0% in each 256-ray sample | 0% in each tested pixel | 0 in this sample |

Ray convergence is recorded, not presumed: Nobile 1 returns 48.4375%, 49.609375%, 49.21875% with 128/256/1024 rays; Nobile 2 returns 0.78125%, 0.390625%, 0.68359375%. Finite sampling is not an exact reference. The regression gate of 5 percentage points (and 2 points for sampled total obstruction) is an **engineering fixture check**, not a scientifically justified global tolerance. The unresolved Nobile 2 sliver is explicitly visible in this table.

## Precision: what improved and what remains unknown

| Quantity | Before | Now | Meaning of precision |
|---|---|---|---|
| Directions and axes | Already consistent in the audit | Preserved; explicit apparent/airless terminology and guarded upstream metadata | No new absolute angular uncertainty estimate |
| Partial disk at a straight zero plane (Faustini example) | 100% source switch | Analytic model ≈ **0.3771%** exposed area; renderer integrates actual modeled obstructions instead | Analytic model value, **not** irradiance or a terrain-visible fraction |
| Total Earth eclipse | 3.2 direct source intensity | **0** | Correct total occultation for the audited circular-disk case |
| Near terrain shadows | Disabled in polar scenes | **0.125 m/texel** local map; **0.557–7.822 m/texel** crop-wide maps | Graphics sampling scale, not terrain positional accuracy |
| Geometry/observer registration | Up to kilometers of radial discrepancy and moving horizontal camera offsets | Fixed coordinate and shared height; all ten ground-origin residual tests **<2 mm** | Internal numerical consistency, **not millimeter accuracy of the Moon** |
| Curvature over a 10 km projected offset on a controlled sphere | Not applied in the crop | Approximately **28.78 m** drop, verified against the chosen sphere | Exact chosen spherical construction; actual shape/frame uncertainty remains |
| Regional visibility and reference-frame alignment | Assumed or unvalidated | Explicitly **unknown/unvalidated** outside the authorized model | Not resolved by clearer labeling or better shadows |

## Reproduction

From the repository root, Node >=22 for the app; the tool-only import adapter needs Node >=22.15:

```sh
npm run check
npm run build
node tools/lunar-terrain/generate-observers.mjs --check
```

To deliberately regenerate the observer ledger after changing assets:

```sh
node tools/lunar-terrain/generate-observers.mjs
```

Network recorder (opt-in, writes the evidence bundle, 26 serial requests):

```sh
node tools/lunar-terrain/record-lighting-ephemerides.mjs --fetch
```

GPU harness: run `npm run dev -- --host 127.0.0.1 --port 5187` separately. Production UI harness: run the build, then `npm run preview -- --host 127.0.0.1 --port 5188` separately. With `PLAYWRIGHT_MODULE` pointing to an installed Playwright package, and optionally `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an already installed Chromium:

```sh
node tools/lunar-terrain/check-lighting-gpu.mjs
node tools/lunar-terrain/check-lighting-ui.mjs
```

Optional overrides: `LIGHTING_URL`, `LIGHTING_APP_URL`, `LIGHTING_QA_OUT`. Neither browser script requests Horizons. The GPU script is source-module integration QA; the UI script uses the production build. Initial shader compilation is noticeably more expensive than subsequent frames; no cross-device FPS or mobile-performance certification is made.

## Sources

- Original audit: [LUNAR_GEOMETRY_LIGHTING_AUDIT.md](LUNAR_GEOMETRY_LIGHTING_AUDIT.md), including NASA coordinate and product provenance.
- [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html), quantities 4/13/20, apparent airless coordinates, observer definition and metadata.
- [NASA GSFC PGDA product 78](https://pgda.gsfc.nasa.gov/products/78), LOLA products and frame/uncertainty limits.
- Per-asset metadata in `public/terrain/`, including Apollo's LROC equirectangular CRS and source accuracy limits.
- [NVIDIA, Integrating Realistic Soft Shadows Into Your Game Engine](https://developer.download.nvidia.com/whitepapers/2008/PCSS_Integration.pdf), PCSS approximation and receiver-plane depth-gradient bias. The local central-blocker variant here is documented above, not represented as an exact scientific method.

## Explicit remaining work outside D-022

Certified terrain visibility requires regional measured coverage, a convention-matched independent ephemeris/frame calculation, DTM/registration uncertainty propagation and purpose-specific scientific tolerances. Better sampling or a shadow-map screenshot cannot substitute for those steps. Human review is still required before integration. No claim of merge, deployment or scientific certification is made.
