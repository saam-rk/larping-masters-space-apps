# Malapert Crater 1: camera-led terrain delivery

A standalone terrain and scene asset for **CLPS Lunar Mission Browser**. It follows the camera-led design of the [Cabeus Exterior Wall 1](../cabeus-exterior-wall-1/README.md), [Faustini Rim A](../faustini-rim-a/README.md) and [Shoemaker Rim A](../shoemaker-rim-a/README.md) deliveries and reuses their site-agnostic tooling unchanged. The only new input is [`tools/lunar-terrain/malapert-crater-1.config.json`](../../../tools/lunar-terrain/malapert-crater-1.config.json). The build ran in the live Blender session through the Blender MCP, inside a new scene, and the existing live scenes were preserved. It does not change the application scene, the site catalog or the ephemeris calculations. The application now registers this asset in `src/features/scene/terrain/malapertCrater1.ts` and `models.ts`, enabling the shared first-person view for `malapert-crater-1`. The original asset-delivery checks below are historical evidence, not a new app or mobile benchmark.

## Application integration

Selecting Malapert Crater 1 enables first person using `/terrain/malapert-crater-1.glb` and the shared `/terrain/astronaut.glb`, without regenerating or simplifying the delivered mesh. The integration preserves the metadata origin, 20 x 20 km coverage, geographic-north rotation and astronaut support position. It uses the same standing camera and look/zoom controls as Amundsen Rim and Shackleton Rim: eye height 1.60 m, 2.6 m from the upright astronaut, with the initial heading chosen from the displayed celestial bodies. It does not replay the Blender camera, slope-aligned figure or movement policy described below. The whole viewer ring remains within both the full-density geometry and full-detail texture radii.

To validate manually, run `npm run dev`, select Malapert Crater 1 in the additional-site selector, and update a valid date/time. Check terrain and astronaut loading, look/zoom controls, and first-/third-person switching. Changing to a site without terrain should disable first person; returning to Malapert should select first person again. Automated coverage checks metadata agreement, projection/orientation, view selection and the requested GLB URL. Malapert Massif remains a distinct site without this model. Crop-edge skylines and the scientific limitations below still apply.

"Malapert Crater 1" here is the PGDA/Data Book reference point NPD (catalog row 14 of [`docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md`](../../../docs/LUNAR_ADDITIONAL_SITES_RESEARCH.md)). It is distinct from Malapert Massif (R23/Site23) and is not a verified IAU feature or an approved landing site.

## Files

- [`malapert-crater-1.blend`](malapert-crater-1.blend): an editable, self-contained, normalized startup file. It contains the reimported terrain GLB, the shared astronaut, a georeferenced marker, the initial, shifted, overview and boot-inspection cameras, and illustrative lighting.
- [`../../../public/terrain/malapert-crater-1.glb`](../../../public/terrain/malapert-crater-1.glb): terrain only, with one mesh, one material and all three maps embedded.
- [`../../../public/terrain/malapert-crater-1.metadata.json`](../../../public/terrain/malapert-crater-1.metadata.json): the authoritative record of provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and the pending mobile targets.
- `/terrain/astronaut.glb`: the existing shared 1.70 m figure, used unchanged. The builder asserts that it is byte-identical to `docs/research/site-terrain/nobile-rim-2/astronaut.glb`.
- Blender renders: [initial](malapert-crater-1.initial.png), [shifted](malapert-crater-1.shifted.png), [boot contact](malapert-crater-1.boots-side.png), [portrait](malapert-crater-1.mobile.png), [overview](malapert-crater-1.overview.png).
- [Headless Chrome render](malapert-crater-1.browser-mobile.png) with Three.js r187 and a 390 × 844 buffer. **This is not a physical mobile test.**
- Checks: [geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [skyline](skyline-check.json), [browser](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,082,052 bytes / 1.98560 MiB** |
| Budget / headroom | 2,097,152 / **15,100 bytes** |
| Vertices / triangles | **40,400 / 80,241**, uint16 indices |
| Embedded images | normal 2048² JPEG, color 512² JPEG, ORM 256² PNG (305,960 bytes) |
| Separate shared astronaut | 73,896 bytes |
| Draw calls / triangles in the browser, both models visible | 14 / 81,141 |
| Compression / required extensions | none / none |
| Cold load ≤2 s; 60 FPS target, 50 FPS minimum | **Pending on a physical mid-range mobile device** |

These are file sizes, not loading times. They do not establish FPS or network performance.

## Level of detail: near the viewer vs. far away

Resolution is concentrated where the viewer stands. Every height in the mesh is still an original 5 m source sample at 1:1 vertical scale. The far field has fewer vertices, but its heights are not smoothed or flattened.

| Distance from the near-detail center | Vertices | Vertex density |
|---|---:|---:|
| 0–35 m (all 149 source samples within 35 m kept) | 145 in the open ring | ≈37,700 /km² (5 m spacing) |
| 35–150 m (10 m seeds) | 691 | ≈10,300 /km² |
| 150–500 m (20 m seeds) | 1,807 | ≈2,500 /km² |
| 500–1,500 m | 3,428 | 150 m base grid plus residual refinement |
| 1,500 m – crop edge | 34,329 | 150 m base grid plus residual refinement |

Far away, vertices are spent where the surface actually changes. Interpolation residuals rank the candidates, and the ranking is weighted toward the viewer (Gaussian, σ = 550 m) and, more weakly, toward the swell that forms the skyline of the initial view (σ = 300 m). The steep rises at the raster edges win vertices on their own residuals. Material detail follows the same rule as earlier sites. The 50 × 50 m illustrative regolith atlas has full grain to 15 m, fades to neutral by 24 m and uses clamped samplers. Beyond that the material is plain matte gray and only the geometry carries the relief. It is one continuous mesh, with no LOD patches, cracks or popping.

The base grid is 150 m (30 source pixels), not the 100 m used at earlier sites: a 100 m grid over this 20 × 20 km crop would alone need 40,401 vertices, the whole budget. Offline comparisons on 200,000 random source pixels gave an RMS of 1.30 m (125 m base), **1.36 m (150 m, chosen)**, 1.57 m (200 m) and 1.87 m (250 m). The 150 m grid had the lowest error between 500 m and 1,500 m from the viewer (0.81 m), which is the band seen most from the viewpoint.

## Viewpoint and scale figure

- The saved point (−84.8034°, 8.387032° E) is the center pixel of the NPD raster. It lies at about −2,267 m radial elevation on a nearly flat, cratered floor. Its plane-fit slope is ≈3.0° within 25 m, ≈0.4° within 100 m and ≈0.8° within 500 m. The crop spans **≈1,120 m** of relief. The lowest point is ≈−2,463 m in a depression ≈11 km grid-southwest of the site (grid bearing ≈237°), near the raster edge. The highest is ≈−1,337 m at the grid-northeast corner of the raster, ≈14 km away. These are radial elevations relative to the 1,737,400 m reference sphere, not heights above local ground.
- The **near-detail center** is 24 m grid-west-southwest of the saved point, in the gentlest 25 m window found within 45 m (plane-fit slope ≈0.15°). The **astronaut support** is a triangle centroid 3.7 m from it (the shared builder does this to keep both soles off a slope break). The figure is rigidly aligned to its support triangle, so it leans **1.62°** with that triangle. The world-vertical sole-to-helmet height is **1.700 m** (uniform scale 0.99630). The maximum sole gap from the GLB surface is 6.0e-8 m in Blender and 8.1e-9 m in Three.js.
- **Camera**: 1.65 m above the final mesh, **5.04 m** behind the astronaut, 48° vertical FOV, looking toward grid bearing 0°. At this longitude geographic north lies at grid bearing **8.4°**, and the south pole lies at grid bearing 188.4° from the site. The view therefore faces about 8° west of geographic north, toward the lunar nearside. This is a grid statement, not an ephemeris azimuth or a claim about Earth visibility.
- From eye height, the skyline in that direction is a low swell of the floor **79–226 m** away and a few meters above the eye. Its reference crest is ≈120 m grid-north of the near-detail center and ≈6 m above it. All 14 sampled skyline columns of both saved views hit terrain at least **9,800 m** inside the crop boundary ([skyline-check.json](skyline-check.json)).
- The crop is **20 × 20 km**: the complete NPD raster, centered on the saved point. It is larger than at earlier sites. Inside 7 km the floor is almost flat. The large relief in this product rises toward the raster edges, and a smaller crop would have left most of it out.
- **The rises at the edges are not in the initial view, by design.** A planar raster scan in 3° steps from the near-detail center found that, at grid bearings ≈39°–105° (grid-northeast to east) and ≈222°–225° (grid-southwest), the highest line of sight is the raster edge itself: the terrain rises ≈360–920 m and is still rising where the data stop. Facing those directions would show an artificial flat top where the data stop. The initial view faces a direction where the skyline is real terrain, as at Cabeus Exterior Wall 1, and keeps both saved views at least ≈6° away from those sectors. Looking grid-east or grid-southwest in this model, the skyline is the crop edge, and the real skyline is higher. A smaller rise toward the grid-west-northwest edge is also truncated but, from the viewpoint, stays below the near swell.
- Movement policy, as for the previous camera-led sites: move within 2 m, keep 1.65 m clearance and widen to ≥64° vertical FOV in portrait while moving. In the browser, all 102 combinations of position, aspect and zoom keep the full body framed.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [NPD complete surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPD/NPD_final_adj_5mpp_surf.tif). HTTP 200, **64,033,687 bytes**, SHA-256 `c60be0a03f38dea0d250791373d8f13445c5bdbad7c49690e004f238ef309c78`, provider Last-Modified 2021-06-05 19:30:52 UTC. Raster: 4000 × 4000 pixels, 5 m, float32, NaN nodata, 100% finite. The file is not committed.
- Frame **MOON_ME / DE421** comes from the provider README, not from the TIFF's generic datum. CRS: spherical south-polar stereographic, R = 1,737,400 m. Heights are radial elevations above that sphere.
- Saved point → projected **X 23000.004 m, Y 156000.035 m**. The containing pixel (row 1999, column 2000) is −2266.974 m. The bilinear height is −2267.060 m.
- Crop `[minX,minY,maxX,maxY]` = `[13000, 146000, 33000, 166000]` m (the whole raster), with 0 nodata pixels. Local origin: `X0=23000, Y0=156000, h0=−2267` m (the saved point rounded, as at the other sites).
- GLB/Three.js: `(X−23000, h+2267, −(Y−156000))`. Blender: `(X−23000, Y−156000, h+2267)`. Grid north is not geographic north.

| Control (GLB − raster bilinear, m) | Raster | GLB | Δ |
|---|---:|---:|---:|
| Saved point | −2267.060 | −2267.035 | +0.025 |
| Ridge, floor swell grid-north of the viewpoint (−84.79980°, 8.37658° E) | −2261.634 | −2261.634 | ≈0 |
| Holdout grid-west-southwest of the site (−84.85470°, 7.47134° E) | −2263.834 | −2263.554 | +0.280 |
| Astronaut support | −2267.846 | −2267.861 | −0.014 |

On the 625-point holdout grid there were 0 misses: RMS **1.350 m**, 95th percentile **2.705 m** and maximum **4.81 m**. That is coarser than Cabeus Exterior Wall 1 (0.946 m RMS): the crop covers about twice the area with the same vertex budget, and the floor is pocked with small craters that a 150 m base grid cannot fully keep. Within 500 m of the viewer the offline RMS is ≈0.18 m. The maximum vertex-height residual is 0 m. The topology is a single disk with no non-manifold edges and all faces pointing up. These are mesh-approximation differences from the NPD DEM, not absolute lunar accuracy.

## Reproduce

Run from the repository root. Paths are templates. `requirements-shackleton.txt` provides the Python environment.

```sh
SOURCE=/path/to/NPD_final_adj_5mpp_surf.tif
PREPARED=/path/to/malapert-crater-1-prepared
"$PY" tools/lunar-terrain/prepare.py --config tools/lunar-terrain/malapert-crater-1.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"
"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_camera_led.py -- \
  --prepared "$PREPARED" --repo "$REPO" --site malapert-crater-1 --render
"$BLENDER" --background assets/terrain/malapert-crater-1/malapert-crater-1.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/malapert-crater-1/malapert-crater-1.blend --python-exit-code 1 \
  --python tools/lunar-terrain/check_camera_led_scene.py -- --repo "$REPO"
"$PY" tools/lunar-terrain/verify_camera_led.py --repo "$REPO" --source "$SOURCE" --site malapert-crater-1
npm run dev   # then open /tools/lunar-terrain/terrain-review.html?site=malapert-crater-1
```

This delivery ran the build step in the live Blender through the MCP:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_camera_led.py'
ns = {'__name__': 'camera_led_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>', 'malapert-crater-1')
```

The renders came from `render_views`, run on the normalized file in a separate background Blender process that did not resave it (its SHA-256 was unchanged). The browser report and screenshot came from the review page above. A throwaway script outside the repository drove it in headless Chrome over the DevTools protocol. The viewpoint, ridge, holdout, crop and base-grid spacing were chosen with throwaway raster-inspection scripts, also outside the repository: a hillshade, plane-fit slope windows, a grid-bearing skyline scan and an offline mesh-error comparison. Their values are recorded in the config's `featureNotes` and above. The prepared textures were byte-identical to those of the Cabeus delivery. Blender may add numeric suffixes in a busy session, as the camera names here show, so re-run validation instead of expecting byte-identical `.blend` files.

## Checks observed and limits

- Blender **5.2.2 LTS**: GLB export, then reimport with all 40,400 vertices matched one-to-one. A fresh-process normalization and reopen passed: 13 astronaut parts, 1.700 m, 3 packed maps, 4 cameras, full-body framing and 1.65 m clearance.
- `verify_camera_led.py`, which includes `verify.py`, passed against the complete GeoTIFF. This includes the check that every source sample within 35 m of the near-detail center survives.
- Headless Chrome with SwiftShader WebGL and Three.js r187 through the Vite dev server: both GLBs loaded and the maps decoded. The controls were sampled, the boots made contact and all 102 framing cases passed, with no WebGL error. This is **not** a mobile device test.
- No tooling code changed. `tools/lunar-terrain/test_pipeline.py`, ESLint on `tools/lunar-terrain` and the app's Vitest suite (43 files, 518 tests) passed.
- The licensing review for redistributing NASA data in a public build is still pending, as for the other terrains.

The grain and lighting are illustrative. The Blender/QA light comes from grid bearing ≈100° at ≈20° elevation, side-lighting the view. It is not an ephemeris Sun, and at this latitude the real Sun stays much lower. The model is a projected height field with no lunar curvature. The 5 m source spacing is not its effective resolution, because NASA interpolates many pixels. The NPD raster ends ≈10 km from the site, so it omits the upper parts of the edge rises and anything beyond them. Terrain beyond the raster was not checked. Nothing here establishes landing suitability, power, communications or visibility.

**Proposed `ESTADO.md` note** (not edited): "Malapert Crater 1 camera-led terrain is wired into the shared first-person viewer; human visual review and physical mobile load/FPS measurements remain pending."
