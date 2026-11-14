# Shackleton Rim — camera-led terrain delivery

An isolated terrain/scene asset for **CLPS Lunar Mission Browser**, built through the Blender MCP in a new scene. It does not replace the application scene or change ephemeris calculations. The previous live Blender scene and existing Nobile assets were preserved. Branch: `feat/shackleton-rim-terrain`. Publication is authorized by the integrator; deployment and merge remain outside this asset-delivery task.

## Files

- [`shackleton-rim.blend`](shackleton-rim.blend): editable, self-contained, normalized startup file. Contains the **reimported terrain GLB**, the imported original astronaut, georeferenced marker, initial/shifted/overview/boot-inspection cameras and illustrative lighting.
- [`../../../public/terrain/shackleton-rim.glb`](../../../public/terrain/shackleton-rim.glb): terrain only, one mesh/material, all three maps embedded.
- [`../../../public/terrain/shackleton-rim.metadata.json`](../../../public/terrain/shackleton-rim.metadata.json): authoritative provenance, CRS, axes, coverage, local origin, camera and astronaut transforms, hashes and pending mobile targets.
- [`../../../public/terrain/astronaut.glb`](../../../public/terrain/astronaut.glb): **byte-identical copy** of `docs/research/site-terrain/nobile-rim-2/astronaut.glb`; not regenerated or embedded in the terrain download.
- [Initial view](shackleton-rim.initial.png), [shifted view](shackleton-rim.shifted.png), [boot contact from the side](shackleton-rim.boots-side.png), [portrait framing](shackleton-rim.mobile.png), [overview](shackleton-rim.overview.png).
- [Desktop browser screenshot](shackleton-rim.browser-desktop.png): independent Three.js WebGL rendering with a 390 × 844 drawing buffer. **Not a physical mobile-device test.**
- [Geometry/source validation](validation.json), [Blender round trip](blender-roundtrip.json), [fresh-process scene check](scene-check.json), [browser checks](browser-check.json), [source HTTP receipt](source-receipt.json), [NASA README](source-README.txt).

## Observed budgets

| Item | Result |
|---|---:|
| Terrain GLB, including all textures | **2,087,228 bytes / 1.99054 MiB** |
| Terrain budget / headroom | 2,097,152 / **9,924 bytes** |
| Exported terrain vertices / triangles | **40,500 / 80,571** |
| Embedded images | 305,960 bytes; no external textures |
| Separate astronaut | **73,896 bytes**, 900 triangles |
| Both models | **2,161,124 bytes** |
| Metadata | 24,193 bytes |
| Initial asset response bodies including metadata | **2,185,317 bytes** |
| Browser draw calls / triangles, both models visible | 14 / 81,471 |
| Geometry compression / required extensions | None / none |
| Cold load ≤2 s; target 60 FPS, minimum 50 FPS | **Pending on a physical mid-range mobile device** |

Download totals exclude HTTP headers, application JS/CSS, and optional offline QA images. They are file-size measurements, not mobile loading-time measurements. No FPS or network claim is inferred from them.

## Camera and close-detail choices

The initial camera is **1.65 m vertically above the final triangle surface**, about **5.04 m horizontally** from the astronaut. A 48° vertical field of view keeps the whole body visible in both landscape and portrait, with foreground ground and the local sloping rim/wall silhouette behind it. The saved geographic point is about 39 m from the astronaut support. This saved point is on sloping ground near the rim, not a flat landing pad or the crest itself.

The close-material atlas spans **50 × 50 m** around projected `[-1003.5, -7038.5] m`. Full grain extends to radius 15 m, fading with cubic smoothstep to neutral at 24 m. The **2048² tangent-space normal map** has a nominal 2.44 cm texel footprint; this is **illustrative shading**, not measured terrain resolution. Color is 512², packed metallic/roughness is 256². There is no displacement, procedural-only shader, geographic image, scattered rock geometry, or artificial flattening.

The mesh retains **all 154 source pixel centers within radius 35 m** as a geometric guard region covering the view/movement area. It seeds 10 m spacing out to 150 m and 20 m out to 500 m, with a 100 m background seed grid. A smooth distance-weighted residual priority and ridge-weighted refinement spend remaining vertices on slope changes. The final surface is one continuous indexed Delaunay mesh, not concentric disconnected LOD patches. Remote geometry still follows source heights; remote material approaches a constant matte gray because all atlas samplers clamp to a neutral border.

The final improvement doubled normal-map resolution before reducing the background vertex target from 42,000 to 40,500 to remain within budget. There are no material-boundary draw calls, UV seams inside the atlas, or dynamic LOD popping. The initial and displaced captures were visually inspected: no abrupt material ring or mesh crack was seen in those views. This is bounded visual evidence, not a guarantee for arbitrary unrestricted travel.

An exploratory camera exposed the rectangular crop edge at the right-hand skyline. The final camera was rotated toward the retained relief. A [14-column ray check of both saved views](skyline-check.json) now finds the sampled silhouettes on terrain 80–213 m away, never within 100 m of the crop boundary. This intentionally favors the **near wall/crest profile** rather than pretending the complete crater or far rim is visible. The overview retains the broader rim and inner-wall forms.

### Movement/zoom policy

Move within a **2 m projected-XY radius**, raycasting the **final mesh** to keep 1.65 m vertical camera clearance; keep looking at the recorded target. At portrait aspect `<0.6`, when displacement is `>1 m`, widen vertical FOV to **at least 64°**. The initial FOV remains 48°; tested zoom values are 48°, 56° and 64°, with that portrait clamp applied.

Exploratory 48° and 56° portrait movement policies clipped the astronaut on close approach. The final 64° movement policy corrects those cases: **102 numerical combinations of position, aspect and zoom pass full-body framing**. The initial portrait image was also rendered and visually inspected with the real installed Three.js loader and WebGL. The harness does not integrate camera controls into `SkyScene.tsx`.

### Astronaut support

The original pose, hierarchy and four materials remain unchanged. The entire instance is rigidly aligned to a final near-field triangle normal (**22.929° tilt**), placed at that triangle's centroid so both rigid soles remain inside the same plane, then **uniformly** scaled by `1.0087783229`.

Height is explicitly defined as **world-vertical lowest sole to highest helmet = 1.7000000 m** after rotation. The distance along the model's own body axis is 1.714923 m; these are different measurements on a slope. No nonuniform scaling, limb adjustment or terrain alteration is used. All sampled sole corners agree with the GLB surface to less than 0.000001 m numerically, and the lateral render confirms contact. These numerical residuals are not scientific terrain accuracy or evidence of safe footing.

To reconstruct in Three.js, load the terrain at identity, load `/terrain/astronaut.glb` separately and apply `astronaut.matrixGlbColumnMajor` to the **loaded scene wrapper** (once). Initialize the perspective camera with `initialCamera.positionGlbM`, `targetGlbM`, `upGlb`, `verticalFovDeg`, `nearM` and `farM`. Do not apply Blender Z-up coordinates directly in Three.js.

## Source and georeferencing

- Source: NASA GSFC PGDA [product 78](https://pgda.gsfc.nasa.gov/products/78), [complete Site04 surface GeoTIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif). Downloaded successfully: HTTP 200, **40,980,806 bytes**, SHA-256 `38ff70dbdf2f066c2cfa94a646c3a59d653ce7f6b4528b15fc1b43ee397ce758`. Provider last-modified: 2020-06-05 18:40:02 UTC. The complete-file checksum is not comparable to historical small byte-window hashes.
- Frame: **MOON_ME / DE421**, from the provider README, not inferred from the TIFF's generic datum label. No frame conversion was performed.
- CRS: south polar stereographic, latitude origin −90°, central meridian 0°, scale 1, zero false offsets, spherical radius **1,737,400 m**. Pixel-registered 5 m grid, float32, NaN nodata, scale 1, offset 0.
- `shackleton-rim`: planetocentric latitude −89.7668°, east-positive longitude −171.87° = 188.13° E. PROJ returns **X −1000.036606 m, Y −7000.345565 m**, with valid source support.
- Crop outer bounds `[minX,minY,maxX,maxY]`: `[-6000,-12000,4000,-2000] m`; **10 × 10 km**, 2000² source pixels, **100% finite**. No polar-mosaic blending was needed. Surface support ends at the outer pixel centers, 2.5 m inside those bounds. The union of triangles is authoritative.
- Local origin: projected `X=-1000 m`, `Y=-7000 m`, radial elevation `h=770 m`.
- Blender: `(X+1000, Y+7000, h-770)` m. GLB/Three.js: `(X+1000, h-770, -(Y+7000))` m. Vertical scale **1:1**.
- Inverse GLB transform: `X=glbX-1000`, `Y=-glbZ-7000`, `h=glbY+770`.
- This is a **projected height field**, not lunar body-fixed Cartesian or true local ENU. Lunar curvature is not embedded. Projection-grid axes are not geographic east/north at this longitude; do not attach ephemeris azimuths directly.

Raster height is radial elevation above the reference sphere. Missing pixels are never filled with zero: the shared generator rejects any triangle whose source-pixel bounding box touches nodata. This crop has none, and the validator checks all exported triangles against the original raster mask.

### Height comparisons, meters

The GLB column is a float64 barycentric vertical intersection of **actual exported indexed triangles**, restored to the radial datum. The raster comparison is float64 bilinear interpolation over the four surrounding original 5 m pixel centers. Differences reflect interpolation/mesh approximation, **not an absolute physical-error estimate**.

| Control | Raster bilinear | GLB | GLB − raster |
|---|---:|---:|---:|
| Saved geographic point | 769.676264 | 769.719087 | +0.042823 |
| Near astronaut, projected −1003.5 / −7038.5 m | 769.176309 | 769.143311 | −0.032998 |
| Exact sole support, projected −1004.166667 / −7039.166668 m | 769.397366 | 769.305705 | −0.091661 |
| Ridge control, projected −2600 / −7000 m | 1667.200928 | 1667.212463 | +0.011536 |

The **containing pixel** at the saved point (row 1600, column 1599, zero-based) is **771.043213 m**, matching the approximately 771.04 m research value. It is deliberately reported separately from the bilinear value.

All 40,500 exported vertices remain at source pixel centers. Maximum source-to-export vertex-height residual: **0.000122 m** (float32 encoding). The independent 625-point interior grid has **0 missing hits**, RMS difference **0.753369 m**, 95th-percentile absolute difference **1.501636 m**, maximum sampled absolute difference **3.019496 m**. This does not bound all unsampled terrain or the original LOLA uncertainty. Topology: one disk, Euler characteristic 1, no non-manifold edges, all faces upward, 99,900,025 m² projected support.

## Reproduce

Use the existing geospatial pipeline plus the dedicated camera/material builder. Requirements are isolated from npm and installed outside the repository. Commands below are templates; provide absolute executable/source paths appropriate to the machine.

```sh
python -m venv /path/to/terrain-venv
PY=/path/to/terrain-venv/bin/python
# Windows: PY=/path/to/terrain-venv/Scripts/python.exe
"$PY" -m pip install -r tools/lunar-terrain/requirements-shackleton.txt
BLENDER=/path/to/blender
SOURCE=/path/to/Site04_final_adj_5mpp_surf.tif
PREPARED=/path/to/shackleton-prepared
REPO=/absolute/path/to/NASA_space_apps_challenge_team

curl --fail --location --output "$SOURCE" \
  https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif
# Verify the complete source SHA-256 recorded above.
"$PY" tools/lunar-terrain/prepare.py \
  --config tools/lunar-terrain/shackleton-rim.config.json \
  --source "$SOURCE" --output "$PREPARED"
"$PY" tools/lunar-terrain/shackleton_textures.py --output "$PREPARED"

"$BLENDER" --background --factory-startup --python-exit-code 1 \
  --python tools/lunar-terrain/build_shackleton.py -- \
  --prepared "$PREPARED" --repo "$REPO" --render

"$BLENDER" --background assets/terrain/shackleton-rim/shackleton-rim.blend \
  --python-exit-code 1 --python tools/lunar-terrain/check_shackleton_scene.py -- \
  --repo "$REPO" --normalize
"$BLENDER" --background assets/terrain/shackleton-rim/shackleton-rim.blend \
  --python-exit-code 1 --python tools/lunar-terrain/check_shackleton_scene.py -- \
  --repo "$REPO"
"$BLENDER" --background assets/terrain/shackleton-rim/shackleton-rim.blend \
  --python-exit-code 1 --python tools/lunar-terrain/check_shackleton_skyline.py -- \
  --output assets/terrain/shackleton-rim/skyline-check.json
"$PY" tools/lunar-terrain/verify_shackleton.py --repo "$REPO" --source "$SOURCE"
"$PY" tools/lunar-terrain/test_pipeline.py
npm run check
npm run build

# Real browser decoder/material/framing review, separate from the product UI:
npm run dev -- --host 127.0.0.1 --port 5179 --strictPort
# Open http://localhost:5179/tools/lunar-terrain/shackleton-review.html
# Inspect window.shackletonReview.report; save it as browser-check.json.
```

The builder overwrites this delivery's output paths; use an isolated copy for experiments. The shared `prepare.py` and `verify.py` retain the no-texture/default behavior for Nobile and accept optional near-detail seeding and textured validation for this task. No old terrain assets are rewritten.

For MCP construction, execute the following in Blender after preparation, using actual paths:

```python
from pathlib import Path
script = '<repo>/tools/lunar-terrain/build_shackleton.py'
ns = {'__name__': 'shackleton_builder'}
exec(compile(Path(script).read_text(encoding='utf-8'), script, 'exec'), ns)
scene = ns['build']('<prepared>', '<repo>')
ns['render_views'](scene, '<repo>/assets/terrain/shackleton-rim')
```

Rendering all five views exceeded the MCP response timeout in this session, but Blender finished and all five PNGs were read/inspected. CLI rendering avoids that transport timeout. The live scene is saved via an isolated datablock library, then normalized in a **separate background process**; the live user's original file is not overwritten. Blender may add numeric name suffixes in an occupied session, so binary hashes and names may differ on regeneration. Re-run validation rather than assuming byte-identical .blend output. External JSON is authoritative for final hashes, especially after normalization.

## Checks observed and remaining review

- Blender **5.2.2 LTS**: real GLB reimport; 40,500 bijectively matched vertices, maximum position residual 0; UVs, three images and a normal-map node retained. Final scene uses that reimport.
- Independent GeoTIFF/GLB comparison, all vertex/mask/topology assertions, texture decode/neutral-border checks, and near-field sample preservation: passed (`validation.json`).
- Separate process normalization, then a second fresh reopen of the final `.blend`: passed, including packed maps, four cameras, original 13-part astronaut, units and full-body initial framing.
- Installed **Three.js r187**, desktop Chromium/Electron: both actual GLBs loaded; JPEG/PNG decode, core PBR maps, clamp sampling, support/height checks, 102 camera cases and WebGL render passed. Physical mobile tests remain pending.
- `test_pipeline.py`: 5 tests passed. `npm run check`: typecheck, lint and **180 tests across 18 files passed**. `npm run build`: passed (existing large-chunk warning).
- Active LSP probes reported no blocking diagnostics. The final eight-file sweep confirmed four clean files and left four inconclusive (three timeouts and one silent-on-clean server), so this is **not** a complete clean LSP verdict. Heuristic warnings about numeric `int`/`float` conversions remain (numeric raster/mesh values, not textual user input). Blender imports execute in Blender, not the app interpreter. Ruff `E4,E7,E9,F,I,UP,C408`: passed. The legacy untextured Nobile GLB and new textured GLB both pass the shared reader regression.
- Human visual/scientific review is still required; the integrator controls commits, PR and merge. Licensing/release gates from project decisions remain in force.

Limits: source 5 m spacing is not 5 m effective resolution; NASA describes extensive interpolation. Count/uncertainty layers were not used. Fine grain and lighting are illustrative. This bounded crop is not the complete crater; it preserves part of the rim and inner wall. No claim of landing suitability, energy, radio-link availability, physical visibility, or lunar horizon accuracy is made.

### Proposed project-status update (not a new product decision)

`ESTADO.md` could record: “Shackleton Rim camera-led terrain asset and standalone viewer validation are ready for human review; integration into the main scene and physical mobile cold-load/FPS measurements remain pending.” No existing `DECISIONES.md` agreement is superseded by this asset delivery.
