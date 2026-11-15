# Apollo 11: LROC terrain reconstruction

Revised 2026-11-15 on `feat/apollo-11-terrain`. The user explicitly authorized
replacing the earlier coarse LOLA elevation grid with the LROC stereo DTM.
The former 29.6 m model is superseded. No application UI or ephemeris code changed.

## Files and acceptance evidence

- [Terrain GLB](../../../public/terrain/apollo-11.glb): **2,064,284 bytes**,
  **40,500 vertices**, **80,462 triangles**, below 2 MiB without mesh compression.
- [Editable Blender file](../../../public/terrain/apollo-11.blend): conventional
  startup file with one terrain scene, packed maps, geographic anchor, eye-level
  camera and overview camera. A matching copy is retained in this folder.
- `metadata.json` / public sidecar: CRS, origin, hashes, provenance and limitations.
- `validation.json`: independent validation of the final exported GLB.
- `landmarks.json`: source-raster measurements in identifiable crater neighborhoods.
- `source-comparison.png` and `little-west-comparison.png`: geographically aligned
  official orthophoto and DTM-derived shading. These are evidence, not model textures.
- `preview.png` and `overview.png`: renders of the reimported GLB.
- `blend-check.json`: standalone Blender scene and packed-image checks.

The independent check found one connected disk with one exterior boundary,
no internal cracks, no degenerate/inverted triangles, three decoded embedded
images and clamp-to-edge samplers. Blender reimport preserved positions and
counts. Maximum exported-vertex disagreement with bilinear source heights is
0.000024 m. This is numerical fidelity, not survey accuracy.

Across the source pixel centers, the adaptive mesh has RMS error 0.05425 m,
95th-percentile absolute error 0.11070 m, maximum 0.44574 m relative to the DTM.
These measures describe mesh simplification. They do not validate the DTM itself.
Camera views and renders were inspected in Blender. Browser GPU validation
remains pending: the integrated browser could not reach local Vite in the earlier
attempt. The updated review page is `/tools/lunar-terrain/apollo-review.html`
after `npm run dev`; it checks counts, material maps, samplers and raycasts.

## Reliable sources and acquired products

1. [Official LROC Apollo 11 DTM collection](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO11).
2. [DTM download entry](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11).
3. [Confidence product](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11_CONF).
4. [Orthophoto M150361817, 2 m](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11_M150361817_2M).
5. [NASA/NSSDCA Apollo coordinates](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html).
6. [NASA ALSJ: Little West and historical USGS mapping](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11EastCraterRIP.html).
7. [LROC historical site explanation and West crater](https://lroc.im-ldi.com/visit/exhibits/1/gallery/8).
8. [LROC processing guide](https://www.lroc.asu.edu/data/support/downloads/LROC_NAC_Processing_Guide.pdf):
   its Apollo DTM example adds 1,737,400 m to elevations to obtain radius.
9. [LRO coordinate-system standard](https://pds-imaging.jpl.nasa.gov/documentation/LRO_Coordinate_System.pdf):
   lunar planetocentric Mean Earth convention.

The actual downloaded label identifies **NAC_DTM_APOLLO11 v1.9**, created
2020-10-10; the project README dates the original stereo project to 2012-09-17.
Keep these dates distinct. Source stereo pairs are M150361817 L/R and M150368601 L/R,
acquired 2011-01-22. These are modern observations, not 1969 surface measurements.
Provider: NASA/LRO/LROC team, Arizona State University; distribution through PDS.
Original official URLs redirect to the NASA PDS MCP archive. Full downloaded
file SHA-256 values are retained in `metadata.json`.

The source README reports 2 m post spacing, SOCET SET precision estimate 0.77 m,
and 1.81 m RMS agreement to seven LOLA orbit tracks. Neither 2 m pixel spacing nor
the exported vertex count is an absolute accuracy claim. Actual GeoTIFF CRS and
NoData were inspected. NoData is approximately -3.40282266e38.

The GeoTIFF confidence browse image is contrast-stretched and is **not** interpreted
as categorical scientific confidence. The original PDS `CONF.IMG` was downloaded
and read instead. The 1.6 km square patch contains no NoData, but **48,033 of
640,000 pixels (7.505%) are confidence class 3, suspicious correlation**.
Other pixels are categories 10–14, successful correlation. The original values
are preserved; suspicious regions have not been filled, flattened, or silently
promoted to reliable measurements. Source warnings include shadows, noise,
faceting and possible stereo seams. Such source artifacts are distinct from
cracks introduced by mesh construction.

## Geographic transform and scene extent

The anchor is the published LM coordinate: **0.67416 N, 23.47314 E**,
catalogued as ME/DE421. It is not the first-footprint or footpad position.
The DTM label specifies planetocentric coordinates; the supplied LRO convention
supports Mean Earth, but the label does not independently identify a DE ephemeris
realization. No finer frame adjustment or surveyed LM registration is claimed.

Use the stored GeoTIFF CRS verbatim: spherical radius 1,737,400 m,
equirectangular, standard parallel 1 degree N, central meridian 180 degrees E.
Do not replace its central meridian or reuse the app's polar projection helpers.

```text
X = R*cos(1 degree)*(longitude-180 degrees)*pi/180
Y = R*latitude*pi/180
(X0,Y0) = (-4745695.923994704, 20442.789921944615) metres
h0 = -1927.4377562264772 metres above the reference sphere
Blender = (X-X0, Y-Y0, h-h0)
GLB = (X-X0, h-h0, -(Y-Y0))
```

Inverse longitude/latitude follow by division by the same projection factors.
The patch extends -800 to +800 m in each horizontal axis; it is smaller than
the previous 4 km patch to allocate the budget to actual local relief. Vertical
scale is 1:1. No curvature correction is applied. For astronaut/marker contact,
transform the geographic coordinate and raycast the exported surface; do not
add normal-map grain to elevations.

## Landmark comparison and limits

NASA's historical account places Little West roughly 60 m east of the LM and
describes a crater around 30 m across. In the downloaded DTM/orthophoto, the
nearby crater outline appears east of the anchor in both aligned products.
The lowest sampled point in the search neighborhood is approximately
(70.92 m east, 8.21 m north); the neighborhood has 4.13 m of elevation range.
These are our measurements of that raster neighborhood, not a new surveyed
center, depth or diameter. The historical distance is approximate and may refer
to the rim; no translation was applied to force agreement.

The larger West crater is recognizable farther east-southeast in both products.
The minimum in its search neighborhood is (552.92 m east, 105.79 m south), with
28.39 m of neighborhood relief. Confidence class 3 comprises 25.8% of the Little
West search window and 30.3% of the West search window; detailed interior shapes
must therefore be treated cautiously. The two products share the DTM processing
chain: agreement supports orientation, coverage and feature identity, but is not
independent survey validation.

The source orthophoto is used only for comparison. Its baked shadows are **not**
painted onto albedo and presented as historical lighting. The delivered model
does not invent boulders, footprints or sub-metre craters. The DTM is visibly
smoother than the photograph at small scales; that remaining limitation is honest.

## Mesh and materials

One Delaunay mesh combines a dense 2 m grid in the 200 m central square with a
coarser background and iterative refinement at the largest measured elevation
residuals. Selection is spatially distributed to retain crater rims and slope
changes. There are no concentric LOD rings, separate skirts or material seams.
The entire surface comes from the same DTM interpolation.

The matte material uses embedded color 512x512 JPEG, normal 2048x2048 JPEG and
roughness/metallic 128x128 PNG maps. Grain is illustrative and has no displacement.
The near atlas is 50 m wide: full detail inside 15 m radius, smooth fade to neutral
at 24 m, and neutral clamped borders farther away. Normal strength is 2; lighting
is illustrative and is not the July 1969 ephemeris. The detail region is fixed
to the anchor, not dynamically moved with the camera. Core glTF PBR and ordinary
PNG/JPEG are used; no optional mesh/texture decoder is required.

## Reproduction and human review

Requirements: Python with NumPy, SciPy, Pillow, Rasterio and PyProj; Blender 5.3.
Scripts use the retained source crop for verification. Full original downloads
are locally retained but excluded from Git in `source/lroc/.gitignore`.
For preparation, download:
- DATA/SDP/NAC_DTM/APOLLO11/NAC_DTM_APOLLO11.TIF -> DTM.TIF
- DATA/SDP/NAC_DTM/APOLLO11/NAC_DTM_APOLLO11_CONF.IMG -> CONF.IMG
- EXTRAS/BROWSE/NAC_DTM/APOLLO11/NAC_DTM_APOLLO11_M150361817_2M.TIF -> ORTHO.TIF

Paths above are relative to
`https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/`.
Check their hashes against metadata before reproducing.

```sh
python tools/lunar-terrain/prepare_apollo_lroc.py
# Execute build_apollo.py through Blender MCP, with its absolute __file__.
# Then, in a separate background Blender:
blender --background public/terrain/apollo-11.blend --python tools/lunar-terrain/finalize_apollo_blend.py
python tools/lunar-terrain/verify_apollo.py
python tools/lunar-terrain/review_apollo_landmarks.py
```

The builder creates a new live scene, preserving existing scenes. Finalization
runs separately and converts the generated scene library into a normal .blend.
No commit, push or merge was performed. Application tests are not applicable to
this asset-only change and were not run. Browser review remains pending.

Human review requested: Diego for sources, confidence and coordinate handling;
Andrés for the actual viewer; integrator for the asset diff. Proposed ESTADO update:
Apollo 11 LROC asset regenerated and checked; browser integration/human review pending.
Proposed DECISIONES update: the user explicitly approved substituting the LROC DTM
on 2026-11-15; retain the 2 MiB and geometry limits. No expanded historical UI or
time-range decision is inferred.

This is a terrain visualization, not a guarantee of power, communications,
visibility or landing suitability. Credit the NASA/LRO/LROC team and PDS.
