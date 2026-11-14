# Additional lunar reference sites: catalog and optional terrain research

**Access/check date:** 2026-11-14 UTC, read from the execution environment, not inferred from a project document. **Branch:** `t3/research-additional-lunar-sites`. **Inspected application commit:** `07ecfd975b8c8c556e432aa600c7f7a2144db776`.

**Scope:** research only. This report is the only repository file created or changed by this task. No application implementation, commit, push, bulk dataset download, or new project decision is included.

## 1. Conclusions and required product scope

1. **User requirement, confirmed in this assignment:** all the additional attachment entries must support the **same current third-person geometric/reference-horizon view** in the future MVP. Realistic, site-specific 3D terrain is **optional if time permits**, not a prerequisite for adding points. Do not delay the catalog expansion for meshes, textures, elevation sampling, or terrain-horizon research.
2. The attachment has **24 requested entries and 23 unique coordinate pairs** after excluding only **R06/Site06 Nobile Rim 1, DM2 Nobile Rim 2, and R04/Site04 Shackleton Rim**. **LM1 Shackleton Rim B remains included.** A future catalog with all 24 additional selectable entries would have 27 entries and 26 unique coordinate pairs including the three existing points.
3. **Important provenance correction:** the original March 2025 Data Book table has **26 rows**, not 27. Its 23 non-excluded rows match the attachment's coordinates. **Site20v2 is not a separate row in that table.** PGDA 78 independently lists **Site20v2: Leibnitz beta plateau, extended boundaries**, added on **2022-08-15**. Its actual raster has a larger extent than Site20. The attachment assigns both the same point; retain that assignment with explicit variant provenance rather than claiming that the book separately published the Site20v2 coordinate. [B, P78]
4. All **24 exact local elevation URLs** were obtained from PGDA's actual links, individually returned **HTTP 206**, and had their TIFF headers inspected. Each requested point lies inside its corresponding raster rectangle under the documented lunar stereographic projection. **One containing elevation pixel was decoded and finite in each of the 24 files.** This is not validation of an entire crop, local uncertainty, texture registration, or a finished mesh.
5. **PGDA 90 is the regional fallback** for every requested coordinate: all are poleward of 83°S, within the advertised 10 m and 20 m regional products. Four regional download endpoints were checked without downloading their arrays. A local 5 m DEM is not guaranteed 5 m effective resolution; the underlying observations leave interpolated gaps. [P90, R23, P78, R21]
6. No new Sun/Earth positions, slopes, terrain-clearance results, mesh assets, landing recommendations, or communications/power guarantees are asserted here. Adding names and coordinates does **not** require hard-coded Sun/Earth values per site.

### Current code versus old plans

`ESTADO.md` says implementation has not started and no `package.json` exists; those statements are stale. This checkout contains the React application, server ephemeris implementation, tests and build scripts. `DECISIONES.md` D-019 already supersedes the original prohibition on custom coordinates and local-time entry.

Fresh code inspection establishes:

- `shared/sites.ts` still defines exactly three predefined sites, planetocentric latitude, signed east longitude, provenance, coordinate normalization, and exact-coordinate matching.
- `src/features/scene/ThirdPersonView.tsx` draws a **smooth lunar sphere**, a local tangent horizon, and Sun/Earth from the response's azimuth/elevation and ranges. It is not a detailed lunar globe or terrain model.
- `src/features/scene/SkyScene.tsx` shares `placeBodies` between first- and third-person views. `bodies.ts` uses apparent angular diameter and range, explicitly flags nominal size/range fallbacks, and omits bodies whose direction is missing.
- `src/features/scene/viewMode.ts` enables first-person terrain only for `nobile-rim-2`; other IDs fall back to third person. The research mesh README documents an existing Nobile Rim 2 pipeline. This does not establish a mesh for any additional site.
- `server/ephemeris/service.ts` uses `SITE_ALTITUDE_KM = 0` above the Horizons reference sphere, not sampled ground. `server/horizons/query.ts` requests quantities **4, 13, 20**, `AIRLESS`, and longitude/latitude/altitude for the selected observer.

**Terminology qualification:** the user calls the required view “geometric”; preserve the requested experience, but Horizons quantity 4 is formally **apparent azimuth/elevation without atmospheric refraction**, not an uncorrected geometric vector. The horizon is a geometric reference plane. The current request code itself labels quantity 4 apparent; the JPL manual confirms the distinction. Do not silently change the scientific method during a catalog-only task. [JPL]

## 2. Evidence levels and source identity

| Level | Meaning in this report | What it does not establish |
|---|---|---|
| **Source-confirmed** | A freshly retrieved primary catalog, README, label, or paper states the property. | Working download endpoint, correct pixel, or usable crop. |
| **Endpoint checked** | A request reached the exact file; status and byte-range response or HEAD metadata were observed. | Complete download integrity, browser CORS, future availability, or correct science. |
| **Raster sampled** | TIFF metadata were decoded and one actual elevation sample was read at the specified point. | Independent reader agreement, measured support at that pixel, valid neighbors, or validated terrain analysis. |
| **Unknown / not checked** | No corresponding test was performed, or the source does not establish it. | Not the same as absent, zero, unsuitable, or impossible. |

The local files reach all three positive levels, with **sampling limited to one containing elevation pixel each**. Regional files reach endpoint checked, not newly sampled. Imagery and SfS coverage below are mainly source-confirmed and bounding-box candidates, not valid-pixel coverage.

### Data Book version, table, coordinate meaning

The retrieved 93-page PDF is **Moon to Mars (M2M), M2M-30044, Baseline, release/effective date March 18, 2025**, NASA/TP-20250002845. NTRS separately reports **publication and acquisition March 19, 2025**. Do not confuse either publication date with this report's access date. The relevant locator is **Appendix A, A2.1, Table A2.1-1, printed/PDF page 75 of 93**; Appendix F on page 93 discusses reference frames. [B, BN]

Immediately above Table A2.1-1, the book says coordinates were generated from PGDA DEMs and that **“the center points of the original polygons are accurate to 5 to 10 meters.”** This describes the published reference-center coordinates; it is not a pointwise DEM vertical-error estimate, landing dispersion, or six-decimal geodetic guarantee. The table itself labels its columns only Latitude and Longitude. The planetocentric/east-positive interpretation is supported by the linked LRO coordinate standard, the PDS LOLA label, the PGDA frame statement, and the consistency check against all raster extents—not by an explicit convention sentence inside the table. [B, FRAME, LABEL, P78]

The LRO standard defines planetocentric coordinates, positive northern latitude, east-increasing longitude, and radial heights relative to a **1,737.4 km** sphere where elevations rather than radii are stored. PGDA specifies **MOON_ME of DE421**. Retain that realization separately from generic GeoTIFF “unknown”/Moon CRS names. Longitude wrapping is arithmetic, not a transformation between ME, PA, or IAU_MOON. [FRAME, P78]

## 3. Complete requested catalog — proposed IDs, not adopted interfaces

Coordinates below preserve the original decimal values; units are **degrees**, latitude negative south, longitude **signed east**. No IAU feature-center substitution, extra rounding, or copied SfS bounding-box midpoint has been made. All IDs and alias behavior are **proposals**.

**Provenance key:** **B** = exact coordinate pair/name in the baseline table; **V** = attachment reuses B's Site20 pair for the separately documented PGDA extended-boundary variant. PGDA publishes `Site20v2`; `R20v2` is retained as an attachment alias, not asserted to be a separate Data Book shorthand.

| # | Proposed stable ID | Published name / requested variant | Codes and aliases to retain | Latitude | East longitude | Coordinate provenance |
|---:|---|---|---|---:|---:|---|
| 1 | `amundsen-rim` | Amundsen Rim | DM1 | -84.2287 | 69.44396 | B |
| 2 | `haworth` | Haworth | Haworth; table name cell says “(Haworth is its name)” | -86.7639 | -22.777 | B |
| 3 | `shackleton-rim-b` | Shackleton Rim B | LM1; **not R04** | -89.5244 | 56.30993 | B |
| 4 | `shoemaker-rim-a` | Shoemaker Rim A | LM2 | -88.0792 | 11.88866 | B |
| 5 | `shoemaker-rim-b` | Shoemaker Rim B | LM3 | -88.3828 | 16.58734 | B |
| 6 | `shoemaker-rim-c` | Shoemaker Rim C | LM4 | -88.9645 | 37.23483 | B |
| 7 | `shoemaker-rim-d` | Shoemaker Rim D | LM5 | -88.632 | 74.62375 | B |
| 8 | `shoemaker-rim-e` | Shoemaker Rim E | LM6 | -87.9458 | 71.27421 | B |
| 9 | `faustini-rim-a` | Faustini Rim A | LM7 | -87.8897 | 90 | B |
| 10 | `shoemaker-rim-f` | Shoemaker Rim F | LM8 | -87.3417 | 60.25512 | B |
| 11 | `cabeus-exterior-wall-1` | Cabeus Exterior Wall 1 | NPA | -86.9243 | -71.5651 | B |
| 12 | `amundsen-1` | Amundsen 1 | NPB; distinct from DM1 | -83.9046 | 89.53545 | B |
| 13 | `idelson-l-crater-1` | Idel'son L Crater 1 | NPC; Idel’son L; ASCII Idelson search alias | -84.5397 | 126.9045 | B |
| 14 | `malapert-crater-1` | Malapert Crater 1 | NPD; distinct from R23 | -84.8034 | 8.387032 | B |
| 15 | `connecting-ridge` | Connecting Ridge | R01, Site01 | -89.4632 | -137.49 | B |
| 16 | `peak-near-shackleton` | Peak Near Shackleton | R07, Site07 | -88.811 | 123.6901 | B |
| 17 | `de-gerlache-rim-1` | de Gerlache Rim 1 | R11, Site11; PGDA “de Gerlache rim” | -88.6834 | -67.9321 | B |
| 18 | `leibnitz-beta-plateau` | Leibnitz Beta Plateau | R20, Site20 | -85.4266 | 31.74276 | B |
| 19 | `leibnitz-beta-plateau-extended` | Leibnitz Beta Plateau, extended boundaries | Site20v2; attachment R20v2 | -85.4266 | 31.74276 | **V: B + P78 variant; not a separate B row** |
| 20 | `malapert-massif` | Malapert Massif | R23, Site23 | -85.9948 | -0.23578 | B |
| 21 | `de-gerlache-kocher-massif` | de Gerlache-Kocher Massif | R42, Site42 | -85.8296 | -116.322 | B |
| 22 | `shoemaker` | Shoemaker | Shoemaker; table name cell says “(Shoemaker is its name)” | -87.1835 | 62.83502 | B |
| 23 | `de-gerlache-rim-2` | de Gerlache Rim 2 | SL2; PGDA “de Gerlache rim” | -88.23 | -64.6284 | B |
| 24 | `connecting-ridge-extension` | Connecting Ridge Extension | SL3; attachment typo “Connencting” may be a search alias only | -89.0324 | -101.999 | B |

The original PDF spells **Connecting**, not “Connencting.” Preserve the published **Leibnitz** spelling in provenance even if another naming authority or search alias differs. Haworth and Shoemaker here are **PGDA/Data Book reference points**, not verified IAU crater centers. Feature-name similarity does not authorize moving the observer. Idel'son's punctuation may be normalized for search, not its coordinate pair. [B, P78]

### Proposed Site20 / Site20v2 handling

**Recommended model, pending integrator decision:** one physical observer point with two terrain-product variants. Keep both attachment entries discoverable, preserve their distinct catalog/product identity, and label the extended variant explicitly. Both use identical ephemeris input under the current altitude-zero method. Do not portray them as two different locations or independently computed mission scenarios.

If the UI must expose 24 new selectable entries, retain the two proposed IDs and a common point identity such as `pointKey: leibnitz-beta-plateau`; attach `terrainProductId: Site20` or `Site20v2` separately. If the integrator prefers one selector entry with two terrain choices, that is **23 new observer points**, while this research inventory still has **24 entries**. Neither option has been adopted by this report.

The original Site20 raster spans **16 × 16 km**; Site20v2 spans **26 × 26 km**, both centered at projected **(73,000, 118,000) m**. “v2” means a separately distributed extended-boundary product, not evidence that every pixel is more accurate or that all Site20 uses should be silently replaced. Sampled center-cell heights are not bit-identical between the two files; do not deduplicate the source rasters by coordinate pair. [P78; inspected TIFFs below]

## 4. Exact local terrain products and observed coverage

### Shared metadata freshly checked

Every local `surf.tif` below was individually checked and has:

- 5 m × 5 m pixel spacing; north-up south-polar stereographic grid; origin latitude **-90°**, central meridian **0°**, scale factor **1**, false easting/northing **0 m**, spherical axes **1,737,400 m**.
- A single **32-bit floating-point** band, TIFF compression code **1** (uncompressed), NaN nodata, and PixelIsArea geokey. Pixel centers are half a cell inside the outer edges. The provider README's GMT “pixel-registered” wording is consistent with cell-centered values, not permission to treat TIFF corner tiepoints as sample centers.
- Header CRS citation text such as “unknown” or “unnamed ellipse”; it does **not** independently encode the full MOON_ME/DE421 realization. Carry the provider README with the raster.
- Elevation `surf` in **meters**, not planetary radius. The lunar reference convention is radial height above the 1,737,400 m sphere; store that datum explicitly, and do not infer a vertical datum solely from a projection radius. It is not terrestrial sea level, height above local ground, or the altitude to use automatically in the current API. [P78, README78, FRAME, LABEL]

Local XYZI point-cloud X/Y/Z values are **kilometers**, whereas raster X/Y/Z are meters. PGDA 90's regional XYZI values are meters. Do not share an ingestion scale just because both files have `.xyzi` extensions. [README78, P90]

### Per-entry download and sampling ledger

**Every link in this table is the actual provider-linked elevation file**, not a guessed successful URL. **S** means source-confirmed + endpoint checked (HTTP 206) + one finite containing elevation pixel decoded. Rectangle limits are shown in **kilometers** for compactness, exactly converted from header meters. Size is decimal MB from the HTTP `Content-Range` total, rounded to two decimals, not browser asset size. `row,col` is zero-based, top-left origin. All point-in-rectangle checks passed; all full-crop/quality checks remain open.

| Product / exact elevation download | Raster dimensions | X outer limits (km) | Y outer limits (km) | File MB | Sample row,col; level |
|---|---:|---:|---:|---:|---|
| [DM1](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM1/DM1_final_adj_5mpp_surf.tif) | 4000 × 4000 | 154…174 | 51.5…71.5 | 64.03 | 1999,2000; S |
| [Haworth](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Haworth/Haworth_final_adj_5mpp_surf.tif) | 5960 × 5960 | -52.9…-23.1 | 75.6…105.4 | 142.12 | 2979,2979; S |
| [LM1](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM1/LM1_final_adj_5mpp_surf.tif) | 4000 × 4000 | 2…22 | -2…18 | 64.03 | 2000,1999; S |
| [LM2](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM2/LM2_final_adj_5mpp_surf.tif) | 4000 × 4000 | 2…22 | 47…67 | 64.03 | 1999,2000; S |
| [LM3](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM3/LM3_final_adj_5mpp_surf.tif) | 4000 × 4000 | 4…24 | 37…57 | 64.03 | 1999,2000; S |
| [LM4](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM4/LM4_final_adj_5mpp_surf.tif) | 4000 × 4000 | 9…29 | 15…35 | 64.03 | 1999,2000; S |
| [LM5](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM5/LM5_final_adj_5mpp_surf.tif) | 4000 × 4000 | 30…50 | 1…21 | 64.03 | 2000,1999; S |
| [LM6](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM6/LM6_final_adj_5mpp_surf.tif) | 4000 × 4000 | 49…69 | 10…30 | 64.03 | 2000,1999; S |
| [LM7](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM7/LM7_final_adj_5mpp_surf.tif) | 4000 × 4000 | 54…74 | -10…10 | 64.03 | 1999,1999; S |
| [LM8](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/LM8/LM8_final_adj_5mpp_surf.tif) | 4000 × 4000 | 60…80 | 30…50 | 64.03 | 1999,2000; S |
| [NPA](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPA/NPA_final_adj_5mpp_surf.tif) | 4000 × 4000 | -98.5…-78.5 | 19.5…39.5 | 64.03 | 1999,1999; S |
| [NPB](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPB/NPB_final_adj_5mpp_surf.tif) | 4000 × 4000 | 175…195 | -8.5…11.5 | 64.03 | 1999,2000; S |
| [NPC](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPC/NPC_final_adj_5mpp_surf.tif) | 4000 × 4000 | 122.5…142.5 | -109.5…-89.5 | 64.03 | 2000,1999; S |
| [NPD](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/NPD/NPD_final_adj_5mpp_surf.tif) | 4000 × 4000 | 13…33 | 146…166 | 64.03 | 1999,2000; S |
| [Site01 / R01](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/Site01_final_adj_5mpp_surf.tif) | 3200 × 3200 | -19…-3 | -20…-4 | 40.98 | 1599,1600; S |
| [Site07 / R07](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site07/Site07_final_adj_5mpp_surf.tif) | 3200 × 3200 | 22…38 | -28…-12 | 40.98 | 1600,1600; S |
| [Site11 / R11](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site11/Site11_final_adj_5mpp_surf.tif) | 3200 × 3200 | -45…-29 | 7…23 | 40.98 | 1599,1599; S |
| [Site20 / R20](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site20/Site20_final_adj_5mpp_surf.tif) | 3200 × 3200 | 65…81 | 110…126 | 40.98 | 1600,1599; S |
| [Site20v2](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site20v2/Site20v2_final_adj_5mpp_surf.tif) | 5200 × 5200 | 60…86 | 105…131 | 108.19 | 2600,2599; S |
| [Site23 / R23](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site23/Site23_final_adj_5mpp_surf.tif) | 4200 × 4200 | -11…10 | 111…132 | 70.59 | 2100,2100; S |
| [Site42 / R42](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site42/Site42_final_adj_5mpp_surf.tif) | 4000 × 4000 | -123.4…-103.4 | -66.1…-46.1 | 64.03 | 1999,2000; S |
| [Shoemaker](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Shoemaker/Shoemaker_final_adj_5mpp_surf.tif) | 4000 × 4000 | 66…86 | 29…49 | 64.03 | 1999,2000; S |
| [SL2](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/SL2/SL2_final_adj_5mpp_surf.tif) | 4000 × 4000 | -58.5…-38.5 | 13…33 | 64.03 | 2000,2000; S |
| [SL3](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/SL3/SL3_final_adj_5mpp_surf.tif) | 4000 × 4000 | -38.7…-18.7 | -16.1…3.9 | 64.03 | 1999,1999; S |

**Reproducibility of the observed checks:** temporary Python `requests`/`struct` processing outside the repository parsed the catalog's HTML anchors, required HTTP 206 and matching `Content-Range`, and read at most 32,768 bytes per metadata request. Additional bounded requests read TIFF fields outside that first range. Metadata checked included dimensions, sample format, compression, strip offsets/counts, pixel scale, tiepoint, geokeys, and nodata. For the inspected uncompressed one-row strips, the sample address was `stripOffset[row] + 4 * column`; exactly four bytes were decoded using the file's byte order. TLS verification stayed enabled.

The coordinate calculation used the documented spherical south-polar stereographic parameters:

```text
R = 1737400 meters
phi = latitude in radians; lambda = east longitude in radians
rho = 2 * R * tan(pi/4 + phi/2)
x = rho * sin(lambda)
y = rho * cos(lambda)
column = floor((x - xmin) / 5)
row = floor((ymax - y) / 5)
```

This is an executed arithmetic/header check, **not an independent GDAL/PROJ cross-validation**. Published points frequently lie near grid lines. LM7 is particularly close to the Y=0 cell boundary: floating-point evaluation selected row 1999; an exact-zero treatment can select row 2000. Source-coordinate uncertainty is also larger than one 5 m cell. Future ingestion must declare its boundary and interpolation conventions and inspect neighboring samples. The finite tests do not establish a unique measured elevation at the nominal polygon center. No diagnostic sampled heights are adopted as observer altitudes here.

### Quality and companion products

For **each of these 24 products**, the actual PGDA page links all five filename endings below. This was checked against the page's link inventory; the **96 non-elevation companion endpoints were not individually requested or sampled**. The following is a verified catalog naming rule, not a claim of endpoint success:

```text
https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/<product>/<product>_final_adj_5mpp_<layer>.tif
layers: surf, ldec, toterr, slp, slperr
```

| Layer | Meaning and units | Required caution |
|---|---|---|
| `surf` | Interpolated surface elevation, m | Finite value may have no direct return in that cell. |
| `ldec` | Number of LOLA returns per cell | Zero returns is not nodata or zero height. |
| `toterr` | Total height RMS error, m | Not a hard maximum error, 95% interval, or universal accuracy claim. |
| `slp` | Slope, degrees | Depends on baseline and gridding; not footpad-scale hazard certification. |
| `slperr` | Slope RMS error, degrees | Must be matched to the same product/version and interpretation. |

PGDA also describes 100 clones and, where supplied, ROI shapefiles and adjusted point clouds. These were not downloaded. The older shared README's short site list omits later additions; use the updated PGDA product page for collection membership, not that abbreviated list alone. [P78, README78]

The 2021 paper and product description report roughly **90% interpolated cells in the studied 5 m fields** and regional median RMS height errors around 0.30–0.50 m. These are study statistics, not newly measured figures for every subsequently added site or point. The paper explicitly excludes some small-baseline rock/boulder effects from its uncertainty model. **5 m pixel spacing does not mean every 5 m feature is resolved.** A denser exported mesh cannot reconstruct unobserved relief. [R21, P78]

## 5. Regional continuation and fallback

Every requested coordinate is within the published **83–90°S** and **80–90°S** latitude ranges. This is a source-based regional-coverage inference; the local header/sample results above are separate evidence.

| Actual provider-linked regional file | Published nominal coverage / spacing | Observed endpoint result and exact total bytes | Proposed use |
|---|---|---|---|
| [LDEM_83S_10MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_83S_10MPP_ADJ.TIF) | 83–90°S; 10 m | HTTP 206; 5,116,709,568 bytes | All requested centers; finer regional alternative after crop QA. |
| [LDEM_80S_20MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF) | 80–90°S; 20 m | HTTP 206; 2,696,082,051 bytes | Consistent wider terrain context/fallback. |
| [LDEM_80S_80MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF) | 80–90°S; 80 m | HTTP 206; 189,158,392 bytes | Coarser distant context; not narrow-ridge truth. |
| [LDEM_60S_240MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF) | 60–90°S; 240 m | HTTP 206; 218,961,039 bytes | Candidate outer continuation for a later horizon study. |

Only bytes 0–15 of each regional file were requested in this task; all had BigTIFF signatures. The COG format, meter coordinates, MOON_ME/DE421 frame, height units, and quality-layer meanings are **source-confirmed**, not newly decoded full headers. Do not feed these files to the simple classic-TIFF reader used for the local check. [P90, R23]

Use the associated `LDEC`, `EFFRES`, `ERR`, slope, and slope-error products as appropriate. The regional paper defines effective resolution by the largest circle fitting between nearby LOLA spots. Its uncertainty maps use empirical relationships fitted using representative tiles; coarse grids are formed by averaging and can suppress narrow peaks. Regional, local, and mosaic LOLA products share measurement ancestry and are not independent physical truth datasets. [R23]

[PGDA 81's 5 m mosaic](https://pgda.gsfc.nasa.gov/products/81) covers **87–90°S** only. By nominal latitude this includes LM1–LM8, Site01, Site07, Site11, Shoemaker, SL2, and SL3; it does **not** nominally cover DM1, Haworth, NPA, NPB, NPC, NPD, Site20/Site20v2, Site23, or Site42. This is not a valid-pixel intersection. Do not choose it as the sole dataset for all 24 entries.

A local mesh crop may be adequate for visual context but insufficient for distant terrain obstruction. Any later horizon study needs an explicitly defined surrounding extent, curvature handling, seam checks, and convergence tests. No universal crop radius is selected here. HTTP range support is not a deployed-browser CORS test; prepare reduced assets offline rather than streaming multi-gigabyte raw rasters into the MVP.

## 6. Optional higher-detail terrain and imagery

### 6.1 Shape from shading: explicit candidate mapping, not replacement coordinates

PGDA 104 links a **13-region** archive combining LOLA control with LROC NAC shape from shading. The linked Zenodo metadata was freshly retrieved: **version 1.0.0**, publication **2025-12-16**, license **CC BY 4.0**, 32-bit compressed GeoTIFFs, **5 m pixels**, Moon (2015) South Polar Stereographic. The record date is not this report's access date. The provider states the method improves detail in illuminated areas while retaining LOLA geodetic consistency. [P104, Z]

The following requested points are inside their corresponding **published README bounding boxes**. The exact ZIP names/URLs below are source-confirmed from the Zenodo record API. **The ZIP endpoints, internal headers, masks, elevations and textures were not downloaded or tested here**; unlike the local DEM table, these links are not labeled endpoint checked.

| Requested entry | Exact optional SfS archive | Approximate compressed GB |
|---|---|---:|
| DM1 | [A3CLR22_0_Amundsen_Rim.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_0_Amundsen_Rim.zip/content) | 1.78 |
| Haworth | [A3CLR22_2_Haworth.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_2_Haworth.zip/content) | 4.35 |
| LM7 | [A3CLR22_3_Faustini_Rim_A.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_3_Faustini_Rim_A.zip/content) | 1.94 |
| SL2 | [A3CLR22_4_deGerlache_Rim_2.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_4_deGerlache_Rim_2.zip/content) | 2.19 |
| SL3 | [A3CLR22_5_Connecting_Ridge_Extension.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_5_Connecting_Ridge_Extension.zip/content) | 2.23 |
| Site01 | [A3CLR22_6_Connecting_Ridge.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_6_Connecting_Ridge.zip/content) | 2.21 |
| Site07 | [A3CLR22_8_Peak_Near_Shackleton.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_8_Peak_Near_Shackleton.zip/content) | 1.36 |
| Site11 | [A3CLR22_9_deGerlache_Rim.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_9_deGerlache_Rim.zip/content) | 1.34 |
| Site20 and Site20v2, same point | [A3CLR22_10_Leibnitz_Beta_Plateau.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_10_Leibnitz_Beta_Plateau.zip/content) | 1.05 |
| Site23 | [A3CLR22_11_Malapert_Massif.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_11_Malapert_Massif.zip/content) | 2.21 |
| Site42 | [A3CLR22_12_deGerlache_Kocher_Massif.zip](https://zenodo.org/api/records/17954508/files/A3CLR22_12_deGerlache_Kocher_Massif.zip/content) | 2.11 |

For **LM1–LM6, LM8, NPA–NPD, and Shoemaker**, no separately named matching archive exists among these 13 regions. This is **not proof that all neighboring SfS footprints exclude those points**; an overlap search remains open. Keep the corresponding verified local LOLA DEM as the first terrain candidate for every entry.

The README's centers are explicitly **longitude/latitude bounding-box midpoints, not spherical polygon centroids**. Do not replace the Data Book observer points with them. Inclusion of the Site20 point does not establish coverage of the entire Site20v2 extended rectangle. [ZREADME]

SfS products include maximum-illumination orthomosaics, image-count/solar-direction-count maps, input-resolution maps, slope/roughness layers, and SDEM-minus-LDEM differences. Inspect those layers before claiming added detail. A difference map is not an error bound; shadowed areas and poor illumination diversity constrain reconstruction. “Moon (2015)” alone does not resolve ME/PA realization or vertical semantics. These packages are optional and large enough that they should not block the geometric MVP. [P104, Z]

### 6.2 LROC NAC stereo: promising local alternative, exact footprint still required

The [official NAC DTM footprint catalog](https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS) reports releases through **2026-09-15**, a Moon_2000 geographic CRS, pixel scale, relative vertical precision at 90% confidence, LOLA registration residuals, and jitter flags. Catalog product names alone are insufficient to determine coverage.

Exact catalog-linked footprint resources:

- [NAC_DTMS_180.ZIP](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/SHAPEFILE/NAC_DTMS/NAC_DTMS_180.ZIP): **HEAD checked, HTTP 200, 4,433,958 bytes**, redirected to the NASA PDS store at `https://pds.mcp.nasa.gov/data/store/img/lunar_reconnaissance_orbiter/pds4/lroc/lro-l-lroc-5-rdr/LROLRC_2001/EXTRAS/SHAPEFILE/NAC_DTMS/NAC_DTMS_180.ZIP`. Archive not downloaded or intersected.
- [NAC_DTMS_360.ZIP](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/SHAPEFILE/NAC_DTMS/NAC_DTMS_360.ZIP): **source-confirmed link only**.
- [NAC_DTMS_README.TXT](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/SHAPEFILE/NAC_DTMS/NAC_DTMS_README.TXT): **HEAD checked, HTTP 200, 2,471 bytes**, corresponding NASA-store redirect; content not separately read.

An actionable new candidate is **[NAC_DTM_SHACKRDGE02](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02)** for **R01 Connecting Ridge**. Its catalog box is latitude -89.63…-89.37°, longitude 209.81…239.10°E; R01 is -89.4632°, **222.51°E**, inside that box. Pixel scale is **3.5 m**, catalog relative LE **3.41 m at 90% confidence**, LOLA RMS **1.06 m**; those statistics are not point guarantees. This is **box inclusion only**, not a polygon/valid-mask test or a sampled DTM. It is not evidence that LM1 Shackleton Rim B is covered. [NAC]

For every other requested entry, exact stereo DTM coverage remains **unknown in this review**. Future work should intersect the complete footprint archive with each point and planned crop, then inspect the specific DTM label, orthophoto, confidence map and valid-data mask. Stereo image coverage does not mean a processed DTM exists. NAC uses different observation physics from laser altimetry, but many DTMs are registered to LOLA, so absolute control is not fully independent. [NAC, NACFP]

### 6.3 Texture / imagery choices and limitations

| Product | Source-confirmed coverage and nature | Implication for these entries |
|---|---|---|
| [Controlled NAC south-pole maximum-pixel mosaic](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH_CM_MAX) | 1 m/pixel; 84–90°S mosaic; control network only 85–90°S; 40 polar-stereographic tiles, R=1,737,400 m; highest pixel values chosen from multiple observations. | **NPB (-83.9046°) is outside the advertised range**. Other requested centers lie inside the nominal range, not necessarily a valid texture mask. DM1, NPC and NPD lie equatorward of the control network limit despite being within the mosaic range. |
| [Uncontrolled NAC south-pole mosaic](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH) | 1 m/pixel; 85.5–90°S; images acquired around 2010 southern solstice; images were not registered to each other. | Nominally excludes DM1, NPB, NPC, NPD and Site20/Site20v2. Other centers pass the latitude-only screen. Expect seams and different captured shadows; no per-site tile/mask validation here. |
| [NAC PSR south-pole mosaic](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_PSR_SOUTH) | Nominal domain 80–90°S, but **patchy shadow-region coverage**, not continuous terrain. 10 m grid; long exposures cause anisotropic resolution and saturation/null flags. | Every point is in the nominal latitude domain, but no point-specific usable pixel is established. The stretched 8-bit version has arbitrary display units, not I/F or albedo. |
| [ShadowCam archive](https://shadowcam.im-ldi.com/archive) and [controlled mosaic listing](https://pds.shadowcam.im-ldi.com/derived/cmosaic/) | Calibrated map-projected COG observations; 8-bit display and 32-bit radiance versions; designed to image shadowed terrain. | Useful for inspecting dark terrain where coverage permits. No individual observation/texture chosen for any point here; imagery alone does not supply elevation. |
| PGDA 104 maximum-illumination orthomosaics | The region archives in §6.1 provide these along with SfS ancillary products. | Candidate matching textures for those regions, but retain footprint, registration and baked-lighting limitations. |
| Neutral material or explicit diagnostic hillshade | Does not require a photographic texture. | Safest optional first terrain visualization; label it as a terrain-model rendering, not a photograph. |

The controlled-mosaic page links this [browse/GeoTIFF directory](https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/EXTRAS/BROWSE/NAC_POLE/NAC_POLE_SOUTH_CM_MAX). Its web extraction failed as incomplete/dynamic content in this session. **No exact texture tile endpoint or mask was verified.** Use the product's tile selector and actual PDS labels before choosing a file; do not invent tile URLs from the naming scheme.

**Never equate hillshade with albedo or real-time sunlight.** PGDA 90 hillshade uses a prescribed light direction (45° altitude, 45° azimuth). Photographic mosaics likewise contain shadows/lighting from acquisition times or composites. Relighting such a texture with the selected Sun can create contradictory double shadows. A maximum-pixel mosaic is not a physically consistent image at one instant, and ShadowCam radiance is not a reflectance-independent texture. [P90, NACMAX, NACPSR, SHADOW]

Native **WAC GLD100** stereo ends at 79°S; polar fill in its global products is LOLA, not independent WAC polar terrain. The named **USGS Kaguya TC DTM collection** spans 70°N–70°S and does not cover these points. These exclusions do not rule out all native JAXA products, which were not inventoried here. [GLD, KAGUYA]

## 7. Minimum geometric integration and optional mesh requirements

### Required future catalog integration — no terrain dependency

For each point the current geometric path needs only:

- Stable ID, display name, aliases for search, exact latitude/east longitude, and coordinate source/locator. Preserve the Site20v2 provenance exception.
- Selected date/time converted to the existing UTC request contract; existing altitude-zero assumption and existing Sun/Earth targets/method.
- The existing response's azimuth/elevation, units, per-body status, UTC/provenance, and optional angular diameter/range. Preserve explicit nominal-size/range indicators and missing-data handling.

**Do not store a Sun/Earth azimuth, elevation, “sunlit” flag, or Earth-visibility flag in the site catalog.** Those depend on observer/time/method. The current server query builder already consumes the selected coordinates. New sites should follow that same route rather than acquire one static saved scenario each.

### Concrete integration gotchas found in this checkout

| Code evidence | Future action to consider; not implemented |
|---|---|
| `SITE_IDS` and `REFERENCE_SITES` are maintained separately in `shared/sites.ts`. | Keep both synchronized and update tests that assume three entries. Avoid changing existing IDs or the default site as an accidental side effect. |
| `findSiteAt` uses `Array.find` with exact numeric equality; `siteAt` returns that first match. | With duplicate Site20 pairs, coordinate-based lookup picks whichever comes first. Define canonical-point/variant behavior explicitly; never silently relabel a chosen extended product. |
| `handler.ts` preserves an explicit `site=` ID but coordinate requests pass through `siteAt`. | Test ID-based and coordinate-based requests separately. Shared coordinates must not imply shared display identity unless deliberately chosen. |
| `coordinateQuery.ts` searches `site.name` only, including exact-name and ambiguous substring handling. | Codes such as DM1/R01/Site01, Idelson punctuation variants, and the attachment typo do not automatically become searchable. Alias indexing needs an explicit later change. “Shoemaker” and “de Gerlache rim” searches become more ambiguous. |
| `checkCoordinates` rounds to six decimals and normalizes longitude to (-180,180]; Horizons builder normalizes to [0,360). | Preserve source precision as provenance; test negative longitudes, 222.51° equivalence for R01, and exact matching after normalization. Six decimal storage is not six decimal physical accuracy. |
| `computeEphemeris` caches predefined cases by site ID + UTC, custom cases by coordinates + UTC. | Separate Site20 IDs would make separate equivalent ephemeris queries. Any optimization must retain selected identity/provenance; a future height/method change needs a suitable cache key. |
| `viewMode.ts` limits first person to Nobile Rim 2. | Keep third person available for all added points even when optional terrain assets fail or are absent. Do not associate a new point with the Nobile mesh. |
| Third person uses kilometers and geographic N/E/up; mesh tooling uses meters and projected grid directions. | An optional terrain asset cannot be inserted without unit/orientation/origin conversion. |
| i18n structure already exists. | Keep new interface labels/variant explanations translatable, Spanish default and English selectable; scientific proper names/aliases can retain their source spelling. |

### Optional mesh experiment, after the geometric catalog works

The existing `docs/research/site-terrain/README.md` describes a reusable research pipeline, not automatic coverage for every site. Its parameter schema, build scripts and checks are candidates for reuse after separately authorizing implementation.

1. Choose one exact local `surf` product and a bounded crop. Fetch the matching count/error layers and inspect all crop values and neighbors with a standard geospatial reader. Retain source URL, retrieval UTC, source checksum, size, product/version/Last-Modified, README/citation and quality evidence.
2. Record frame realization, sphere, projection, source datatype/units, nodata/mask, pixel registration, crop bounds, sampling/resampling method, and the source coordinates. Keep ground elevation, reference-sphere radius, and observer height above ground separate.
3. Use a documented local origin. The current generator's GLB contract is `(projectedX-X0, height-Z0, -(projectedY-Y0))` in **meters**. It is a planar projected 2.5D height field, not a curved lunar globe. Grid north is not geographic north; rotate or transform it consistently with the selected site's longitude and the scene's local basis.
4. Set a mesh/texture size budget, simplify with measured error against the source crop, preserve nodata instead of bridging gaps, and validate independently after GLB export/re-import. The existing Nobile Rim 2 asset's budget is evidence about that asset only, not a promised budget or fidelity for 24 new meshes.
5. Do not run the Blender generator against an unrelated open scene: its README says it deletes objects first. Use an isolated build context only when implementation is authorized.
6. Keep visual exaggeration, fill lights, terrain lighting and decorative objects separate from any scientific calculation. A rendered shadow or unobstructed camera ray is not a validated lunar horizon.

No mesh has been generated, inspected, assigned a completion status, or certified in this task. An optional “terrain available” flag should mean an actual reviewed asset exists—not merely that its source TIFF returned HTTP 206.

## 8. Attribution, licensing and scientific risks

- **Coordinate source:** cite NASA, M2M-30044 Baseline, Table A2.1-1, p.75, release 2025-03-18, NTRS 20250002845; distinguish the Site20v2 extension. NTRS marks the report public and “Public Use Permitted.” [BN]
- **Local LOLA:** credit NASA/GSFC, LRO/LOLA, PGDA 78, exact product, and **Barker et al. (2021), doi:10.1016/j.pss.2020.105119**. The provider requests this citation. Preserve the documented Mazarico et al. naming lineage rather than implying those authors approved this app. [P78, README78]
- **Regional LOLA:** cite **Barker et al. (2023), PSJ 4, 183, doi:10.3847/PSJ/acf3e1**, and dataset **doi:10.60903/gsfcpgda-lola-spole**. [P90]
- **SfS:** the archive API explicitly declares **CC BY 4.0**; preserve author attribution, archive version/DOI, license link, changes made, and the associated Bertone et al. paper **doi:10.3847/PSJ/ae5b70**. This license was verified for the linked archive, not assigned to every NASA-linked product. [P104, Z]
- **LROC/ShadowCam:** retain exact PDS product/collection identifiers, source mission/instrument and product citations. The controlled NAC page requests Archinal et al. (2023), LPSC abstract 2333; the uncontrolled mosaic requests Wagner et al. (2015), abstract 1473; the PSR mosaic requests Brown et al. (2022), abstract 5033. A page image's credit is not automatically the full data citation. [NACMAX, NACUNC, NACPSR, SHADOW]
- PDS Geosciences describes its archived datasets as public domain and requests appropriate citation. NASA's media guidance says NASA content is generally not copyrighted in the US, requires source acknowledgement, prohibits implying endorsement, and warns that third-party material can have separate rights. **PGDA's citation policy is not a standalone blanket license for every external asset.** Record product-specific terms and derived-asset changes before public distribution; code-library licenses remain separate. [PDSUSE, NASAUSE]

A faithful-looking mesh does not establish terrain clearance, solar power, thermal survival, station-specific communications, traversability, approach safety, or approved landing status. An Earth disk above the reference plane need not be visible past relief, and an unobstructed Earth disk does not identify a usable ground station or working radio link. A zero return count is not zero height; a missing raster/ephemeris value is not zero; an RMS statistic is not a worst-case guarantee. No prices, event eligibility changes, or safety approvals were researched or invented.

## 9. Proposed tests and unresolved decisions

### Future tests — proposed, not run against modified application code

**Catalog / geometric MVP:**

1. Assert all 24 requested entries are represented, all stable IDs are unique, and only the intended Site20 pair is duplicated. If variants are grouped, assert 23 additional physical points and 24 inventory entries rather than silently dropping one.
2. Compare each stored coordinate and source locator with the catalog above; specifically test LM1 versus excluded R04, DM1 versus NPB, NPD versus R23, and all six Shoemaker rim letters plus Shoemaker itself.
3. Test Site20 ID selection, coordinate lookup, variant label preservation and identical ephemeris inputs under the existing method. Decide whether coordinate lookup returns one canonical entry or an explicit ambiguous result.
4. Test alias and partial-name search, punctuation, longitude wraps, six-decimal normalization, invalid values, and both languages. Keep existing default and three original coordinates unchanged.
5. Test API acceptance of every new ID and correct longitude/latitude order in Horizons requests, using mocked/saved fixtures without unnecessary live requests. Do not manufacture site-specific saved Sun/Earth values.
6. Verify third-person fallback for every new entry, missing/partial response behavior, nominal range/size warnings, and scene/panel agreement. Assert no accidental first-person Nobile terrain at a new location.
7. Run existing `npm run check` and `npm run build` when application changes are actually made. Those commands exist in this checkout; **they were not run for this Markdown-only research task**.

**Optional terrain:**

1. Reproduce headers, coordinate projection and samples in GDAL/rasterio or another independent reader, including the LM7 grid-line case. Inspect valid masks and the four neighbors needed for bilinear interpolation.
2. Sample `ldec`, `toterr`, `slp`, `slperr` and regional effective resolution over the complete crop, not only its center. Check seams if blending local/regional products; do not assume identical heights or independent error.
3. Verify meters/kilometers, elevation/radius, grid/geographic north, and ME/PA orientation using control points. Quantify source-to-mesh error and preserve validity in the exported asset.
4. Intersect actual stereo/SfS/imagery footprints, inspect valid pixels and registration, then select exact texture tiles and licenses. Test asset load/failure, browser memory and performance separately from source download availability.
5. If terrain visibility becomes a separate feature, validate curvature, observer altitude, finite disk semantics, angular/radial/extent convergence and unknown sectors before displaying numerical visibility or durations. It is not a consequence of rendering a mesh.

### Decisions needed before implementation, not blockers to this research

- Does the integrator want **24 new selector entries** or **23 observer points plus the explicit Site20 terrain variant**? Proposed preference: separate point identity from product variant and keep both requested entries discoverable.
- Accept the proposed stable IDs/aliases and the corrected Site20v2 provenance? Retain the existing three IDs and default unless separately requested.
- What exact wording should distinguish the user's geometric/reference-horizon experience from apparent AIRLESS ephemerides? The catalog expansion need not alter the method.
- If time permits terrain, which first new site, crop extent, asset budget and quality acceptance criteria should be used? Source availability alone does not choose these.
- Who reviews the coordinate provenance, terrain datum/frame, and redistribution record? Recommended reviewers: Diego for science/data and the integrator for catalog behavior and scope; no approval is asserted here.

### Proposed updates for existing project records — text only, not edited

**For `ESTADO.md`:** replace the obsolete “implementation not started/no package.json” statements with the current implemented app evidence; note that the current predefined catalog still has three points, custom-coordinate support exists, third-person is general, and first-person terrain is currently enabled only for Nobile Rim 2. Link this report as research for 24 additional entries/23 unique new points. State that catalog expansion is pending implementation and that source checks do not equal 24 completed meshes.

**For `DECISIONES.md`:** record the user's explicit new requirement that additional points must use the current third-person experience, with realistic site terrain optional if time permits. Record the Site20 variant choice, IDs/aliases, and any terrain adoption only after the integrator decides them. Do not silently rewrite earlier agreements or treat this report's recommendations as confirmed decisions.

## 10. Checks performed and limits of delivery

**Observed checks:**

- Initial `git status --short` was empty and the current branch was the prepared non-base `t3/research-additional-lunar-sites`; no branch switch was needed.
- Read `README.md`, `ESTADO.md`, `DECISIONES.md`, `docs/GUIA_PRIMERA_DEMO.md`, `docs/LUNAR_DATA_RESEARCH.md`, `docs/LUNAR_SOUTH_POLE_RESEARCH.md`, `docs/POLAR_TERRAIN_SOURCE_REVIEW.md`, `docs/research/site-terrain/README.md`, `shared/sites.ts`, and the relevant current scene/request/search/cache files. Earlier research was orientation, not sole proof of external claims.
- Freshly fetched the original Data Book PDF and primary provider sources cited below; checked its 23 non-excluded coordinate pairs and separately sourced the Site20v2 variant. Counted 24 requested entries and 23 unique pairs.
- Extracted 24 local `surf` links from actual HTML anchors, excluding only Site04, Site06 and DM2; all 24 returned HTTP 206. Parsed all 24 local headers, projected all 24 points, and decoded one finite containing elevation pixel per file. Checked catalog presence of all five companion layer links per product.
- Checked four PGDA 90 regional endpoints by bounded range reads, the LROC footprint ZIP/README by HEAD, and the Zenodo record API/region README. No source checksum is claimed for a file not fully downloaded.
- Local TIFF metadata requests were bounded to 32 KiB; pixel reads were four bytes each. No complete elevation raster, regional raster, mesh, imagery tile, SfS ZIP or clone ensemble was downloaded. Temporary research metadata stayed outside the repository; no dependencies were installed.
- The final report was checked for 24 numbered catalog rows, 24 unique local elevation links, exact coordinate strings, duplicate-pair accounting, and only the requested file in the Git delta. `git diff --check` was run for whitespace issues; application checks were not run.

**Access limitations:** the web extractor rejected the PGDA README's octet-stream content; a normal verified HTTPS text request succeeded. It also failed to extract the controlled NAC browse directory; that failure remains explicit. Metadata availability and HTTP success are time-specific observations, not an uptime, CORS or licensing guarantee.

**Not performed:** independent GIS-reader sample reproduction, complete local masks/quality sampling, scientific elevation validation, full 24-site NAC/SfS polygon intersections, mesh construction, visual/browser testing, Horizons live queries, SPICE transforms, horizon or sunlight calculations, and application test/build execution. No previously reported terrain profile or slope result is newly certified by this report.

## Primary sources and exact locators

All access statements refer to **2026-11-14 UTC**. Publication/release dates are identified separately above. Source pages and relevant passages were retrieved, except resources explicitly marked link-only or HEAD-only.

[B]: https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf
[BN]: https://ntrs.nasa.gov/citations/20250002845
[P78]: https://pgda.gsfc.nasa.gov/products/78
[README78]: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README
[FRAME]: https://science.nasa.gov/wp-content/uploads/2024/01/luncoordwhitepaper-10-08.pdf
[LABEL]: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl
[R21]: https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf
[P90]: https://pgda.gsfc.nasa.gov/products/90
[R23]: https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf
[P104]: https://pgda.gsfc.nasa.gov/products/104
[Z]: https://zenodo.org/api/records/17954508
[ZREADME]: https://zenodo.org/records/17954508/files/README.md?download=1
[NAC]: https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02
[NACFP]: https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS
[NACMAX]: https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH_CM_MAX
[NACUNC]: https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH
[NACPSR]: https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_PSR_SOUTH
[SHADOW]: https://shadowcam.im-ldi.com/archive
[GLD]: https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100
[KAGUYA]: https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/
[JPL]: https://ssd.jpl.nasa.gov/horizons/manual.html
[PDSUSE]: https://pds-geosciences.wustl.edu/faq.html
[NASAUSE]: https://www.nasa.gov/nasa-brand-center/images-and-media/

- **[B] / [BN]:** M2M-30044 Baseline, Table A2.1-1 p.75 (coordinates and stated 5–10 m center accuracy), Appendix F p.93 (reference frames); NTRS record dates and public-use metadata.
- **[P78] / [README78]:** exact local product inventory, Site20v2 update date, per-layer units, MOON_ME/DE421 frame, pixel registration, point-cloud units and requested citation. Local raster URLs and header evidence are in §4.
- **[FRAME]:** LRO/LGCWG *A Standardized Lunar Coordinate System*, version 5, 2008-10-01, §§5–6: planetocentric/east-positive conventions, 1,737.4 km sphere, ME versus PA.
- **[LABEL]:** standard PDS LOLA `LDEM_80S_20M`, V2.0, created 2017-06-15: explicit planetocentric/east-positive DE421 ME projection and height/radius distinction. This standard PDS IMG's int16/0.5 m encoding is **not** the local PGDA float32 TIFF encoding.
- **[R21]:** Barker et al. (2021), uncertainty-method and interpolation/small-feature limitations; DOI 10.1016/j.pss.2020.105119. Relevant uncertainty passages were read, not independently numerically reproduced.
- **[P90] / [R23]:** regional product links/units, Table 1 extents, effective-resolution definition, interpolation/downsampling and uncertainty method; Barker et al. (2023), DOI 10.3847/PSJ/acf3e1.
- **[P104] / [Z] / [ZREADME]:** SfS product content; version, publication date, license, exact ZIP filenames/sizes and region bounding boxes. Archive landing page: <https://zenodo.org/records/17954508>.
- **[NAC] / [NACFP]:** actual stereo catalog properties, product/error definitions and footprint resources. Relative LE and LOLA RMS are different quantities.
- **[NACMAX] / [NACUNC] / [NACPSR] / [SHADOW]:** imagery acquisition/control, projection, nominal coverage, radiometric/display meaning and product citations, not per-point valid-pixel tests.
- **[GLD] / [KAGUYA]:** native latitude limits of the specific named terrain collections.
- **[JPL]:** topocentric coordinate conventions, lunar ME realization, quantity 4 apparent azimuth/elevation and AIRLESS meaning; no new ephemeris fixture was generated.
- **[PDSUSE] / [NASAUSE]:** reuse/citation guidance and limits, not a legal certification of every future derived asset.
