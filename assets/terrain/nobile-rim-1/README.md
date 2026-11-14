# Nobile Rim 1 — georeferenced terrain delivery

Generated and checked on **2026-11-14**, on branch `feat/nobile-rim-1-model`. This is a visualization asset and a coordinate-placement helper, **not a terrain visibility/energy/communications/landing model**. No application UI, ephemeris behavior, dependency manifest, historical research raster or project decision was changed. No commit, push, PR publication or merge was performed.

## Deliverables

| Artifact | Repository path |
|---|---|
| Editable scene | `assets/terrain/nobile-rim-1/nobile-rim-1.blend` |
| Terrain-only GLB | `public/terrain/nobile-rim-1.glb` |
| Separate, positioned astronaut GLB | `public/terrain/nobile-rim-1.astronaut.glb` |
| Georeferencing/provenance metadata | `public/terrain/nobile-rim-1.metadata.json` |
| Reproducible parameterized pipeline | `tools/lunar-terrain/` — [instructions](../../../tools/lunar-terrain/README.md) |
| Manual/saved-coordinate helper | `tools/lunar-terrain/marker.mjs` |
| Numeric GLB/GeoTIFF validation | [validation.json](validation.json) |
| Blender GLB reimport | [blender-roundtrip.json](blender-roundtrip.json) |
| Saved editable-file reopening | [scene-check.json](scene-check.json) |
| Installed Three.js loader/raycast checks | [three-loader-check.json](three-loader-check.json) |
| Acquisition evidence | [source-receipt.json](source-receipt.json), [NASA README](source-README.txt) |

The GLB and sidecar are copied unchanged to `dist/terrain/` by the observed Vite build. Browser URL after starting the normal app: `/terrain/nobile-rim-1.glb`. The current app viewer has **not** been modified to load it automatically. The helper and integration example accept coordinates, not site IDs, so they support both the saved site and any manual coordinate with a triangle intersection.

The `.blend` contains one terrain mesh, a surface-point marker, a ridge reference, an overview camera, a camera 2 m above the mesh oriented toward the ridge, a neutral rough material and an explicitly illustrative raking Sun light. Markers are editable viewport empties (not exported or rendered physical structures). The default camera is `Overview`. Ground-camera direction and height were checked from the saved file. The original live Blender scene was preserved. The isolated scene was normalized in a separate Blender process and reopened without the initial library-file warning.

## Human scale reference

At the user's request, the supplied
`docs/research/site-terrain/nobile-rim-2/astronaut.blend` was appended as
`Astronaut_scale_reference`, retaining its 13 mesh parts, materials and **1.70 m**
world-space height. No scaling was applied to the figure or the terrain.
It stands **9 m forward and 3 m left** of the ground camera in projected XY,
facing the camera and leaving the central ridge sightline clear. Its root is at
Blender `(-3.274157, 8.911024, 47.110107)` m; the full figure fits inside the
unchanged ground camera. The default saved camera remains `Overview`; select
`Ground | 2 m above mesh toward ridge` to inspect the reference at human height.

The terrain-only GLB is byte-identical to the original delivery. A separate
**57,364-byte** `nobile-rim-1.astronaut.glb` preserves the existing terrain-only
loader contract and size budget. Load both GLBs at their default transforms:
the astronaut already carries its placement in the terrain's coordinate system.
**Do not add its recorded position a second time.** `scaleReference` in the
metadata records its hash, source, placement and matching ground-camera
position/direction, vertical FOV and reference aspect ratio (1.4). Different
viewer camera framing/aspect ratios require integration checks.

The rigid flat boots are raised minimally to avoid penetrating the sloped mesh;
checked sole-corner clearances range from approximately 0 to **0.136 m**. This is
illustrative contact on simplified terrain, not a spacesuit/ground-contact
simulation or sub-meter terrain validation. The supplied source file is
unchanged. During the PR #13 follow-up, the integrator explicitly confirmed
creating the astronaut in another session with AI assistance. It is recorded as
an original team asset on that basis, not as an unidentified third-party model.
No separate asset license or legal certification is inferred from that statement;
the project's public-release license selection remains pending.

Observed after the addition: fresh-process `.blend` reopening, 1.70 m height,
unit scale, full camera framing and sole-corner checks passed. Material-preview
inspection through the ground camera was performed. Installed Three.js loaded
the separate astronaut GLB and checked height, transforms, every vertex's
camera framing and unobstructed body-part centers. See `scene-check.json` and
`three-loader-check.json`. Browser integration/mobile testing remain pending.

Reproduce in Blender with this terrain scene active, then run the existing
background normalization/reopening commands in the pipeline instructions:

```python
import runpy
ns = runpy.run_path('<repo>/tools/lunar-terrain/add_astronaut.py', run_name='astronaut_placement')
ns['add_astronaut']('<repo>')
```

The script reuses the existing collection on repeat runs (no duplicate figure),
exports only the astronaut to its separate GLB and writes only the active
terrain scene to the editable file. Other live scenes are preserved. External
metadata contains final file hashes; the embedded terrain-generation metadata
remains historical.

## Observed budget and integrity

| Measurement | Observed | Requested |
|---|---:|---:|
| GLB bytes | **1,798,344** (1.715 MiB) | ≤2,097,152 |
| Remaining byte allowance | 298,808 | — |
| Exported vertices | **50,000** | 40,000–60,000 |
| Exported triangles | **99,533** | 80,000–120,000 |
| Mesh primitives / materials | 1 / 1 | Terrain only |
| Vertex attributes | POSITION + NORMAL | No unused attributes |
| Index component type | uint16 | No decoder required |
| Compression / images / UVs | None / none / none | Compression only if verified |
| GLB reimport vertex-position residual | **0 m** | Check scale, axes and position |
| Fresh Blender file opening | Passed | Editable scene |

No size/count budget deviation. Smooth normals avoid flat-shaded vertex duplication. The terrain has 465 expected open boundary edges, no edges with more than two incident faces, Euler characteristic 1 and upward winding. All 50,000 vertices map exactly to source pixel centers and preserve their source heights (maximum residual **0 m** at vertices). No disconnected loose vertices or nodata-bridging triangles were found by the checks.

Final GLB SHA-256: `a6f4587fa3d6059c5a40578cd10753d8388174169073311253aaadf0a8913c0c`.
The sidecar records final `.blend` bytes/hash separately. Its size is not subject to the 2 MiB web-terrain limit.

## Source and crop

- Official [NASA GSFC LRO/LOLA Site06](https://pgda.gsfc.nasa.gov/products/78), [numeric elevation GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif).
- Citation requested by the provider: Barker et al. (2021), *Improved LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their Impact on Illumination Conditions*, *Planetary and Space Science* 203, 105119, [DOI](https://doi.org/10.1016/j.pss.2020.105119).
- Downloaded full file: **64,025,603 bytes**, 4,000 × 4,000 float32 samples. SHA-256 `cca17e8067601dd659b583f889204db6bce685bc30c60a9e62427a8bce36b03d`. HTTP Last-Modified: 2021-02-12 13:33:34 GMT. No explicit version in TIFF; retain the checksum.
- The named repository `docs/research/polar-terrain-validation/Site06-surf.tif` was only a **5 × 5 re-encoded window**. It was retained unchanged and all 25 samples were matched exactly against the complete official source. A 10 km model cannot be derived from that tiny window alone.
- Rasterio read **5 × 5 m** spacing, affine `(5, 0, 74000, 0, -5, 120000)`, scale 1, offset 0 and **NaN nodata**. The source and selected crop contain no missing elevation cells.
- The TIFF's generic Moon sphere CRS establishes south-polar stereographic geometry and a **1,737,400 m** sphere. NASA's retained README separately establishes **MOON_ME / DE421**, projected meters, height meters and pixel-center registration. The frame is not inferred from the generic datum name.
- Radial elevation is relative to that sphere, not Earth sea level. Interpretation follows the team's `docs/LUNAR_SOUTH_POLE_RESEARCH.md` and its cited LOLA elevation definition. No gravity/geoid datum conversion is performed.

The site projects to **X=84,000.0100258 m, Y=110,000.0107917 m**; the ridge projects to **X=83,881.0975663 m, Y=113,744.1237488 m**.

The chosen 10 × 10 km crop is centered at **(83,940, 111,870) m**, approximately the midpoint of the two controls. It gives approximately 3.1 km of north/south margin beyond both features:

| Coverage definition | X bounds (m) | Y bounds (m) |
|---|---|---|
| Source-pixel outer edges | 78,940 … 88,940 | 106,870 … 116,870 |
| Supported mesh / outer pixel centers | **78,942.5 … 88,937.5** | **106,872.5 … 116,867.5** |

Window: column 988, row 626, width/height 2,000 pixels. **4,000,000 / 4,000,000 valid pixels (100%)**. Mesh projected area **99,900,025 m²**, 100% of the pixel-center rectangle. The 2.5 m strip between outer centers and raster pixel edges is deliberately unsupported, not extrapolated. For other crops, nodata triangles are omitted conservatively and can create holes; the union of exported triangles is the authoritative validity footprint.

## Height comparisons

Raster method: double-precision bilinear interpolation of the four surrounding **5 m pixel centers**. GLB method: double-precision vertical/barycentric intersection with the **actual exported position/index buffers**, adding back the origin height. Difference is **GLB minus GeoTIFF**, not an accuracy estimate against the physical Moon.

| Coordinate | Latitude (°) | East longitude (°) | GeoTIFF (m) | GLB surface (m) | Difference (m) |
|---|---:|---:|---:|---:|---:|
| Saved Nobile Rim 1 | -85.4381 | 37.36667 | 5,946.899466 | 5,946.894584 | **-0.004881** |
| Nearby ridge | -85.34185 | 36.40708 | 6,384.412976 | 6,384.386112 | **-0.026864** |
| Independent manual control | -85.47 | 38.0 | 5,830.303608 | 5,830.279721 | **-0.023887** |

The saved-site bilinear result reproduces the team's approximately **5,946.90 m**. The older approximately 5,946.13 m containing-cell value uses a different sampling method and is not a disagreement.

Site/ridge source support pixels are protected during refinement; those two comparisons are intentionally favorable and must not be presented as global accuracy. The third control was not protected. A separate **625-point interior grid** has no missed surface intersections; RMS difference **0.459803 m**, 95th-percentile absolute difference **0.908772 m**, maximum sampled absolute difference **2.346335 m**. This is sampled approximation error, not an exhaustive worst-case bound. Installed Three.js r187 raycasting reproduces all three GLB control heights to better than `1e-5 m` and accepts 100 additional interior manual coordinates.

## Coordinate contract and scientific limits

Origin: projected **(84,000, 110,000) m**, radial height **5,900 m**. Scale: one unit per meter, vertical scale **1:1**.

```text
Blender: (X - 84000, Y - 110000, h - 5900)
GLB:     (X - 84000, h - 5900, -(Y - 110000))
```

The helper projects latitude/longitude and intersects the GLB triangles to recover `h`. It checks validity and does not substitute zero for missing terrain. Input coordinates must use the stated frame; no MOON_PA/IAU_MOON conversion is provided.

**This is a projected height field, not a curved body-fixed surface or a true local east/north/up frame.** Grid directions are not geographic east/north at longitude 37°E. Do not directly align the app's azimuth vectors to these grid axes, treat mesh height as an observer-altitude validation, or use the planar scene for physical terrain-horizon calculations. A 10 km crop also omits potentially relevant distant obstacles. The light is illustrative, not the Sun at a selected UTC.

NASA describes extensive interpolation (~90%) in these 5 m products. Valid pixels are not necessarily direct laser observations; the 5 m spacing is not effective resolution. This model did not ingest count/error maps and does not certify local scientific accuracy, landing safety, power, communications or disk visibility. Dataset attribution is retained; project license selection remains with the integrator. Astronaut authorship was confirmed by the integrator during the PR #13 follow-up (see above).

## Validation and pending performance

Observed checks:

- Rasterio/PROJ metadata, source-window match and coordinate checks; a separate preparation rerun produced exactly identical vertex and face arrays.
- Blender MCP construction, export and real GLB reimport: passed; editable-file normalization and fresh-process reopening: passed.
- Blender MCP visual inspection of overview and ground cameras: performed in solid shading. No photometric validation claimed.
- Independent GLB buffer/GeoTIFF checks and 625-point holdout: passed.
- Five Python synthetic tests: passed (bilinear centers, missing data, outside support, nodata hidden inside a triangle, triangle interpolation).
- Nine Three.js decoder/placement checks: passed, including invalid inputs, synthetic unsupported terrain and rejection of transformed assets.
- Ruff `E4,E7,E9,F,I,UP,C408`: passed for the new Python tools. Pyright with the explicit geospatial interpreter: zero errors/warnings for preparation, verification and synthetic tests. Blender-only imports were exercised in Blender, not the app interpreter.
- Active pi-lens batch: no errors reported; two files were inconclusive, so this is not claimed as complete LSP coverage. Import-only dispositions document the isolated interpreter. Historical research-script import findings are unrelated and were not fixed by editing historical evidence.
- `npm run check`: passed (types, lint, **178 tests / 18 files**).
- `npm run build`: passed; existing large-JavaScript-chunk warning remains. Verified that the built GLB is byte-identical to the source asset.

**Mobile cold load ≤2 s, target 60 FPS and minimum 50 FPS: PENDING.** No physical mobile device/network session was available. No device, browser or network is fabricated; the metadata records null values. Node loader checks and Blender import durations are not substitutes for mobile measurements. End-to-end selection-to-interactive timing also needs the terrain to be wired into the viewer.

Suggested test: record device/OS/browser, network throughput/latency, pixel ratio and app commit; clear browser caches; measure from selecting the site to the first visible frame that accepts controls; then record frame-time samples during a fixed 30 s orbit plus zoom sequence. Repeat at least three cold runs and report latency plus FPS distribution/minimum with browser/device conditions. Do not change a pending result into a pass based on file size alone.

## PR #13 correction validation

The follow-up regression in `tools/lunar-terrain/test_blender_pipeline.py` passed
with Blender 5.2.2 LTS: two terrain generations in one process, suffixed legacy
names, role-based renamed objects/collections, repeated astronaut placement,
preservation of the first scene, normalization and fresh reopening. The generated
GLB also passed `verify.py` against the source GeoTIFF and `check_web.mjs` through
the installed Three.js loader, including the suffixed astronaut root (whose name
Three.js sanitizes). The original delivered GLBs and `.blend` were not rewritten.
The normal delivery's web-loader check and five Python tests also passed. These
checks do not change the pending browser/mobile integration or scientific limits.

## Handoff / proposed project follow-up

Request **Diego's review** of source/frame/height/limitations and the **integrator/Andrés's review** of axis handling, marker placement and mobile validation before integration. `GIT_WORKFLOW.md` was not present in this checkout; repository AGENTS instructions were followed, with no commit/push/merge.

Proposed `ESTADO.md` entry: “Nobile Rim 1 terrain asset available in a task branch; georeferencing, GLB budgets and numerical/loader checks observed; application integration, mobile performance and human scientific review pending.” The existing status file is stale relative to the current application, so unrelated status cleanup was not performed.

Proposed `DECISIONES.md` scope clarification: “The user authorized generation of an editable Nobile Rim 1 terrain scene and a budgeted web asset with manual-coordinate support. This does not by itself authorize terrain-based visibility/energy/communications claims or replace the app's existing scientific model.” No new scientific agreement or mobile-performance acceptance has been invented.
