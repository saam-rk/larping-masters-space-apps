# Nobile Rim 2 terrain delivery

Generated on 2026-11-14 through the live **MCP for Blender**, Blender 5.3.0.
Editable scene: `nobile-rim-2.blend`. Web asset: `nobile-rim-2.glb`.
Coordinate contract and provenance: `nobile-rim-2.metadata.json`.
The user requested this terrain experiment and support for arbitrary coordinates
inside the crop. This does not change the application's current UI or ephemeris
model. No commit, push, publication or merge was performed.

## Observed delivery checks

| Item | Observed result |
|---|---|
| GLB bytes | **1,796,720** = 1.713 MiB, below 2,097,152 |
| Exported vertices / triangles | **50,000 / 99,198**, within both requested ranges |
| Attributes / indices | POSITION and NORMAL; uint16 indices; one material, one terrain mesh |
| Compression / textures | None; no decoder or textures required |
| Coordinate scale | Meters, vertical exaggeration 1:1 |
| Reimport | One terrain mesh, identity transform, positive upward normals; extent errors 0 m |
| Projected surface | X 152002.5…162002.5 m; Y 90002.5…100002.5 m, exactly 10 × 10 km |
| Source window edges | X 152000…162005 m; Y 90000…100005 m; outer half-pixel strips are outside the mesh |
| Valid coverage | 100% of the 100 km² mesh; 0 missing source pixels in 4,004,001 samples |
| Independent geometry checks | 17 passed, including 128 arbitrary interior points, boundary and outside checks |
| Three.js | Actual GLTFLoader parsed the GLB; Raycaster placed the saved points and 100 additional manual coordinates; transformed mesh and outside/invalid inputs checked |
| Physical mobile cold load / orbit FPS | **Pending**; no mobile device available. No timing or FPS claim. |

See `nobile-rim-2.verification.json`, `.reimport.json` and `.web-loader.json`
for the observed checks. A Node loader check is not a browser or mobile benchmark.
The background reproduction produced a GLB with the same SHA-256 as the MCP build.
The reopened editable scene and 2 m camera clearance are checked in `.blend-check.json`.
The existing `SkyScene.tsx` has no terrain loader, so integration remains reviewable
work for the interface owner.

## Source and scientific conventions

The numeric elevation source is [NASA GSFC PGDA product 78, LRO/LOLA](https://pgda.gsfc.nasa.gov/products/78),
[DM2_final_adj_5mpp_surf.tif](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif).
The original file SHA-256, byte size, CRS WKT, transform and source bounds are in
the metadata. The downloaded TIFF is intentionally outside the repository.
`source-readme.txt` preserves the [provider README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README).
Citation: Barker et al. (2021), Planetary and Space Science 203, 105119,
https://doi.org/10.1016/j.pss.2020.105119.

Rasterio/GDAL inspected a 4000 × 4000 float32 raster, 5 m square pixels,
south polar stereographic projection, central meridian 0°, true scale at -90°,
zero false offsets, sphere radius 1,737,400 m, and NaN nodata. All 16 million
source samples are finite. The TIFF's generic datum name does not encode the
frame realization: **MOON_ME/DE421 comes from NASA's README and catalog**.
Valid interpolated elevations are not necessarily direct laser measurements.

The app coordinate (-83.954°, +58.82206° E) projects to
**X=157000.451965 m, Y=95000.253401 m**. The containing source cell is
row 1999, column 2000 (zero-based). Its elevation is **1009.582153 m**,
reproducing the research value rounded to 1009.58 m. Bilinear interpolation
of the four surrounding pixel centers gives **1009.671579 m**, separately.

The original Nobile Rim 1 convention is retained:

- Local origin: `(X0,Y0,h0)=(157000,95000,1010)` m, rounded site X/Y and bilinear height.
- Blender: `(X-X0,Y-Y0,h-h0)`, Z up. GLB: `(X-X0,h-h0,-(Y-Y0))`, Y up.
- Height is radial elevation above the 1,737,400 m sphere, not radius or geoid height.
- The projected plane has no lunar curvature correction. Grid scale at this site
  is about 1.00279; grid north differs from geographic north by 58.82206° here.
  An ephemeris direction must not simply be treated as a grid bearing.

## Feature, simplification and height comparisons

Inspection of numerical elevation and illustrative hillshade selected a broad
crest southwest of the site in projected grid coordinates. It is a descriptive
label, not an IAU name or a landing recommendation. The chosen crest point is
**(-84.068986068°, +59.188814232° E)**, projected
**(154602.5,92202.5) m**, at 1465.391602 m radial elevation. The initial
10 km crop retains both the site and this feature without moving its center.
See `nobile-rim-2.source-inspection.png`.

| Point | Containing cell (m) | Source bilinear (m) | GLB surface (m) | GLB minus bilinear (m) |
|---|---:|---:|---:|---:|
| Saved site | 1009.582153 | 1009.671579 | 1009.651141 | -0.020438 |
| Southwest crest | 1465.391602 | 1465.391602 | 1465.391602 | approximately 0 |
| Southeast slope: -83.929666722°, +59.728918885° E | 719.606445 | 719.275953 | 718.843960 | -0.431993 |

The mesh starts with 40,401 vertices spaced 50 m apart. An additional 9,599
source pixel centers refine selected cells: rank each cell's maximum interior
height residual against the base triangle surface, weighted toward the crest
by `1+3*exp(-distanceSquared/(2*1000²))`. Split a selected cell into four
triangles around that pixel; shared coarse edges stay intact without cracks.
All vertices keep their exact source pixel centers and numeric heights.
This process is deterministic and creates 99,198 triangles.

Across all 4,004,001 source centers, the final GLB approximation has **0.360931 m
RMS**, **0.618136 m 95th-percentile absolute error**, **1.036646 m 99th percentile**,
and **40.944202 m maximum absolute error**. The large local maximum must not be
hidden by the RMS: the budgeted mesh loses some narrow relief. These are
approximation errors against DM2, not estimates of absolute lunar terrain
accuracy. The coordinate checks alone do not establish uniform accuracy.

There are no nodata holes in this crop. The adaptive variant deliberately stops
if a future crop contains invalid source pixels; it never fills or bridges them.
The original regular-grid generator retains its masked-quad handling.

## Any manual coordinate

`../terrain-marker.mjs` provides `placeTerrainMarker(terrainMesh, lat, lon,
metadata, offsetM=0)`. Supply the actual terrain Mesh obtained from GLTFLoader.
It applies the spherical projection, checks projected bounds, and ray-casts
onto the exported triangles. Missing terrain returns `null`, including invalid
coordinates and coordinates outside the crop. It does not use a list of sites
or substitute zero height. The latitude/longitude envelope is not a valid
coverage test on its own. Returned `local` coordinates are in GLB meters;
`world` accounts for transforms on the loaded object, and `surfaceElevationM`
is radial terrain height before the marker offset.

## Editable scene and previews

The `.blend` contains the terrain, an orange site marker, a blue crest marker,
`Camera_overview`, and `Camera_ground_to_ridge` at **2 m above the simplified
surface**. Both marker empties sit on that surface and retain source bilinear
height as a separate property. Pole sizes are illustrative.
Neutral gray material, a 5° grazing light and a faint fill make relief readable.
The lights are illustrative, with no date or solar-ephemeris claim.
Only the terrain mesh is exported to the GLB.

`nobile-rim-2.overview.png` and `nobile-rim-2.ground.png` are Blender renders.
The build creates a separate live scene and preserves pre-existing Blender
objects; the saved artifact contains only the terrain scene and dependencies.

## Reproduce

Use the same Python dependencies as `../requirements.txt`; the optional map
inspection requires `../requirements-adaptive.txt`. SciPy is not used.
Run from `docs/research/site-terrain` with Python 3.13 and Blender 5.3:

```powershell
$researchPython = 'C:/path/to/research-env/Scripts/python.exe'
$blenderExe = 'C:/Program Files/Blender Foundation/Blender 5.3/blender.exe'
$raster = 'C:/path/to/source/DM2_final_adj_5mpp_surf.tif'
curl.exe -L --fail -o $raster https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif
& $researchPython prepare_adaptive.py --config sites/nobile-rim-2.json --raster $raster --out-dir nobile-rim-2
& $blenderExe --background --factory-startup --python blender_build_adaptive.py -- --prep nobile-rim-2/nobile-rim-2.prep.json --grid nobile-rim-2/nobile-rim-2.adaptive.npz --out-blend nobile-rim-2/nobile-rim-2.blend --out-glb nobile-rim-2/nobile-rim-2.glb
& $blenderExe --background nobile-rim-2/nobile-rim-2.blend --python normalize_blend_file.py
& $blenderExe --background nobile-rim-2/nobile-rim-2.blend --python check_blend_scene.py -- --out nobile-rim-2/nobile-rim-2.blend-check.json
& $blenderExe --background --factory-startup --python blender_reimport_check.py -- --prep nobile-rim-2/nobile-rim-2.prep.json --glb nobile-rim-2/nobile-rim-2.glb --out nobile-rim-2/nobile-rim-2.reimport.json
& $researchPython verify_adaptive.py --directory nobile-rim-2 --raster $raster
node check_web_loader.mjs
```

For MCP generation in the connected Blender, this session used:

```python
import runpy
from pathlib import Path
root = Path(r"C:\Users\diego\Documents\NasaSpaceChallenge\larping-masters-space-apps\docs\research\site-terrain")
ns = runpy.run_path(str(root / "blender_build_adaptive.py"), run_name="adaptive_terrain")
stem = root / "nobile-rim-2" / "nobile-rim-2"
ns["build"](str(stem.with_suffix(".prep.json")), str(stem.with_suffix(".adaptive.npz")),
            str(stem.with_suffix(".blend")), str(stem.with_suffix(".glb")))
```

## Remaining review and performance work

The integrator and Diego should review the coordinate contract, maximum mesh
error and diff before integration. The interface owner can wire the GLB and
metadata into the viewer and reuse the marker helper. On a recent midrange
phone, record device, browser version, network throughput/latency, cold-cache
selection-to-visible-and-interactive duration, and FPS during orbit plus zoom.
Targets remain ≤2 seconds cold load, 60 FPS target and 50 FPS threshold.

Proposed `ESTADO.md` update: record this verified terrain artifact and pending
mobile/integration tests. Proposed `DECISIONES.md` update: record the user's
explicit request for this georeferenced Nobile Rim 2 experiment, arbitrary valid
coordinate placement and 2 MiB asset budget; do not silently replace the first
demo's ephemeris or safety limitations. Those shared files were not edited.
This model establishes neither terrain visibility, communications, solar power
nor landing suitability, and a 10 km crop can omit distant obstacles.
