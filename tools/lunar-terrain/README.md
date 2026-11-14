# Budgeted LOLA terrain asset pipeline

This pipeline prepares numeric samples outside Blender, builds/exports through Blender, and independently verifies the exported GLB. It does **not** change the application scene or ephemeris calculation. [Delivered Nobile Rim 1 model and results](../../assets/terrain/nobile-rim-1/README.md).

The coordinate convention matches the existing `docs/research/site-terrain/` research tooling: projected X/Y, radial elevation, local origin, Blender Z-up and GLB Y-up. This bounded generator preserves the user's live Blender scenes and uses deterministic, ridge-weighted residual refinement plus conservative nodata rejection. It does not replace or modify the Nobile Rim 2 pipeline.

## Requirements

- Python 3.11+, in a separate virtual environment; install `requirements.txt`.
- Blender 5.2.x (tested: 5.2.2 LTS; bundled glTF exporter 5.2.40). Export conventions were checked against the [official glTF manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html) and the installed operator properties.
- The app's existing Node/Three.js installation for `check_web.mjs`; no new npm dependencies.
- The complete official numeric GeoTIFF, **not** the historical 5 × 5 sample window.

`requirements.txt` pins direct geospatial dependencies. GDAL, PROJ and all observed tool versions are recorded in the metadata. Ruff/Pyright are optional check tools, not runtime dependencies. Do not run the validation scripts with Python `-O`, which disables assertions.

## Reproduce from the repository root

Set `PY`, `BLENDER`, `SOURCE` and `PREPARED` for your machine. Keep the large source and intermediate NPZ outside the repository. In Git Bash, a Windows path with spaces must be quoted. The commands below are shell templates, not literal environment paths:

```sh
python -m venv /path/to/terrain-venv
PY=/path/to/terrain-venv/bin/python
# Windows: PY=/path/to/terrain-venv/Scripts/python.exe
"$PY" -m pip install -r tools/lunar-terrain/requirements.txt
BLENDER=/path/to/blender
SOURCE=/path/to/source/Site06_final_adj_5mpp_surf.tif
PREPARED=/path/to/prepared-nobile-rim-1

curl --fail --location --output "$SOURCE" \
  https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif
# Expected SHA-256: cca17e8067601dd659b583f889204db6bce685bc30c60a9e62427a8bce36b03d

"$PY" tools/lunar-terrain/prepare.py \
  --config tools/lunar-terrain/nobile-rim-1.config.json \
  --source "$SOURCE" --output "$PREPARED" \
  --reference-window docs/research/polar-terrain-validation/Site06-surf.tif

"$BLENDER" --background --factory-startup \
  --python tools/lunar-terrain/build_blender.py -- \
  --prepared "$PREPARED" --web-output public/terrain \
  --editable-output assets/terrain/nobile-rim-1

# Convert the isolated scene library into an ordinary editable startup file.
# Run this only in a separate background process, never in the user's live session.
"$BLENDER" --background assets/terrain/nobile-rim-1/nobile-rim-1.blend \
  --python tools/lunar-terrain/check_blend.py -- \
  --report assets/terrain/nobile-rim-1/scene-check.json \
  --metadata public/terrain/nobile-rim-1.metadata.json --normalize

# Reopen the final normalized file and check it again (without --normalize).
"$BLENDER" --background assets/terrain/nobile-rim-1/nobile-rim-1.blend \
  --python tools/lunar-terrain/check_blend.py -- \
  --report assets/terrain/nobile-rim-1/scene-check.json \
  --metadata public/terrain/nobile-rim-1.metadata.json

"$PY" tools/lunar-terrain/verify.py \
  --glb public/terrain/nobile-rim-1.glb \
  --metadata public/terrain/nobile-rim-1.metadata.json \
  --source "$SOURCE" --report assets/terrain/nobile-rim-1/validation.json
"$PY" tools/lunar-terrain/test_pipeline.py
node tools/lunar-terrain/check_web.mjs
```

The source checksum and exact match with the retained 25 historical samples were verified for this delivery. Future source changes need review rather than silently treating a new download as this version. The HTTP receipt is retained with the deliverable; the 64 MB source is not committed.

### Use the Blender MCP

Preparation still runs outside Blender. This delivery used the MCP to execute the following equivalent build invocation, followed by the independent normalization/reopen checks above:

```python
from pathlib import Path
script = "<repo>/tools/lunar-terrain/build_blender.py"
namespace = {"__name__": "terrain_builder"}
exec(compile(Path(script).read_text(encoding="utf-8"), script, "exec"), namespace)
namespace["build"]("<prepared>", "<repo>/public/terrain", "<repo>/assets/terrain/nobile-rim-1")
```

The builder creates a new scene, exports **selected objects in the active scene only**, reimports the GLB to check it, and writes only the generated scene/dependencies to the `.blend`. Existing live scenes are preserved. Repeated builds create additional scenes, not destructive resets. Blender may append name suffixes in a populated session: geometry is deterministic under the recorded versions, but names, timestamps and `.blend` bytes need not be byte-identical between sessions. Verify numerical buffers, counts and the new artifact hashes after each build.

The embedded Blender text contains generation metadata. The external JSON is authoritative for final artifact hashes because a file cannot embed its own hash, and the `.blend` is subsequently normalized.

## Adapt to another zone

Copy the config, then change `id`, official source URLs, `site`, `ridge`, `third`, `cropCenterProjectedM`, `cropSizeM` and `originProjectedM`. `third` is a holdout; site/ridge have their four local support pixels protected. All three must lie on valid bilinear support within the crop. Use a separate prepared/output directory. Omit `--reference-window` unless you have a corresponding historical window for that source.

The source guards intentionally accept only the documented single-band, north-up **5 m**, NaN-nodata, unscaled, spherical south-polar stereographic products on the specified radius. No Earth CRS, different grid spacing, different vertical datum or different lunar frame is silently converted. Verify each new source's frame and vertical semantics separately.

Parameters control the vertex target (<65,535), base/candidate pixel strides, refinement batch size, ridge weighting and GLB byte ceiling. Start around 50,000 vertices. The initial 100 m grid is refined at actual 5 m source centers selected from a 20 m candidate lattice; largest current interpolation errors get priority, with a Gaussian weight around the ridge. This retains slope breaks rather than decimating by geographic position alone. All exported heights remain original raster samples; no vertical exaggeration or smoothing is applied to positions. Smooth vertex **normals** affect shading only.

For nodata, omit any triangle whose pixel bounding rectangle includes missing samples. This is deliberately conservative and can enlarge gaps; exported triangles, not a bounding rectangle, define valid support. The current Site06 crop is fully valid. The delivery-specific `verify.py`, `check_blend.py` and `check_web.mjs` include expectations for this complete rectangular crop and its counts. Review those expectations for a new topology rather than weakening a failing check without evidence.

## Place saved or manual coordinates in the web viewer

Vite serves the GLB at `/terrain/nobile-rim-1.glb` and the metadata at `/terrain/nobile-rim-1.metadata.json`. The `.blend` stays outside `public/`. The current `SkyScene.tsx` is a small no-terrain horizon scene: this task **does not wire the model into it** or reinterpret its ephemeris directions.

Use the existing `GLTFLoader`/Drei loader and the provided `marker.mjs` helper. For example, in application code, import the helper from its repository path:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createTerrainSampler } from '<relative-path>/tools/lunar-terrain/marker.mjs';

const terrain = await new GLTFLoader().loadAsync('/terrain/nobile-rim-1.glb');
const response = await fetch('/terrain/nobile-rim-1.metadata.json');
if (!response.ok) throw new Error('Terrain metadata request failed');
const metadata = await response.json();
const sample = createTerrainSampler(terrain.scene, metadata);

// Same path for a predefined site or any manually entered coordinate.
const placement = sample(latitudeDeg, longitudeEastDeg, 2); // 2 m above mesh
if (placement) {
  marker.position.copy(placement.position);
} else {
  // Show a translated unsupported-terrain state, not a synthetic zero height.
}
```

Sample in untransformed asset coordinates. If the viewer needs a different placement, transform terrain and marker together afterwards. Do not scale this kilometer-scale mesh to the current scene's 10-unit sky sphere without an explicit shared scene transform. Frame the bounds with appropriate camera near/far clipping. Raycast on coordinate changes, **not every animation frame**.

The helper validates inputs, projects with the documented lunar sphere, checks bounds, then raycasts the actual triangles. It rejects missing support. No test depends on a saved-site ID. `check_web.mjs` loads the real GLB using the installed Three.js, verifies three controls and 100 additional manual points, and tests a synthetic gap, invalid coordinates, outside coverage and incorrect scene transforms. This is decoder/geometry evidence, not a browser render or FPS measurement.
