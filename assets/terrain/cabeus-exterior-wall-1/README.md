# Cabeus Exterior Wall 1: camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the camera-led design of the [Faustini Rim A](../faustini-rim-a/README.md), [Shoemaker Rim A](../shoemaker-rim-a/README.md) and [Haworth](../haworth/README.md) deliveries and reuses their site-agnostic tooling unchanged. The only new input is [`tools/lunar-terrain/cabeus-exterior-wall-1.config.json`](../../../tools/lunar-terrain/cabeus-exterior-wall-1.config.json). The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. `cabeus-exterior-wall-1` is already a `SiteId` in `shared/sites.ts`, but the viewer does not load this terrain yet. Wiring it into `src/features/scene/terrain/models.ts` is separate interface work.

"Cabeus Exterior Wall 1" here is the PGDA/Data Book reference point NPA (catalog row 11 of [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md)), not a verified IAU feature or an approved landing site.

## Files

- [`cabeus-exterior-wall-1.blend`](cabeus-exterior-wall-1.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/cabeus-exterior-wall-1.glb`](../../../public/terrain/cabeus-exterior-wall-1.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/cabeus-exterior-wall-1.metadata.json`](../../../public/terrain/cabeus-exterior-wall-1.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared 1.70 m figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](cabeus-exterior-wall-1.initial.png), [shifted](cabeus-exterior-wall-1.shifted.png), [boot contact](cabeus-exterior-wall-1.boots-side.png), [portrait](cabeus-exterior-wall-1.mobile.png), [overview](cabeus-exterior-wall-1.overview.png).
- [Headless Chrome render](cabeus-exterior-wall-1.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,081,976 bytes / 1.98553 MiB** |
| Budget / headroom | 2,097,152 / **15,176 bytes** |
| Vertices / triangles | **40,400 / 80,226**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,126 |
| Compression / required extensions | none / none |
| Cold load ≤2 s; 60 FPS target, 50 FPS minimum | **Pending on a physical mid-range mobile device** |

These are file sizes, not loading times. They do not establish FPS or network performance.

## Level of detail: near the viewer vs. far away

Resolution is concentrated where the viewer stands. Every height in the mesh is still an original 5 m source sample at 1:1 vertical scale. The far field has fewer vertices, but its heights are not smoothed or flattened.

| Distance from the near-detail center | Vertices | Vertex density |
|---|---:|---:|
| 0–35 m (all 149 source samples within 35 m kept) | 145 in the open ring | ≈37,700 /km² (5 m spacing) |
| 35–150 m (10 m seeds) | 691 | ≈10,300 /km² |
| 150–500 m (20 m seeds) | 1,786 | ≈2,500 /km² |
| 500–1,500 m | 3,731 | 100 m base grid plus residual refinement |
| 1,500 m – crop edge | 34,047 | 100 m base grid plus residual refinement |

Far away, vertices are spent where the surface actually changes. Interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and toward the grid-south-southeast crest that forms the far skyline (σ = 1.8 km). Material detail follows the same rule. The 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh, with no LOD patches, cracks or popping.

## Viewpoint and scale figure

- The saved point (−86.9243°, −71.5651° E) lies at about −2,229 m radial elevation on a gently sloping, densely cratered plain. Its plane-fit slope is ≈3.3° within 25 m, ≈3.0° within 100 m and ≈1.9° within 500 m. The crop spans **569 m** of relief: from ≈−2,612 m on the floor of a crater roughly 2 km across, ≈7 km grid-southeast of the site (grid bearing ≈123°, inside the initial view but below its skyline) to ≈−2,043 m on the grid-south-southeast crest. These are radial elevations relative to the 1,737,400 m reference sphere, not heights above local ground.
- The **near-detail center** is 43 m grid-northeast of the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈0.2°). The **astronaut support** is a triangle centroid 3.7 m from it (the shared builder does this to keep both soles off a slope break). The figure is rigidly aligned to its support triangle, so it leans **0.66°** with the local surface. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.99842). The maximum sole gap from the GLB surface is 1.2e-7 m in Blender and 5.6e-8 m in Three.js.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing 140°. At this longitude geographic north lies at grid bearing **288.4°**, and the south pole lies at grid bearing 108.4° from the site. The view therefore faces roughly geographic south-southwest (≈212° from geographic north). This is a grid statement, not an ephemeris azimuth.
- In that direction the skyline is a broad rise 5.4–6.6 km away and 50–165 m above the eye. Its reference crest is 6.05 km away (grid bearing 160°) and ≈186 m above the site. All 14 sampled skyline columns of both saved views hit terrain at least **3,095 m** inside the crop boundary ([skyline-check.json](skyline-check.json)).
- The crop is **14 × 14 km**, shifted 2.5 km grid-east and 2.5 km grid-south of the saved point so that this skyline lies well inside it. It is larger than the 12 × 12 km of earlier sites because the view's skyline is farther away; the vertex budget is unchanged, so the far field is somewhat sparser (see the holdout errors below).
- **The "wall" is not in the initial view, by design.** Grid-north and grid-northwest of the site the terrain rises ≈760–870 m within ≈10 km, but it is still rising at the north edge of the NPA raster, so its top is not in the source data. A preliminary planar raster scan from the site found that, at grid bearings ≈306°–30°, the skyline would be the raster edge itself, not real terrain. Facing it would show an artificial flat top where the data stops. The crop keeps only the foot of that rise (to ≈4.5 km grid-north), and the initial view faces the interior ridge instead. This was the user's explicit choice among the documented options. Looking grid-north or grid-northwest in this model, the skyline is the crop edge.
- Movement policy, as for the previous camera-led sites: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [NPA complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPA/NPA_final_adj_5mpp_surf.tif). HTTP 200, **64,033,687 bytes**, SHA-256 `1d13a8befcaefbe168589d525aee05a14aff222068221d93406ce951600d2b32`, provider Last-Modified 2021-05-22 19:30:01 UTC. Raster: 4000 × 4000 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X −88500.728 m, Y 29500.159 m**. The containing pixel (row 1999, column 1999) is −2228.951 m. The bilinear height is −2229.015 m.
- Crop `[minX,minY,maxX,maxY]` = `[−93000, 20000, −79000, 34000]` m, with 0 nodata pixels. Local origin: `X0=−88501, Y0=29500, h0=−2229` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X+88501, h+2229, −(Y−29500))`. Blender: `(X+88501, Y−29500, h+2229)`. Grid north is not geographic north.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | −2229.015 | −2229.010 | +0.005 |
| Ridge, grid-south-southeast crest (−87.04351°, −74.60338° E) | −2042.781 | −2042.781 | ≈0 |
| Holdout grid-west-southwest of the site (−86.85173°, −72.75912° E) | −2181.161 | −2181.350 | −0.190 |
| Astronaut support | −2227.628 | −2227.627 | +0.001 |

On the 625-point holdout grid there were 0 misses: RMS **0.946 m**, 95th percentile **1.978 m** and maximum **3.65 m**. That is coarser than Faustini Rim A (0.544 m RMS): the crop covers 36% more area with the same vertex budget, and the plain is pocked with small craters that a 100 m base grid cannot fully keep. The maximum vertex-height residual is 0 m. The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from the NPA DEM, not absolute lunar accuracy.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/NPA_final_adj_5mpp_surf.tif
PREPARED=/path/to/cabeus-exterior-wall-1-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/cabeus-exterior-wall-1.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site cabeus-exterior-wall-1 --render
"$BLENDER" --background assets/terrain/cabeus-exterior-wall-1/cabeus-exterior-wall-1.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/cabeus-exterior-wall-1/cabeus-exterior-wall-1.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site cabeus-exterior-wall-1
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=cabeus-exterior-wall-1
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'cabeus-exterior-wall-1')
```

The renders came from `render_views`, run on the normalized file in a separate background Blender process that did not resave it (its SHA-256 was unchanged). The browser report and screenshot came from the review page above. A throwaway script outside the repository drove it in headless Chrome over the DevTools protocol. The viewpoint, ridge, holdout and crop were chosen with throwaway raster-inspection scripts, also outside the repository: a hillshade, plane-fit slope windows and a grid-bearing skyline scan. Their values are recorded in the config's `featureNotes`. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,400 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py`, which includes `verify.py`, passed against the complete GeoTIFF. This includes the check that every source sample within 35 m of the near-detail center survives.
- Headless Chrome with SwiftShader WebGL and Three.js r187 through the Vite dev server: both GLBs loaded and the maps decoded. The controls were sampled, the boots made contact and all 102 framing cases passed, with no WebGL error. This is **not** a mobile device test.
- No tooling code changed. `tools/lunar-terrain/test_pipeline.py`, ESLint on `tools/lunar-terrain` and the app's Vitest suite (43 files, 518 tests) passed.
- The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative. The Blender/QA light comes from grid bearing ≈230° at ≈20° elevation, side-lighting the view; it is not an ephemeris Sun, and at this latitude the real Sun stays much lower. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. A 14 × 14 km crop omits distant obstacles, including the upper part of the grid-northern rise. Terrain beyond the NPA raster was not checked. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): "Cabeus Exterior Wall 1 camera-led terrain asset is ready for review; viewer integration and physical mobile load/FPS measurements remain pending."
