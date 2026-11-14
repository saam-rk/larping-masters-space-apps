# Site terrain meshes from LOLA GeoTIFFs

Builds a georeferenced terrain mesh around a lunar site from a polar-stereographic elevation GeoTIFF, saves an editable Blender scene and exports a terrain-only GLB for the web viewer. This is research tooling, not application code. The output is a **visualization of LOLA-derived topography**. Lighting in the `.blend` is illustrative. Nothing here establishes power, communications, visibility or landing suitability.

First output: `nobile-rim-1/` (NASA PGDA product 78, Site06, 5 m/pixel).

## Files

| File | Role |
|---|---|
| `sites/<site>.json` | Parameters: site coordinates, source metadata, crop half-size, mesh step, reference/check points, camera target. Copy it for another site or GeoTIFF. |
| `prepare_grid.py` | Step 1, outside Blender. Inspects the GeoTIFF (CRS, transform, nodata), projects the site, crops and samples the vertex grid, and analyses simplification error. Writes `<site>.grid.npz` and `<site>.prep.json`. |
| `blender_build_scene.py` | Step 2, inside Blender (MCP or headless). Builds the mesh, markers, cameras, material and lights. Exports the terrain-only GLB and saves the `.blend`. **Deletes all objects in the open file first.** |
| `blender_reimport_check.py` | Step 3, headless Blender. Re-imports the GLB into a fresh scene and checks scale, orientation, position and ray-cast heights. |
| `verify_and_write_metadata.py` | Step 4, outside Blender. Parses the GLB independently, compares it with the GeoTIFF, and writes `<site>.verification.json` and `<site>.metadata.json`. |
| `terrain_common.py` | Shared bilinear and triangle-mesh interpolation. |

Outputs in `<site>/`: `.blend`, `.glb`, `.metadata.json` (deliverable metadata), `.verification.json`, `.prep.json`, `.grid.npz`, `.blender-build.json`, `.reimport.json`.

## Reproduce

Use a separate Python 3.11+ environment with `requirements.txt` (same versions as `../polar-terrain-validation`). Do not add these dependencies to the app. Download the source GeoTIFF to a directory **outside** the repository, then check its SHA-256 against `source.sha256` in the metadata:

```sh
curl -o /path/to/source/Site06_final_adj_5mpp_surf.tif \
  https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif
```

Run these commands from this directory. `PY` is the research interpreter and `BLENDER` is Blender 5.2 or later:

```sh
$PY prepare_grid.py --config sites/nobile-rim-1.json \
    --raster /path/to/source/Site06_final_adj_5mpp_surf.tif --out-dir nobile-rim-1

$BLENDER --background --factory-startup --python blender_build_scene.py -- \
    --prep nobile-rim-1/nobile-rim-1.prep.json --grid nobile-rim-1/nobile-rim-1.grid.npz \
    --out-blend nobile-rim-1/nobile-rim-1.blend --out-glb nobile-rim-1/nobile-rim-1.glb

$BLENDER --background --factory-startup --python blender_reimport_check.py -- \
    --prep nobile-rim-1/nobile-rim-1.prep.json --glb nobile-rim-1/nobile-rim-1.glb \
    --out nobile-rim-1/nobile-rim-1.reimport.json

$PY verify_and_write_metadata.py --prep nobile-rim-1/nobile-rim-1.prep.json \
    --grid nobile-rim-1/nobile-rim-1.grid.npz --glb nobile-rim-1/nobile-rim-1.glb \
    --raster /path/to/source/Site06_final_adj_5mpp_surf.tif \
    --reimport nobile-rim-1/nobile-rim-1.reimport.json \
    --build nobile-rim-1/nobile-rim-1.blender-build.json --blend nobile-rim-1/nobile-rim-1.blend
```

In this session, step 2 ran in the live Blender through the Blender MCP:

```python
import runpy
ns = runpy.run_path(r"<this dir>/blender_build_scene.py", run_name="site_terrain")
ns["build"](prep_json=..., grid_npz=..., out_blend=..., out_glb=...)
```

### Another site or GeoTIFF

Copy `sites/nobile-rim-1.json` and change `siteId`, the coordinates, `raster` metadata, `referencePoints` and `checkPoints`. `prepare_grid.py` accepts any single-band, north-up GeoTIFF whose CRS is spherical south-polar stereographic (`proj=stere`, `lat_0=-90`, zero false offsets). It stops if the site is on missing data, the crop leaves the raster, or a configured point lies outside the mesh. The crop must divide evenly by `stepPixels`, because the half-size is rounded up to a whole number of steps. A north-polar or ellipsoidal source needs a code change.

## Coordinate contract (summary; see metadata)

- Projected X/Y: south-polar stereographic on a 1,737,400 m sphere, in the MOON_ME/DE421 frame stated by the provider README.
- Local origin: the site's projected X/Y and bilinear height, rounded to whole meters. For Nobile Rim 1, this is (84000, 110000, 5947 m).
- Blender (Z-up): `(X - X0, Y - Y0, h - Z0)`. GLB (Y-up, Three.js-compatible): `(X - X0, h - Z0, -(Y - Y0))`. The scale is 1:1 in meters.
- The mesh is a 2.5D height field on the projected plane. It applies no curvature correction, and its grid distances are about 0.16% longer than ground distances at the site.
- +Y is grid north, not geographic north. Geographic north lies at a grid bearing equal to the east longitude, 37.37° at the site.

## Limits

- The source fills about 90% of pixels by interpolation (per PGDA). A valid height is not necessarily a direct laser measurement.
- The 25 m mesh omits relief at smaller scales. Its errors against every source pixel in the crop are in the verification file.
- The silhouette comparison uses planar grid-space rays and only compares the mesh with the source. It is not a horizon or visibility calculation.
- Redistributing NASA data in a public build still needs licensing review before release.
