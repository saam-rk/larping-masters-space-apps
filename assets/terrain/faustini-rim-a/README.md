# Faustini Rim A: camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the camera-led design of the [Shackleton Rim](../shackleton-rim/README.md), [Amundsen Rim](../amundsen-rim/README.md) and [Haworth](../haworth/README.md) deliveries and reuses their site-agnostic tooling. It adds a new config, [`tools/lunar-terrain/faustini-rim-a.config.json`](../../../tools/lunar-terrain/faustini-rim-a.config.json), plus one optional, backwards-compatible config key for the illustrative light (see [Tooling change](#tooling-change)). The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. `faustini-rim-a` is already a `SiteId` in `shared/sites.ts`, but the viewer does not load this terrain yet. Wiring it in is separate interface work.

"Faustini Rim A" here is the PGDA/Data Book reference point LM7 (catalog row 9 of [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md)), not a verified IAU feature or an approved landing site.

## Files

- [`faustini-rim-a.blend`](faustini-rim-a.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/faustini-rim-a.glb`](../../../public/terrain/faustini-rim-a.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/faustini-rim-a.metadata.json`](../../../public/terrain/faustini-rim-a.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared 1.70 m figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](faustini-rim-a.initial.png), [shifted](faustini-rim-a.shifted.png), [boot contact](faustini-rim-a.boots-side.png), [portrait](faustini-rim-a.mobile.png), [overview](faustini-rim-a.overview.png).
- [Headless Chrome render](faustini-rim-a.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,082,340 bytes / 1.98587 MiB** |
| Budget / headroom | 2,097,152 / **14,812 bytes** |
| Vertices / triangles | **40,400 / 80,290**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,190 |
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
| 500–1,500 m | 4,255 | 100 m base grid plus residual refinement |
| 1,500 m – crop edge | 33,523 | 100 m base grid plus residual refinement |

Far away, vertices are spent where the surface actually changes. Interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and toward the grid-south-southeast crest that forms the far skyline (σ = 1.8 km). Material detail follows the same rule. The 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh, with no LOD patches, cracks or popping.

## Viewpoint and scale figure

- The saved point (−87.8897°, +90° E) lies at about +47 m radial elevation on the rim region grid-southwest of Faustini crater. Its slope is ≈5° (plane fit within 25 m; ≈4° within 100 m and 500 m) and rises grid-southeast. Terrain falls grid-north and grid-northeast into Faustini. The crop spans **1,992 m** of relief: from ≈−1,412 m on the descending crater wall grid-northeast of the site to ≈+579 m on the highland grid-southeast. These are radial elevations relative to the 1,737,400 m reference sphere, not heights above local ground.
- The **near-detail center** is 40 m grid-south-southwest of the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈2.5°). The **astronaut support** is a triangle centroid 3.6 m from it (the shared builder does this to keep both soles off a slope break). The figure is rigidly aligned to its support triangle, so it leans **2.03°** with the local surface. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.99494). The maximum sole gap from the GLB surface is 3.0e-8 m in Blender and 6.8e-9 m in Three.js.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing ≈161°. At this longitude geographic north lies at grid bearing **90°**, and the south pole lies at grid bearing 270° from the site. The view therefore faces roughly geographic east-northeast (≈71° from geographic north). This is a grid statement, not an ephemeris azimuth.
- In that direction the skyline is a real highland 3.4–6.1 km away and 270–375 m above the eye. Its reference crest is 4.4 km away and ≈412 m above the viewpoint. The left edge of the view is closed by a local rise 215–340 m away and the right edge by a slope ≈1.9 km away.
- The crop is **12 × 12 km**, shifted 1 km grid-east and 2 km grid-south of the saved point so that the highland skyline lies inside it. All 14 sampled skyline columns of both saved views hit terrain 214 m–6.1 km away and at least **3,168 m** inside the boundary ([skyline-check.json](skyline-check.json)). A preliminary 24-bearing planar raster scan from the viewpoint found every skyline point ≥1.6 km inside the crop (the closest at grid bearing 345°, where the terrain falls away below eye level). Looking around in place should therefore not expose the crop edge as a skyline. That scan is not an exhaustive horizon guarantee.
- Looking grid-north or grid-northeast (into Faustini), the skyline is the local rim break 400–600 m away, below eye level, with no distant terrain behind it: neither the Faustini floor nor its far rim is in the crop or in the LM7 raster. Terrain beyond the LM7 raster was not checked, so a higher feature more than ~10 km away could rise above the modeled skyline.
- Movement policy, as for the previous camera-led sites: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [LM7 complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM7/LM7_final_adj_5mpp_surf.tif). HTTP 200, **64,033,675 bytes**, SHA-256 `00930f9d110d5477b6d38349eb544ec35d0bb802035113a0894479c317d29023`, provider Last-Modified 2021-05-01 09:40:36 UTC. Raster: 4000 × 4000 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X 63998.601 m, Y 0.000 m**. The containing pixel (row 1999, column 1999) is 46.345 m. The bilinear height is 46.580 m.
- Crop `[minX,minY,maxX,maxY]` = `[59000, −8000, 71000, 4000]` m, with 0 nodata pixels. Local origin: `X0=63999, Y0=0, h0=47` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X−63999, h−47, −Y)`. Blender: `(X−63999, Y, h−47)`. Grid north is not geographic north.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | 46.580 | 46.567 | −0.012 |
| Ridge, grid-south-southeast crest (−87.82572°, +93.48433° E) | 460.091 | 460.091 | ≈0 |
| Holdout grid-west-northwest of the site (−87.98332°, +89.11119° E) | −167.543 | −167.062 | +0.481 |
| Astronaut support | 46.701 | 46.696 | −0.006 |

On the 625-point holdout grid there were 0 misses: RMS **0.544 m**, 95th percentile **1.097 m** and maximum **2.13 m** (narrow relief lost to the budget). The maximum vertex-height residual is 6.1e-5 m (float32). The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from the LM7 DEM, not absolute lunar accuracy.

## Tooling change

Facing grid-south-southeast, the shared builder's fixed illustrative light (from grid bearing ≈140° at ≈40° elevation) would have backlit both the astronaut and the skyline. `build_camera_led.py` now reads an optional `nearDetail.illustrativeLightTravelDirection` (Blender axes), and `check_camera_led_web.mjs` uses the same direction for its QA render. When the key is absent, both use the previous values. The web check still computes `(10, 13, 12)`, so earlier sites are unaffected. This site uses `[0.906, 0.423, −0.364]`: light from grid bearing ≈245° at ≈20° elevation, which side-lights the view from the right. This light affects only the Blender scene and QA renders. The application lights terrain with its own ephemeris Sun, and this light is not an ephemeris Sun.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/LM7_final_adj_5mpp_surf.tif
PREPARED=/path/to/faustini-rim-a-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/faustini-rim-a.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site faustini-rim-a --render
"$BLENDER" --background assets/terrain/faustini-rim-a/faustini-rim-a.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/faustini-rim-a/faustini-rim-a.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site faustini-rim-a
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=faustini-rim-a
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'faustini-rim-a')
```

The renders came from `render_views`, run on the normalized file in a separate background Blender process that did not resave it (its SHA-256 was unchanged). The browser report and screenshot came from the review page above. A throwaway script outside the repository drove it in headless Chrome over the DevTools protocol. The viewpoint, ridge and holdout were chosen with throwaway raster-inspection scripts, also outside the repository: a hillshade, plane-fit slope windows and a grid-bearing skyline scan. Their values are recorded in the config's `featureNotes`. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,400 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py`, which includes `verify.py`, passed against the complete GeoTIFF. This includes the check that every source sample within 35 m of the near-detail center survives.
- Headless Chrome with SwiftShader WebGL and Three.js r187 through the Vite dev server: both GLBs loaded and the maps decoded. The controls were sampled, the boots made contact and all 102 framing cases passed, with no WebGL error. This is **not** a mobile device test.
- Ruff on `build_camera_led.py`, ESLint on `check_camera_led_web.mjs` and `tools/lunar-terrain/test_pipeline.py` passed. The default-light path of the other sites was not rebuilt. Its values are unchanged by construction.
- The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. A 12 × 12 km crop omits distant obstacles and includes neither the Faustini floor nor its far rim. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): “Faustini Rim A camera-led terrain asset is ready for review; viewer integration and physical mobile load/FPS measurements remain pending.”
