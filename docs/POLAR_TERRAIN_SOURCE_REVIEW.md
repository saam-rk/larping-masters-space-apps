# South-polar lunar terrain: primary-source review

**Access date:** 2026-11-14 UTC. **Scope:** research across the south-polar region, not just the three demo points; no application implementation or new product decision. Prepared on `docs/polar-terrain-validation`.

Inputs read: [reliability audit](LUNAR_RELIABILITY_AUDIT.md), [data research](LUNAR_DATA_RESEARCH.md), [south-pole research](LUNAR_SOUTH_POLE_RESEARCH.md), and the project README, status and decisions. The audit's numerical reproductions are prior evidence, **not calculations repeated in this review**. Its unresolved full-horizon findings remain unresolved.

Evidence vocabulary:

- **Source-confirmed:** freshly retrieved provider documentation or primary-paper text supports the statement; not a new measurement or a pixel-level test.
- **Inference / proposed validation:** reasoning from those sources; not an adopted requirement or an executed analysis.
- **Not executed:** no new raster decoding, footprint intersection, DEM differencing, numerical horizon, uncertainty propagation, or observational validation was performed here.

## 1. Main finding and geographic boundary

**Adjusted LOLA is a documented regional baseline, not a uniformly resolved map of every rock or a landing-safety guarantee.** PGDA 90 provides nested south-polar products and quality layers. PGDA 78 provides selected local refinements. Neither the local 5 m collection nor the 87–90°S mosaic alone covers a general 80–90°S study domain. The accessible primary sources do not establish a completely independent, equally detailed terrain truth dataset across that whole cap. [S1–S5]

“Whole south pole” needs a declared **northern boundary** before a numerical coverage claim is meaningful. For research organization, **80–90°S at all longitudes is a useful candidate core**, because it matches the regional 20 m product; this is a proposal, not a confirmed application boundary. The source also supports investigating 83–90°S, 75–90°S or 60–90°S with different grids. Do not silently define the whole south pole as the 13 candidate landing regions or the innermost 87–90°S mosaic. [S1, S2]

Keep three domains separate:

1. **Observer domain:** where a user or study may place an observer.
2. **Terrain-support domain:** all terrain needed for those observers' horizons, including an outward halo beyond the observer domain.
3. **Validated domain:** observers, azimuths, distances and quantities for which data validity, convergence and uncertainty have actually been demonstrated.

**Inference:** an observer on the northern edge of the 80–90°S core needs terrain north of 80°S for northward rays. A map covering every observer is not necessarily a complete horizon-support map. A rectangular stereographic raster can extend equatorward of its nominal latitude circle in its corners; that is not uniform extra coverage in every direction. The exact file footprint and valid mask, not the product name or bounding rectangle alone, govern support.

A halo must be defined in surface distance and tested in every direction. With spherical radius `R`, a support radius `D` corresponds to angular distance `D/R` radians; this is a geometric relationship, not a chosen cutoff. Wider PGDA 90 products reaching 75°S and 60°S are candidates for the continuation. No fixed halo, including the earlier exploratory 400 km radius, is certified here. Require extent convergence plus a defensible bound on omitted terrain, or retain an unknown sector. A crop boundary must never become an artificial clear horizon.

## 2. PGDA 90: regional adjusted LOLA

### Coverage, frame and sampling

**Source-confirmed:** the catalog identifies cloud-optimized GeoTIFFs, south-polar stereographic X/Y in meters, and the **MOON_ME realization of JPL DE421**. The 2023 paper, Table 1, gives these nominal limits and map ranges. Pixel scale is true at the pole; the projection radius is **1,737.4 km**. [S1, S2 §2/Table 1/Figure 1]

| Nominal latitude coverage | Grid spacing | Stereographic X and Y range | Elevation filename family |
|---|---:|---:|---|
| 83–90°S | 10 m/pixel | ±216.4 km | `LDEM_83S_10MPP_ADJ.TIF` |
| 80–90°S | 20, 40, 80 m/pixel | ±304 km | `LDEM_80S_*MPP_ADJ.TIF` |
| 75–90°S | 30 m/pixel | ±457.44 km | `LDEM_75S_30MPP_ADJ.TIF` |
| 60–90°S | 60, 120, 240 m/pixel | ±931.2 km | `LDEM_60S_*MPP_ADJ.TIF` |

These are **published metadata**, not headers or valid masks newly inspected here. Preserve latitude convention, east-longitude convention, central meridian, affine transform, pixel-center registration and vertical datum from each actual adopted file and its documentation. A generic Moon CRS name does not establish the DE421 orientation; projection radius alone is not sufficient evidence for every vertical encoding.

The paper distinguishes surface elevation above the reference sphere from absolute position. Thus `radius = referenceRadius + elevation`; a positive elevation is not height above nearby ground. Do not substitute PA or a generic lunar frame for the published ME realization without a documented transformation and error budget. This review did not execute a frame transform. [S2 §§2–3; inherited frame concern: audit F-05]

### What the quality layers mean

| Layer | Source definition | Interpretation constraint |
|---|---|---|
| `LDEM` | Surface height, meters | Gridded model, not a direct return at every center |
| `LDEC` | LOLA spots per pixel | Observation support, not a terrain-validity mask |
| `EFFRES` | Effective resolution, meters | Not equal to the file's pixel spacing |
| `LDEM ... ERR` | Surface-height error, meters | Paper describes estimated RMS pixel-height uncertainty |
| `LDSM` / `LDSM ... ERR` | Slope / slope error, degrees | Scale-dependent model quantities |
| `HILL` | Hillshade at 45° altitude and 45° azimuth | Display illumination, not real-time solar conditions |

The **2023 effective-resolution definition** is the diameter of the largest circle fitting between nearby LOLA spots, equivalently the largest crater diameter that could escape sampling. The paper says much of the region poleward of 84°S has approximately 20 m effective resolution, but it varies spatially even at the same latitude. This is not a 20 m guarantee everywhere. Do not conflate it with the inverse-square-root point-density proxy discussed in the 2021 local study. [S1; S2 §2; S4 §4]

The regional paper describes cleaned, height-adjusted tracks gridded with **natural-neighbor interpolation**. For larger spacings, 20 m grids are downsampled by multipixel averaging to 40, 60, 80, 120 and 240 m. Consequently, coarse cells represent mean terrain and can suppress narrow peaks relevant to a skyline. More sampling along a ray cannot recover missing subpixel relief. [S2 §2]

**Important quality qualification newly confirmed from the primary paper:** the regional uncertainty maps are not independently simulated at every location. The authors generate clones for **four representative tiles**, fit a piecewise-linear relation between RMS error and effective resolution, and convert effective-resolution maps using these fits, separately by grid spacing. The fit-residual MAD is typically approximately 20%; fits are truncated at 700 m effective resolution, assigning the 700 m uncertainty beyond that threshold. The stated uncertainty is relative to the **true average height/slope within each pixel**, not the height of every rock or footpad contact. [S2 §3, Figures 7–8]

The paper estimates final track geolocation errors conservatively as **1.00/1.00/0.15 m in X/Y/Z**; it explicitly separates this absolute-position uncertainty from pixel surface-height uncertainty. Do not substitute the much smaller local track-adjustment statistics from PGDA 78. Nor should these estimates be treated as hard maximum errors. [S2 §3]

Validation in the paper includes comparison with NAC images rendered from the DEM: overall correspondence improves, but some artifacts remain and gaps can look artificially smooth. Its approximately 30% radiance-factor RMS comparison depends on an assumed constant-albedo Lambertian surface; it is **not a 30% height error or a universal validation score**. [S2 §3]

Regional roughness products have named baselines: spread of spot residuals around a fitted plane, or central-point/annulus RMS height deviation. A 100 m or longer baseline roughness layer is not landing-gear-scale roughness. Preserve the statistic, baseline and sampling scale. Regional XYZI point clouds use X/Y/Z in **meters**, unlike local PGDA 78 point clouds. [S1]

## 3. PGDA 78: local 5 m terrain and uncertainty

**Source-confirmed:** the collection contains selected regions, including Site06/Nobile Rim 1, DM2/Nobile Rim 2 and Site04/Shackleton Rim, plus many other named regions. These are local fields, not contiguous all-longitude coverage of the entire southern cap. The README specifies **5 m/pixel**, south-polar stereographic X/Y in meters, **MOON_ME/DE421**, and GMT pixel registration: coordinates refer to pixel centers. [S3]

- `surf`: surface height in meters, with interpolation filling empty pixels.
- `ldec`: number of LOLA returns per pixel.
- `toterr`: total height RMS error in meters.
- `slp` / `slperr`: slope and RMS slope error in degrees.
- `Clones`: 100 realizations for uncertainty studies.
- Local binary XYZI tables: double precision, X/Y/Z in **kilometers**, followed by the LOLA RDR identifier. [S3]

A cell can have `ldec = 0` and a valid interpolated elevation. Neither no return nor missing terrain means elevation zero. The earlier audit reports zero containing-cell returns at the three demo locations; this review **did not re-extract those cells**.

The catalog and paper report approximately **90% interpolated pixels in the studied 5 m fields**, ROI median height RMS approximately **0.30–0.50 m**, and slope RMS approximately **1.5–2.5°**. Their quoted approximately 10–20 cm horizontal / 2–4 cm vertical track-geolocation uncertainties describe the local adjustment study. These statistics are not an all-cap guarantee, not a census freshly computed over every subsequently added region, and not individual-pixel error bounds. [S3, S4]

The paper estimates errors with fractal terrain and an ensemble of 100 clones incorporating interpolation, orbital, ranging and sampling effects. It explicitly cautions that individual craters/boulders can depart from the statistical terrain model and that small-baseline deviations due to pebbles, rocks and boulders are not accounted for. This is decisive for distinguishing a useful terrain model from complete knowledge of real relief. [S4 §4]

**Inference:** an RMS map cannot automatically be interpreted as a deterministic bound, a 95% interval, or independent Gaussian pixel noise. Bilinear height uncertainty is not simply one containing cell's RMS; adjacent pixels and observer/obstacle errors can be correlated. A moved observer also introduces position/slope sensitivity. Clones are a possible way to study those effects under the paper's assumptions, not independent surveys of reality.

## 4. Horizon methods: what the publications validate and what they do not

Barker et al. (2021), §5, describes **720 sight lines at 0.5° spacing**, Cartesian calculations, and nested terrain: **5 m grid inside 5 km**, **80 m at 5–100 km**, and **240 m farther away**. It evaluates time-dependent illumination at one-hour intervals and propagates terrain uncertainty using clones. [S4]

A subtle but important limitation: although the paper treats the Sun as an extended source with limb darkening at 550 nm, its visible fraction is **approximated by a horizontal division of the disk at the horizon elevation at the disk-center azimuth**. It should not be cited as proof of exhaustive two-dimensional ray integration across every rugged skyline. Its numerical settings are a published study configuration, not universally sufficient settings for all polar observers. [S4 §5]

PGDA 69 describes long-term products averaging hourly values over approximately 18.6 years. Its Earth visibility means **any portion of the Earth disk unobscured**, explicitly potentially optimistic for links to particular DSN stations. It warns that COG overviews average native values. These maps are useful contextual/model comparisons, not arbitrary-hour predictions or independent terrain truth. [S6]

### Proposed validation requirements, not executed here

1. **Observer geometry:** separate datum radius, sampled ground elevation and instrument height. State radial versus terrain-normal height. Use the same frame, observer and epoch throughout; define azimuth at the exact pole.
2. **Curvature:** compute terrain vectors in a consistent lunar body-fixed frame and project into the observer's horizontal basis. Do not treat map-grid distance as spherical arc distance, apply curvature twice, or clamp negative horizons to zero.
3. **Coverage:** record valid masks, nearest observed support, halo extent and missing segments for every ray. A finite maximum over known samples does not prove unobstructed sky where data are missing.
4. **Convergence:** refine radial sampling, azimuth spacing, near-field resolution and support extent separately; inspect controlling-obstacle changes and overlap seams. Test narrow peaks and gaps, not only smooth terrain. Coarse averaged DEMs need special care for skyline maxima.
5. **Uncertainty:** perturb observer position/height and use appropriately correlated terrain errors; inspect sparse-track, steep, interpolated and boundary regions across the entire cap. Agree tolerances for a defined scientific quantity rather than inventing a global confidence percentage.
6. **Disk semantics:** distinguish center, any-part, full-disk and radiometric exposure. Test the disk's actual angular footprint against the skyline; keep grazing results indeterminate within uncertainty. Solar terrain clearance is not an eclipse calculation.
7. **Independent checks:** compare a second reader/projection implementation for software correctness, then genuinely different observations where available for physical plausibility. Those are different validation activities.

The earlier south-pole document used local 5 m terrain only through 200 m, sparse disk-direction sampling and a 400 km cutoff. Those choices differ from the published configuration. This review does **not** close audit F-03, certify its solar/Earth full-disk claims, or extend its single-site example to the entire pole.

## 5. Comparison datasets: independence and exact coverage limitations

### LOLA-derived comparisons

**PGDA 81** is a 5 m mosaic covering **87–90°S**, in MOON_ME/DE421. It combines 97 fields of 20 × 20 km with 2 km overlaps, rigid translations and cosine-taper blending. Counts can be fractional in overlaps. Its typical **30–55 cm RMS residual against individual fields** is a mosaic/field comparison, not independent absolute truth. It cannot cover the 80–87°S part of a proposed core. [S5]

The standard PDS LOLA grids and other PGDA resolutions remain valuable processing/version comparisons, but share the LOLA measurement lineage. This review did not re-read the standard polar file labels or sample them; their detailed encodings remain prior-report evidence. Agreement among local, regional and mosaic LOLA heights cannot exclude shared systematic errors.

### LROC NAC stereo: different observation physics, shared geodetic control

NAC stereo derives topography through image matching and bundle adjustment; product confidence maps describe local elevation quality. The footprint catalog explicitly includes the number of **LOLA profiles used to register each DTM** and residuals against LOLA. Thus NAC can test independently observed morphology, but its absolute geodetic control is not wholly independent. [S7–S9]

Freshly confirmed examples illustrate why a place name is insufficient:

| Product | Grid | Latitude bounds | East-longitude bounds | Coverage consequence |
|---|---:|---:|---:|---|
| `NAC_DTM_NOBILE01` | 3 m | −85.50…−84.07° | 23.95…36.17° | Does not include either project Nobile point; Nobile Rim 1 is east of the box |
| `NAC_DTM_SHACKRDGE02` | 3.5 m | −89.63…−89.37° | 209.81…239.10° | Does not include project Shackleton Rim at −89.7668°, 188.13°E |

These are **bounding-box exclusions**, not a search proving no other NAC product covers those points. For whole-cap validation, intersect the complete footprint collection with the chosen core and halo, then inspect each valid/confidence mask. The fetched collection says it includes releases through **2026-09-15** and uses a Moon_2000 geographic CRS; retain the product's actual frame realization rather than inferring it from that generic label. No footprint files were downloaded or intersected here. [S7–S9]

The catalog defines relative LE as **vertical precision at 90% confidence**, based on sampling, convergence angles and image-matching uncertainty. It is not interchangeable with LOLA RMS. `lola_rms` is residual against the registering tracks, not a new independent accuracy certification. [S9]

### Shape from shading: useful refinement, not independent whole-cap truth

PGDA 104 describes **5 m products for the 13 original 2022 Artemis candidate regions**, more than 4,500 km², using NAC imagery to refine LOLA terrain in illuminated areas while retaining LOLA geodetic consistency. It supplies image counts, illumination-direction counts, best input resolution and SDEM-minus-LDEM differences. A difference layer is not itself an uncertainty layer. [S10]

The linked author README gives these boxes in `[min longitude, min latitude, max longitude, max latitude]`, degrees: [S11]

- Nobile Rim 1: `[31.660751, -85.899218, 43.228530, -84.976283]`.
- Nobile Rim 2: `[54.462322, -84.404616, 63.024724, -83.501549]`.
- Peak Near Shackleton: `[107.525568, -89.173591, 141.842773, -88.443484]`.
- Overall vertex bounds for the 13 regions: `[-171.469234, -89.835111, 141.842773, -83.501549]`.

The Nobile reference coordinates lie in their named boxes; that is not a valid-pixel test. The selected Shackleton Rim longitude −171.87° falls outside the published overall longitude interval. Do not substitute Peak Near Shackleton for that point. Near-polar/longitude-wrap geometry and raster margins still require exact footprints; the README's overall box is not filled coverage. There is no documented continuous 80–90°S SfS coverage in this collection. Neither the raster masks nor illumination sufficiency at individual pixels were inspected here.

### Broad datasets that do not provide independent polar terrain

- **WAC GLD100:** native stereo covers **79°S–79°N**, with 100 m grid spacing but approximately 300 m effective resolution and estimated 10–20 m elevation accuracy. All products except the native 100 m tiles fill the polar hole with LOLA. A polar tile's map extent reaching 90°S does not turn that fill into independent WAC measurements. [S12]
- **SLDEM2015:** the PDS archive specification gives **60°S–60°N at all longitudes**, combining LOLA and Kaguya Terrain Camera data. It does not cover an 80–90°S core. [S13]
- **USGS Kaguya TC DTM collection:** documented processing range **70°S–70°N**, 7–37 m grid spacings, heights above a sphere, and alignment to LOLA. It cannot validate the polar core; this limitation applies to this named collection, not every native JAXA product. Individual native JAXA tiles were not investigated here. [S14]

**Conclusion on independence:** NAC stereo/imagery and SfS are worthwhile local checks with explicit shared-control and illumination limitations. No complete independent all-cap elevation reference was established. Radar, other altimeters, native JAXA polar products and shadow imaging may merit a separately scoped inventory; this report makes no unverified coverage or accuracy claim for them. Imagery alone is not a numeric elevation measurement.

## 6. Model elevation, local relief and landing safety

A DEM elevation is a model value above a reference sphere. **Local relief** is variation over a stated neighborhood and baseline; slope, roughness, boulder sizes, crater rims and footpad-scale geometry are separate quantities. A numerically precise elevation does not establish corresponding physical accuracy or recover unobserved terrain. The source papers explicitly describe interpolation and unmodeled small-scale features. [S2–S4]

A whole-cap DEM can support terrain-context and exploratory horizon studies while remaining inadequate to certify approach corridors, touchdown or traversability. Landing safety requires mission-specific tolerances, landing dispersion, obstacle/roughness evidence at relevant scales and qualified validation. A terrain-clear Sun or Earth disk is likewise not guaranteed electrical power, thermal survival or a link to a named station. No such guarantee or implementation is proposed here.

## 7. Access and verification ledger

All sources below were freshly accessed during this review unless a failure is explicitly noted. Primary-paper passages, catalogs and README text were read; complete rasters and complete dataset archives were not downloaded.

| Access event | Observed outcome |
|---|---|
| PGDA 90 initial readable fetch | Aborted; subsequent raw HTML fetch succeeded, including download inventory |
| PGDA 78, 81, 69, 104 | Provider page text retrieved successfully |
| PGDA local README | Web extractor rejected `application/octet-stream`; Python standard-library HTTPS retrieval succeeded and full text was read |
| Barker 2021 NTRS PDF | Text extraction succeeded; §§4–5 and relevant method/uncertainty passages read |
| Barker 2023 DOI URL | HTTP 406; NASA NTRS manuscript located through web search and successfully fetched instead |
| Barker 2023 NTRS PDF | Text extraction succeeded; Table 1 and §§2–3 examined; no fresh numeric reproduction |
| NAC example catalogs, footprints, GLD100, USGS Kaguya, PDS archive SIS | Text retrieved successfully |
| Zenodo region README | Web extractor rejected octet-stream content; Python HTTPS retrieval succeeded and full text was read |

No access configuration, credentials, TLS settings or repository dependencies were changed. No raster HTTP-range requests were attempted in this review; the audit's earlier HTTP 403 profile failure is inherited evidence, not a newly observed failure. Search results were used to locate primary sources, not as substitutes for the retrieved method text.

**Not executed:** cap-wide quality statistics, valid-mask census, point sampling, header decoding, exact footprint intersection, cross-source DEM residuals, horizon rerun, radial/angular/extent convergence, SPICE transformations, time-series comparisons, physical landing assessment or app checks. These remain future evidence needs; source availability is not a passed scientific test.

Only this new document is owned by this task. No implementation, branch change, commit, delegation, or edits to the audit/status/decisions are part of it. Proposed follow-up, not written into those files: have Diego and the integrator review the core northern boundary, halo-completeness method, target quantity/tolerance, and independent-data coverage before adopting terrain calculations.

## Primary sources

- **S1 — NASA GSFC PGDA 90, regional adjusted LOLA:** https://pgda.gsfc.nasa.gov/products/90 . Dataset DOI: https://doi.org/10.60903/gsfcpgda-lola-spole . Download examples: [20 m](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF), [10 m](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_83S_10MPP_ADJ.TIF). Download targets listed, not downloaded here.
- **S2 — Barker et al. (2023), A New View of the Lunar South Pole from LOLA**, PSJ 4, 183, DOI https://doi.org/10.3847/PSJ/acf3e1 . Retrieved [NASA manuscript](https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf); [record](https://ntrs.nasa.gov/citations/20230014419).
- **S3 — NASA GSFC PGDA 78, local LOLA:** https://pgda.gsfc.nasa.gov/products/78 ; [provider README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README).
- **S4 — Barker et al. (2021), Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions**, PSS 203, 105119, DOI https://doi.org/10.1016/j.pss.2020.105119 . Retrieved [NASA manuscript](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf).
- **S5 — NASA GSFC PGDA 81, 87–90°S mosaic:** https://pgda.gsfc.nasa.gov/products/81 .
- **S6 — NASA GSFC PGDA 69, polar illumination and visibility:** https://pgda.gsfc.nasa.gov/products/69 .
- **S7 — LROC NOBILE01:** https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01 .
- **S8 — LROC SHACKRDGE02:** https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02 .
- **S9 — LROC DTM footprint collection and error definitions:** https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS .
- **S10 — NASA GSFC PGDA 104, shape from shading:** https://pgda.gsfc.nasa.gov/products/104 . Linked paper DOI: https://doi.org/10.3847/PSJ/ae5b70 (paper not separately fetched).
- **S11 — Author-deposited region README:** https://zenodo.org/records/17954508/files/README.md?download=1 . Linked archive: https://zenodo.org/records/17954508 (regional ZIPs not fetched).
- **S12 — LROC GLD100 product documentation:** https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100 .
- **S13 — PDS LOLA archive software interface specification, §2.2:** https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/archsis.htm .
- **S14 — USGS Kaguya TC DTM collection documentation:** https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/ .
