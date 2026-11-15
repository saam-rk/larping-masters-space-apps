# Shoemaker Rim A: camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the camera-led design of the [Shackleton Rim](../shackleton-rim/README.md), [Amundsen Rim](../amundsen-rim/README.md) and [Haworth](../haworth/README.md) deliveries and reuses their site-agnostic tooling unchanged; only a new config, [`tools/lunar-terrain/shoemaker-rim-a.config.json`](../../../tools/lunar-terrain/shoemaker-rim-a.config.json), was added. The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. `shoemaker-rim-a` is already a `SiteId` in `shared/sites.ts`, but the viewer does not load this terrain yet; wiring it in is separate interface work.

"Shoemaker Rim A" here is the PGDA/Data Book reference point LM2 (catalog row 4 of [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md)), not a verified IAU feature or an approved landing site.

## Files

- [`shoemaker-rim-a.blend`](shoemaker-rim-a.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/shoemaker-rim-a.glb`](../../../public/terrain/shoemaker-rim-a.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/shoemaker-rim-a.metadata.json`](../../../public/terrain/shoemaker-rim-a.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared 1.70 m figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](shoemaker-rim-a.initial.png), [shifted](shoemaker-rim-a.shifted.png), [boot contact](shoemaker-rim-a.boots-side.png), [portrait](shoemaker-rim-a.mobile.png), [overview](shoemaker-rim-a.overview.png).
- [Headless Chrome render](shoemaker-rim-a.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,082,392 bytes / 1.98592 MiB** |
| Budget / headroom | 2,097,152 / **14,760 bytes** |
| Vertices / triangles | **40,400 / 80,299**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,199 |
| Compression / required extensions | none / none |
| Cold load ≤2 s; 60 FPS target, 50 FPS minimum | **Pending on a physical mid-range mobile device** |

These are file sizes, not loading times. They do not establish FPS or network performance.

## Level of detail: near the viewer vs. far away

Resolution is concentrated where the viewer stands. Every height in the mesh is still an original 5 m source sample at 1:1 vertical scale; the far field is sparser, not smoothed or flattened.

| Distance from the near-detail center | Vertices | Vertex density |
|---|---:|---:|
| 0–35 m (all 149 source samples within 35 m kept) | 145 in the open ring | ≈37,700 /km² (5 m spacing) |
| 35–150 m (10 m seeds) | 691 | ≈10,300 /km² |
| 150–500 m (20 m seeds) | 1,786 | ≈2,500 /km² |
| 500–1,500 m | 4,316 | 100 m base grid plus residual refinement |
| 1,500 m – crop edge | 33,462 | 100 m base grid plus residual refinement |

Far away, vertices are spent where the surface actually changes: interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and toward the grid-southwest crest that forms the far skyline (σ = 1.8 km). Material detail follows the same rule: the 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh, with no LOD patches, cracks or popping.

## Viewpoint and scale figure

- The saved point (-88.0792°, +11.88866° E) lies at about −620 m radial elevation on a slope of ≈6–7° that rises grid-southeast (plane fit within 100 m: 6.5°). The crop spans **3,599 m** of relief: from ≈−3,763 m in a lowland grid-northwest of the site to ≈−164 m grid-southeast. Negative values are radial elevations below the 1,737,400 m reference sphere, not depths below local ground.
- The **near-detail center** is 42 m and the **astronaut support** 43 m grid-north of the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈4.7°). No flatter window exists that close to the point; the gentlest one within 80 m is ≈2.8°, 80 m away. The figure is rigidly aligned to its support triangle, so it leans **5.05°** with the local surface. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.98791). The maximum sole gap from the GLB surface is 2.4e-7 m.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing ≈216°. At this longitude geographic north lies at grid bearing **11.889°**, and the south pole at grid bearing ≈191.9° from the site, so the view faces roughly toward the pole (≈204° from geographic north). This is a grid statement, not an ephemeris azimuth.
- In that direction the skyline is real terrain at two depths: a rise 3.1–3.6 km away and ≈200 m above the viewpoint, and behind it the reference crest 6.1–6.8 km away and up to ≈340 m above it. The left and right edges of the view are closed by the local slope 55–150 m away.
- The crop is **12 × 12 km**, shifted 2 km grid-west and 2 km grid-south of the saved point so that both crests lie inside it. All 14 sampled skyline columns of both saved views hit terrain 55 m–6.8 km away and at least **2,329 m** inside the boundary ([skyline-check.json](skyline-check.json)). A preliminary 24-bearing raster scan from the viewpoint found every skyline point ≥2.6 km inside the crop, so looking around in place should not expose the crop edge. That scan is not an exhaustive horizon guarantee.
- The crop deliberately omits a low rise ≈11.6–12 km grid-southwest, close to the LM2 raster edge, which cannot be included with a safe margin. A planar raster scan places it at most ≈0.5° above the modeled skyline at grid bearings 232–236°, near the right edge of the initial view.
- Movement policy, as for the previous camera-led sites: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [LM2 complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM2/LM2_final_adj_5mpp_surf.tif). HTTP 200, **64,033,675 bytes**, SHA-256 `2ae42c1da672a1273754bf04e4598695b75a7833a6948b7d2893e2dd58152716`, provider Last-Modified 2021-04-16 22:36:40 UTC. Raster: 4000 × 4000 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X 12000.225 m, Y 57001.060 m**. The containing pixel (row 1999, column 2000) is −619.633 m. The bilinear height is −619.534 m.
- Crop `[minX,minY,maxX,maxY]` = `[4000, 49000, 16000, 61000]` m, with 0 nodata pixels. Local origin: `X0=12000, Y0=57001, h0=−620` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X−12000, h+620, −(Y−57001))`. Blender: `(X−12000, Y−57001, h+620)`. Grid north is not geographic north.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | −619.534 | −619.541 | −0.006 |
| Ridge, grid-southwest crest (−88.26422°, +8.66734° E) | −276.478 | −276.478 | ≈0 |
| Holdout grid-east-southeast of the site (−88.08101°, +14.71315° E) | −748.326 | −748.848 | −0.523 |
| Astronaut support | −623.634 | −623.661 | −0.027 |

On the 625-point holdout grid there were 0 misses: RMS **0.599 m**, 95th percentile **1.284 m** and maximum **2.19 m** (narrow relief lost to the budget). The maximum vertex-height residual is 1.5e-5 m (float32). The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from the LM2 DEM, not absolute lunar accuracy.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/LM2_final_adj_5mpp_surf.tif
PREPARED=/path/to/shoemaker-rim-a-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/shoemaker-rim-a.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site shoemaker-rim-a --render
"$BLENDER" --background assets/terrain/shoemaker-rim-a/shoemaker-rim-a.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/shoemaker-rim-a/shoemaker-rim-a.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site shoemaker-rim-a
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=shoemaker-rim-a
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'shoemaker-rim-a')
```

The renders were produced in a separate background Blender process with `render_views` from the normalized file, which was not resaved (its SHA-256 was unchanged). The browser report and screenshot came from the review page above, driven in headless Chrome over the DevTools protocol by a throwaway script outside the repository. Viewpoint, ridge and holdout were chosen with throwaway raster-inspection scripts kept outside the repository (hillshade, plane-fit slope windows and a grid-bearing skyline scan); the resulting values are recorded in the config's `featureNotes`. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,400 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py` (which includes `verify.py`) passed against the complete GeoTIFF, including the check that every source sample within 35 m of the near-detail center survives.
- Headless Chrome 157 with SwiftShader WebGL and Three.js r187 through the Vite dev server: both GLBs loaded, the maps decoded, the controls were sampled, the boots made contact and all 102 framing cases passed with no WebGL error. This is **not** a mobile device test.
- No new code was added, so no new lint run applies. The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative and the light is not an ephemeris Sun. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. A 12 × 12 km crop omits distant obstacles and includes neither Shoemaker crater nor its interior. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): “Shoemaker Rim A camera-led terrain asset is ready for review; viewer integration and physical mobile load/FPS measurements remain pending.”
