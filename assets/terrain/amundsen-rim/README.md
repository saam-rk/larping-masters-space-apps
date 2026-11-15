# Amundsen Rim (DM1): camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the Shackleton Rim delivery's camera-led design ([README](../shackleton-rim/README.md)). The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. `amundsen-rim` is not yet a `SiteId` in `shared/sites.ts`, so the viewer cannot select it until the catalog work proposed in [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md) is done.

## Files

- [`amundsen-rim.blend`](amundsen-rim.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/amundsen-rim.glb`](../../../public/terrain/amundsen-rim.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/amundsen-rim.metadata.json`](../../../public/terrain/amundsen-rim.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](amundsen-rim.initial.png), [shifted](amundsen-rim.shifted.png), [boot contact](amundsen-rim.boots-side.png), [portrait](amundsen-rim.mobile.png), [overview](amundsen-rim.overview.png).
- [Headless Chrome render](amundsen-rim.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,087,224 bytes / 1.99053 MiB** |
| Budget / headroom | 2,097,152 / **9,928 bytes** |
| Vertices / triangles | **40,500 / 80,572**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,472 |
| Compression / required extensions | none / none |
| Cold load ≤2 s; 60 FPS target, 50 FPS minimum | **Pending on a physical mid-range mobile device** |

These are file sizes, not loading times. They do not establish FPS or network performance.

## Level of detail: near the viewer vs. far away

The design concentrates resolution where the viewer stands. Every height in the mesh is still an original 5 m source sample at 1:1 vertical scale.

| Distance from the near-detail center | Vertices | Vertex density |
|---|---:|---:|
| 0–35 m (all 154 source samples kept) | 154 | ≈40,000 /km² (5 m spacing) |
| 35–150 m (10 m seeds) | 669 | ≈10,000 /km² |
| 150–500 m (20 m seeds) | 1,788 | ≈2,500 /km² |
| 500 m – crop edge | 37,889 | 100 m base grid plus residual refinement |

Far away, the vertices are spent where the surface actually changes: interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and the visible crater-rim ridge (σ = 1.8 km). Material detail follows the same rule. The 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that, the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh: there are no LOD patches, cracks or popping.

## Viewpoint and scale figure

- The saved point (-84.2287°, 69.44396° E) lies on a broad, gently undulating crest at about 399 m radial elevation. The Amundsen interior falls away to grid south, and the crop reaches about −845 m.
- The **near-detail center and astronaut** are about 21 m from the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈1°). The rigid alignment tilt is **0.44°**, so the figure is essentially upright, as in the app's upright placement. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.99898). The maximum sole gap from the GLB surface is 6e-8 m.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing ≈286°. The skyline in that direction is the eastern rim of a ≈1 km crater about 2.4–2.6 km away and 270 m higher, with a higher crest to the west-southwest at ≈5 km.
- The crop was **shifted 2.5 km grid-west** of the saved point. With a crop centered on the site, that west-southwest crest fell on the crop boundary and the rectangle edge would have formed the horizon. Now all 14 sampled skyline columns of both saved views hit terrain 0.7–5.4 km away, at least 100 m inside the boundary ([skyline-check.json](skyline-check.json)).
- Movement policy, as for Shackleton: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [DM1 complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM1/DM1_final_adj_5mpp_surf.tif). HTTP 200, **64,033,681 bytes**, SHA-256 `ceb7e786d05ef6a604c80b78be885e641ad7bd2b5c3aac944201a4f2008d8ca4`, provider Last-Modified 2021-04-16 12:36:52 UTC. Raster: 4000 × 4000 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X 164001.125 m, Y 61500.405 m**. The containing pixel (row 1999, column 2000) is 399.660 m. The bilinear height is 399.459 m.
- Crop `[minX,minY,maxX,maxY]` = `[156500, 56500, 166500, 66500]` m, 10 × 10 km, with 0 nodata pixels. Local origin: `X0=164000, Y0=61500, h0=399` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X−164000, h−399, −(Y−61500))`. Blender: `(X−164000, Y−61500, h−399)`. Grid north is not geographic north. At this longitude, geographic north lies at grid bearing **69.44396°**.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | 399.459 | 399.453 | −0.006 |
| Ridge, crater rim (−84.29451°, 68.91307° E) | 669.544 | 669.544 | ≈0 |
| Holdout on the slope toward Amundsen (−84.28418°, 70.20558° E) | 106.184 | 106.290 | +0.106 |
| Astronaut support | 398.416 | 398.422 | +0.006 |

On the 625-point holdout grid there were 0 misses: RMS **0.563 m**, 95th percentile **0.971 m** and maximum **7.43 m** (narrow relief lost to the budget). The maximum vertex-height residual is 0.00006 m (float32). The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from DM1, not absolute lunar accuracy.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/DM1_final_adj_5mpp_surf.tif
PREPARED=/path/to/amundsen-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/amundsen-rim.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site amundsen-rim --render
"$BLENDER" --background assets/terrain/amundsen-rim/amundsen-rim.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/amundsen-rim/amundsen-rim.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site amundsen-rim
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=amundsen-rim
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'amundsen-rim')
```

The renders were produced in a separate background Blender process with `render_views` from the same file. `build_camera_led.py`, `check_camera_led_scene.py`, `verify_camera_led.py` and `check_camera_led_web.mjs` are site-agnostic versions of the Shackleton scripts. Those scripts were left unchanged so that their delivered hashes stay reproducible. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,500 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py` (which includes `verify.py`) passed against the complete GeoTIFF. Ruff passed on the new Python files and ESLint passed on the new `.mjs`.
- Headless Chrome 157 with SwiftShader WebGL and Three.js r187: both GLBs loaded, the maps decoded, the controls were sampled, the boots made contact and all 102 framing cases passed with no WebGL error. This is **not** a mobile device test.
- The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative and the light is not an ephemeris Sun. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. A 10 km crop omits distant obstacles and most of the Amundsen crater. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): “Amundsen Rim (DM1) camera-led terrain asset is ready for review; catalog entry, viewer integration and physical mobile load/FPS measurements remain pending.”
