# Haworth: camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the camera-led design of the [Shackleton Rim](../shackleton-rim/README.md) and [Amundsen Rim](../amundsen-rim/README.md) deliveries and reuses their site-agnostic tooling unchanged; only a new config, [`tools/lunar-terrain/haworth.config.json`](../../../tools/lunar-terrain/haworth.config.json), was added. The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. `haworth` is not yet a `SiteId` in `shared/sites.ts`, so the viewer cannot select it until the catalog work proposed in [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md) is done.

"Haworth" here is the PGDA/Data Book reference point (catalog row 2), not a verified IAU crater center.

## Files

- [`haworth.blend`](haworth.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/haworth.glb`](../../../public/terrain/haworth.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/haworth.metadata.json`](../../../public/terrain/haworth.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared 1.70 m figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](haworth.initial.png), [shifted](haworth.shifted.png), [boot contact](haworth.boots-side.png), [portrait](haworth.mobile.png), [overview](haworth.overview.png).
- [Headless Chrome render](haworth.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,082,048 bytes / 1.98560 MiB** |
| Budget / headroom | 2,097,152 / **15,104 bytes** |
| Vertices / triangles | **40,400 / 80,245**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,145 |
| Compression / required extensions | none / none |
| Cold load ≤2 s; 60 FPS target, 50 FPS minimum | **Pending on a physical mid-range mobile device** |

These are file sizes, not loading times. They do not establish FPS or network performance.

## Level of detail: near the viewer vs. far away

Resolution is concentrated where the viewer stands. Every height in the mesh is still an original 5 m source sample at 1:1 vertical scale; the far field is sparser, not smoothed or flattened.

| Distance from the near-detail center | Vertices | Vertex density |
|---|---:|---:|
| 0–35 m (all 149 source samples within 35 m kept) | 145 in the open ring | ≈37,700 /km² (5 m spacing) |
| 35–150 m (10 m seeds) | 664 | ≈9,900 /km² |
| 150–500 m (20 m seeds) | 1,786 | ≈2,500 /km² |
| 500–1,500 m | 3,505 | 100 m base grid plus residual refinement |
| 1,500 m – crop edge | 34,300 | 100 m base grid plus residual refinement |

Far away, vertices are spent where the surface actually changes: interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and toward the massif crest that forms the skyline (σ = 1.8 km). Material detail follows the same rule: the 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh, with no LOD patches, cracks or popping.

## Viewpoint and scale figure

- The saved point (-86.7639°, -22.777° E) lies on a broad surface at about 1,629 m radial elevation that descends gently grid-east (≈4° mean slope within 100 m). A massif rises grid-northwest of the site to 2,842 m inside the crop; the crop's lowest source sample is ≈833 m.
- The **near-detail center** is 24 m and the **astronaut support** about 26 m grid-east-northeast of the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈2.2°). The rigid alignment tilt is **1.94°**, so the figure is essentially upright. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.99419). The maximum sole gap from the GLB surface is 2.4e-7 m.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing ≈346°. At this longitude geographic north lies at grid bearing **337.223°**, so the view faces roughly geographic north; this is a grid statement, not an ephemeris azimuth. The skyline in that direction is the north flank of the massif, 9.3–11.3 km away and up to ≈1,040 m higher than the viewpoint.
- The crop is **12 × 14 km**, larger than the 10 km crops of earlier sites, and shifted grid-north/west so that the massif skyline is real terrain rather than the crop edge. All 14 sampled skyline columns of both saved views hit terrain 62 m–11.3 km away and at least **1,031 m** inside the boundary ([skyline-check.json](skyline-check.json)). A preliminary 24-bearing raster scan from the viewpoint also found every skyline point ≥990 m inside the crop, so looking around in place should not expose the crop edge. That scan is not an exhaustive horizon guarantee.
- The left columns of the saved views hit a local rise 62–70 m away; the massif fills the center and right.
- Movement policy, as for Shackleton and Amundsen: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [Haworth complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Haworth/Haworth_final_adj_5mpp_surf.tif). HTTP 200, **142,123,767 bytes**, SHA-256 `387fd6e99bca266f4982f7256c4c185921105313882b4c2eee5b5ff1ef75016b`, provider Last-Modified 2020-11-25 00:39:20 UTC. Raster: 5960 × 5960 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X −38000.456 m, Y 90501.190 m**. The containing pixel (row 2979, column 2979) is 1628.816 m. The bilinear height is 1628.547 m.
- Crop `[minX,minY,maxX,maxY]` = `[-45500, 88500, -33500, 102500]` m, with 0 nodata pixels. Local origin: `X0=-38000, Y0=90501, h0=1629` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X+38000, h−1629, −(Y−90501))`. Blender: `(X+38000, Y−90501, h−1629)`. Grid north is not geographic north.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | 1628.547 | 1628.557 | +0.009 |
| Ridge, massif north flank (−86.42971°, −22.59941° E) | 2710.346 | 2710.346 | ≈0 |
| Holdout grid-east of the site (−86.82153°, −21.42603° E) | 1796.402 | 1795.776 | −0.626 |
| Astronaut support | 1626.727 | 1626.721 | −0.006 |

On the 625-point holdout grid there were 0 misses: RMS **0.730 m**, 95th percentile **1.560 m** and maximum **3.39 m** (narrow relief lost to the budget). The larger crop spreads the same vertex budget over 68% more area than at Amundsen, so the far-field holdout RMS is higher (0.730 m vs 0.563 m) while the maximum is lower. The maximum vertex-height residual is 0 m. The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from the Haworth DEM, not absolute lunar accuracy.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/Haworth_final_adj_5mpp_surf.tif
PREPARED=/path/to/haworth-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/haworth.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site haworth --render
"$BLENDER" --background assets/terrain/haworth/haworth.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/haworth/haworth.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site haworth
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=haworth
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'haworth')
```

The renders were produced in a separate background Blender process with `render_views` from the normalized file, which was not resaved. Viewpoint, ridge and holdout were chosen with throwaway raster-inspection scripts kept outside the repository (hillshade, plane-fit slope windows and a grid-bearing skyline scan); the resulting values are recorded in the config's `featureNotes`. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,400 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py` (which includes `verify.py`) passed against the complete GeoTIFF, including the check that every source sample within 35 m of the near-detail center survives.
- Headless Chrome 157 with SwiftShader WebGL and Three.js r187 through the Vite dev server: both GLBs loaded, the maps decoded, the controls were sampled, the boots made contact and all 102 framing cases passed with no WebGL error. This is **not** a mobile device test.
- No new code was added, so no new lint run applies. The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative and the light is not an ephemeris Sun. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. A 12 × 14 km crop omits distant obstacles. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): “Haworth camera-led terrain asset is ready for review; catalog entry, viewer integration and physical mobile load/FPS measurements remain pending.”
