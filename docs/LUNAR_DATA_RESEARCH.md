# Lunar data research for CLPS Lunar Mission Browser

Research date: **2026-11-14**. Status: research and implementation proposals, not an adopted scope change or a scientific certification.

This dossier indexes official data providers and verified metadata needed to evaluate lunar terrain. It is a substantial, bounded source review, not a claim to have collected every document or every lunar dataset. The agreed first demo remains Sun/Earth directions at three predefined locations, without terrain. Its source of truth is `DECISIONES.md` D-014/D-015 and `docs/GUIA_PRIMERA_DEMO.md`. The dataset recommendations below apply only if the team later adopts terrain. The ephemeris section flags a terminology issue with the existing word "geometric."

Navigation: [terrain datasets](#2-dataset-selection-and-coverage), [height and frames](#3-height-frames-storage-and-missing-data), [terrain evidence](#5-terrain-evidence-register-and-remaining-checks), [ephemerides and calculations](#6-ephemerides-and-calculation-reference), [supporting documentation](#7-supporting-documentation-and-contextual-layers), [verification gates](#8-proposed-data-contract-and-verification-gates), and [remaining work](#9-completion-remaining-gaps-and-proposed-project-follow-up).

## 1. Read this before choosing an elevation map

The most useful first terrain experiment is a **small crop of the adjusted LOLA products**, with its count and uncertainty layers. The local PGDA products named Site06, DM2 and Site04 correspond to the three demo regions; this review read their actual TIFF metadata and checked projected bounding-box containment of the demo coordinates. This establishes geographic applicability, **not valid elevation at each pixel**. No terrain elevation was extracted, no full raster was downloaded, and no visibility calculation was validated.

A regional crop alone may omit distant obstacles. Any later terrain horizon needs an explicit surrounding-terrain extent and convergence check. The suggested combination is a local high-detail crop plus a larger adjusted LOLA background, retaining provenance and an explicit method for overlaps. This is an engineering proposal, not a conclusion that this combination is already accurate enough for navigation.

Keep five separate concepts in the interface and data model:

| Concept | Meaning for this project |
|---|---|
| Grid spacing | Distance between raster samples; not automatically the size of the smallest reliably resolved feature. |
| Measurement density | Actual observations supporting the grid; interpolated pixels are not independent laser measurements. |
| Height uncertainty | Error estimate with its stated statistic and scope; do not turn a regional median into a point guarantee. |
| Radial elevation | Height relative to a named reference sphere; different from radius measured from the Moon's center. |
| Observer height | Height of an instrument or viewpoint above the modeled surface; different from terrain elevation. |

These distinctions are directly relevant to the product documentation: PGDA supplies count/error/effective-resolution layers; PDS labels explicitly distinguish elevation, planetary radius and gravity-based topography. [Adjusted LOLA catalog](https://pgda.gsfc.nasa.gov/products/90), [LOLA sample label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl).

## 2. Dataset selection and coverage

### 2.1 Adjusted LOLA: broad south-polar coverage

NASA GSFC PGDA product 90 offers south-polar stereographic cloud-optimized GeoTIFFs in **MOON_ME/DE421**. Available examples include 80–90°S at 20 m/pixel and 83–90°S at 10 m/pixel. Associated layers describe elevation, counts, effective resolution, elevation error, slope and slope error; units vary by layer. Published download sizes include approximately 2.6 GB for the 20 m elevation raster and 4.8 GB for the 10 m elevation raster. The 80 m overview is about 181 MB. All three demo latitudes fall inside the advertised 80°S and 83°S bounds; this is a coverage inference, not a pixel-quality test. [Catalog and downloads](https://pgda.gsfc.nasa.gov/products/90).

Useful direct starting points, as linked by that catalog:

- [LDEM_80S_20MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF)
- [LDEM_83S_10MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_83S_10MPP_ADJ.TIF)

The first file's TIFF headers were independently read through bounded HTTP byte-range requests. Observed metadata: 30,400 × 30,400 samples; float32; DEFLATE compression; 512 × 512 storage tiles; 20 m sample spacing; top-left raster corner (-304,000, +304,000) m; NaN nodata; spherical semiaxes 1,737,400 m; south-polar origin -90°, central meridian 0°, unit scale and zero false offsets. The spatial rectangle therefore spans ±304,000 m in each axis. Embedded legacy `actual_range` strings retain different coordinates; use the geospatial transform rather than those history strings. The header identifies a Moon sphere but does not fully encode the DE421 frame realization: preserve the catalog's frame statement separately. [Inspected TIFF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF).

### 2.2 Adjusted LOLA: local 5 m products for the actual demo regions

PGDA product 78 identifies **Site06 = Nobile rim 1**, **DM2 = Nobile rim 2**, and **Site04 = Shackleton rim**. It offers elevation, laser-return counts, slope and uncertainties, adjusted point clouds, and model clones. Its 5 m grid should not be read as uniformly measured 5 m terrain: the description reports extensive interpolation, approximately 90% of pixels in the studied polar LDEMs. Reported regional error statistics are not substitutes for reading a point's error/count layers. [Product description](https://pgda.gsfc.nasa.gov/products/78).

The small [provider README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README) specifies projected X/Y in meters, MOON_ME of DE421, pixel registration, raster Z in meters, and interpolation filling empty surface pixels. A particularly important distinction: the accompanying binary XYZI point tables use **double-precision values with X/Y/Z in kilometers**, followed by the LOLA RDR identifier. Do not reuse a raster parser for those tables.

Actual elevation TIFF headers were inspected, without downloading raster arrays:

| Product and direct source | Dimensions | Projected outer bounds, meters | Metadata observed |
|---|---:|---|---|
| [Site06 elevation](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif) | 4,000 × 4,000 | X 74,000…94,000; Y 100,000…120,000 | 5 m; float32; uncompressed; NaN nodata |
| [DM2 elevation](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif) | 4,000 × 4,000 | X 147,000…167,000; Y 85,000…105,000 | 5 m; float32; uncompressed; NaN nodata |
| [Site04 elevation](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif) | 3,200 × 3,200 | X -9,000…7,000; Y -15,000…1,000 | 5 m; float32; uncompressed; NaN nodata |

All three headers specify a 1,737,400 m sphere and south-polar stereographic geometry with longitude origin 0°, latitude origin -90°, scale 1 and false offsets 0. Their generic/unknown datum text is insufficient to identify the lunar orientation by itself; the accompanying README supplies MOON_ME/DE421. Raw sample arrays alone would be 64 MB, 64 MB and 40.96 MB respectively, calculated from dimensions × four bytes; these are not measured total file sizes. [Site06 TIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif), [DM2 TIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif), [Site04 TIFF](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif).

Bounding-box check performed in this research:

| Demo point | Input latitude, east longitude | Calculated projected X/Y, m | Result |
|---|---|---|---|
| Nobile Rim 1 | -85.4381°, 37.36667° | 84,000.01 / 110,000.01 | Inside Site06 rectangle |
| Nobile Rim 2 | -83.954°, 58.82206° | 157,000.45 / 95,000.25 | Inside DM2 rectangle |
| Shackleton Rim | -89.7668°, -171.87° | -1,000.04 / -7,000.35 | Inside Site04 rectangle |

These are our calculations from the supplied project coordinates and inspected projection parameters, using spherical south-polar stereographic coordinates: `rho = 2 R tan(pi/4 + latitude/2)`, `X = rho sin(longitude)`, `Y = rho cos(longitude)`, with angles in radians. They verify rectangular containment only, assuming the coordinates use the product's frame; they do not prove finite pixel values, source density or uncertainty. For implementation, use an established projection library with explicit lunar radius rather than an Earth default; [PROJ's stereographic documentation](https://proj.org/en/stable/operations/projections/stere.html) documents the projection parameters and spherical radius option.

### 2.3 The 87–90°S 5 m mosaic is not a solution for both Nobile points

PGDA product 81 mosaics adjusted LOLA fields into a 5 m south-polar product covering **87–90°S**. It provides elevation, hillshade, slopes and counts; the elevation file is advertised at about 3.3 GB. Blending means count values in overlap regions can be fractional. Its frame is MOON_ME/DE421. The stated mosaic-to-individual-field RMS residual of 30–55 cm is a comparison statistic, not a universal surface accuracy. [Mosaic documentation](https://pgda.gsfc.nasa.gov/products/81).

Coverage inference from the declared latitude range: Shackleton Rim is eligible, while Nobile Rim 1 and Nobile Rim 2 are outside. Choosing this mosaic alone because it is called a south-pole map would leave two of the three demo points unsupported.

### 2.4 Standard archived LOLA LDEM: explicit, useful reference labels

The PDS archive provides gridded LOLA polar products, detached PDS3 labels and additional XML metadata. Two inspected examples:

| Property | LDEM_80S_20M | LDEM_875S_5M |
|---|---|---|
| Version / creation | V2.0 / 2017-06-15 | V2.0 / 2017-06-15 |
| Advertised latitude | 80–90°S | 87.5–90°S |
| Grid dimensions | 30,400 × 30,400 | 30,336 × 30,336 |
| Spacing, true at pole | 20 m | 5 m |
| Binary storage | Signed little-endian int16 | Signed little-endian int16 |
| Elevation decoding | `z_m = DN × 0.5` | `z_m = DN × 0.5` |
| Radius decoding | `r_m = z_m + 1737400` | Same |
| Geometry | Planetocentric, east-positive; polar stereographic; MOON_ME/DE421 | Same |

Sources: [20 m label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl), [5 m label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_875s_5m.lbl), [download directory](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/).

The labels describe interpolated ground tracks and input data through February 2017. Neither inspected label declares a missing-value constant; do not invent an int16 nodata sentinel. These are distinct products from the later PGDA adjusted TIFFs. A newer archive directory timestamp does not establish a newer elevation solution. Preserve the actual product version, creation date, label and checksum.

The 20 m archive binary is 1,848,320,000 bytes and the 5 m binary 1,840,545,792 bytes in the directory listing; downloaded size and decompressed working memory must be planned separately. [Archive listing](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/).

### 2.5 SLDEM2015: important elsewhere, excluded from these polar locations

SLDEM2015 combines LOLA and Kaguya Terrain Camera data **equatorward of ±60°**, at 512 pixels/degree, about 60 m at the equator. It cannot supply any of the three demo points. An inspected FLOAT tile is 15,360 × 23,040 samples, 32-bit little-endian real, simple cylindrical, MOON_ME/DE421, east-positive, pixel-registered. Crucially its declared unit is **kilometers**, scale 1, sphere radius 1,737.4 km. Therefore normalize elevation with `z_m = DN × 1000`; radius in meters is `(DN + 1737.4) × 1000`. The label contains a radius-comment saying “meters” beside kilometer quantities; retain this inconsistency in ingestion notes and follow the explicit unit fields with a sanity check. [Actual tile label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/tiles/float_img/sldem2015_512_00n_30n_000_045_float.lbl).

Access routes: [SLDEM archive](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/), [FLOAT tile listing](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/tiles/float_img/). The inspected tile is about 1.416 GB as listed. Do not assume the JP2 encoding shares the FLOAT tile's scale or datatype.

### 2.6 LROC NAC stereo DTMs: local high detail, exact footprint required

LROC's stereo DTMs are regional products, with accompanying confidence maps, orthophotos and product-specific README files. A stereo image pair is not automatically an available processed DTM. [LROC product-method description](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01).

Two relevant-sounding products were checked and **do not cover the corresponding selected demo points**:

| Product | Catalog properties | Coverage implication |
|---|---|---|
| [NAC_DTM_NOBILE01](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01) | 3 m/pixel; lat -85.50…-84.07°; lon 23.95…36.17°E; relative LE 2.96; LOLA RMS 0.94 | Nobile 1 is east of the maximum longitude; Nobile 2 is also outside. |
| [NAC_DTM_SHACKRDGE02](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02) | 3.5 m/pixel; lat -89.63…-89.37°; lon 209.81…239.10°E; relative LE 3.41; LOLA RMS 1.06 | Shackleton demo point is -89.7668°, 188.13°E and outside. |

Those are bounding-box exclusions, not a search proving no other NAC DTM covers these points. The [current NAC DTM footprint collection](https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS) reports coverage through 2026-09-15 and offers both longitude domains. It includes pixel scale, relative linear error at 90% confidence, LOLA residual statistics, registration offsets and jitter flags. Use its polygons for the next exact search and then test the valid raster mask. The two catalog error figures above must be interpreted through those definitions and each product README, not relabeled as guaranteed absolute accuracy.

### 2.7 LROC WAC GLD100: broad context, not native polar stereo terrain

Native GLD100 stereo coverage stops at **79°N/S**. It has a 100 m raster spacing, while its own documentation estimates approximately 300 m effective resolution and 10–20 m elevation accuracy. Its lower-resolution global products fill the polar gap with LOLA; that does not make the pole a WAC stereo measurement. For products using polar fill, preserve both WAC and LOLA attribution. The original 100 m products are divided into ten tiles; other resolutions and projections are available. [GLD100 documentation and download selector](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100).

For this project, GLD100 is a possible context/globe source, not the preferred polar terrain source. A rendered color elevation map or hillshade is not a numeric DEM.

### 2.8 Kaguya products: distinguish imaging, native JAXA DTMs and USGS reprocessing

JAXA's official mission archive lists Terrain Camera derived products, including seamless DTM products and SLDEM2013; these names are not interchangeable with SLDEM2015. [JAXA DARTS Kaguya catalog](https://darts.isas.jaxa.jp/missions/kaguya), [PDS ODE derived-product guide](https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/KAGUYA%20%28SELENE%29/TC/Derived_Data.htm). Native JAXA individual tile metadata and exact coverage were not inspected in this review.

The USGS Kaguya TC DTM collection documents more than 127,000 local DTMs spanning **70°N to 70°S**, with a version 2 release dated 2026-08-12. It offers analysis-ready elevation and ancillary data through STAC/data-browser access. Its elevations are heights above a sphere, not geoid-adjusted heights. That collection does not cover the three demo sites. Its 7–37 m grid spacings must not be confused with the source camera sampling. [USGS collection documentation](https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/).

### 2.9 Newer shape-from-shading products: promising and explicitly scoped

PGDA product 104 enhances LOLA with LROC NAC imagery using shape from shading. It describes 5 m products for the 13 original 2022 Artemis candidate regions, including image coverage, illumination-direction counts, input-resolution and elevation-difference layers. Photometric detail depends on usable illumination and images; the nominal 5 m grid does not demonstrate reliable new detail everywhere. [NASA product description](https://pgda.gsfc.nasa.gov/products/104).

The author-deposited [Zenodo archive](https://zenodo.org/records/17954508), linked by NASA, identifies version 1.0.0 and lists 26.6 GB of zipped regional products. Nobile Rim 1 and Nobile Rim 2 archives are about 2.0 GB and 1.8 GB respectively. It specifies compressed 32-bit GeoTIFFs, 5 m cells and Moon (2015) south-polar stereographic projection. The small [region README](https://zenodo.org/records/17954508/files/README.md?download=1) gives bounding boxes containing both project Nobile coordinates. This confirms box containment, not pixel validity. Shackleton Rim's longitude -171.87° is outside the listed overall longitude minimum -171.469234°; do not substitute the product named Peak Near Shackleton for the selected rim point.

The [record API](https://zenodo.org/api/records/17954508) explicitly returned `cc-by-4.0` in license metadata. Raster headers, internal masks and sample elevations were not inspected. Before use, retain the full product citation, version DOI and both underlying LOLA and NAC provenance. This is a candidate for later comparison, not the first required dependency.

## 3. Height, frames, storage and missing data

### 3.1 Do not confuse radial elevation with radius or geoid height

For the inspected standard LOLA products, elevation is radius minus the 1,737,400 m reference sphere. Adding that sphere once produces radius; adding it to an already absolute radius is an error. Gravity-based topography instead subtracts a gravity equipotential surface. The [LOLA RDR specification](https://science.nasa.gov/wp-content/uploads/2024/01/lola-rdrsis.pdf) documents these distinct quantities. Do not describe lunar elevation as terrestrial “height above sea level.”

A future terrain-aware observer position should retain `referenceRadiusM`, `terrainElevationM` and `observerHeightAboveTerrainM` separately. A product's map-projection sphere alone does not conclusively document its vertical datum: confirm vertical semantics in its label/README. The current demo's `h=0` is a geometric assumption, not an extracted ground height.

### 3.2 MOON_ME and MOON_PA are materially different

PGDA also distributes a **MOON_PA** shape dataset, specifically transformed from other terrain products. Its documentation states that the ME/PA rotation corresponds to approximately 875 m along a lunar great circle, and gives SPICE-based transformations. These frames cannot be silently combined at meter-scale accuracy. A CRS label such as “Moon 2015” does not itself select a DE421 ME orientation. [PGDA MOON_PA documentation](https://pgda.gsfc.nasa.gov/products/95).

Proposed contract: preserve body, frame realization, ephemeris/kernel version where relevant, coordinate type, longitude direction/domain, reference sphere, projection, epoch requirements and the transform used. Normalize west longitudes carefully: the project's Shackleton longitude -171.87° equals 188.13° east in a 0–360° representation; this arithmetic is not a frame transformation.

### 3.3 Product-specific decoding and validity

Do not apply the half-meter integer rule to every file with LOLA in its name. The inspected PDS IMG labels, SLDEM FLOAT label and PGDA float TIFF headers demonstrate different encodings. Neither missing observations nor interpolation uncertainty is represented by elevation zero. NaN in the inspected TIFFs means missing data; a count of zero means no laser return in that pixel, which can coexist with an interpolated elevation. Count, terrain validity and confidence are separate fields. [Local product definitions](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README).

Implementation proposals:

1. Decode datatype, byte order, scale and offset from the chosen product metadata.
2. Preserve nodata before unit conversion, resampling or mesh generation.
3. Use the affine geotransform and pixel-center convention explicitly. Pixel-corner coordinates are not sample centers.
4. Clip and inspect a small crop offline; export a reduced browser asset with a provenance sidecar.
5. Keep original numeric terrain separate from any visually exaggerated mesh.
6. Do not blend heights across differing frames or reference radii until they are reconciled.
7. Include a validity mask in derived assets; never bridge missing terrain silently in a visibility calculation.

## 4. Access, provenance and reuse

Public HTTP access to the pages and small metadata is not a performance guarantee for an application. The PGDA 20 m file accepted byte-range requests during this review; that confirms bounded metadata access, not a deployed browser CORS test. Site06, Site04 and DM2 did too. The prototype should ingest/crop in a controlled preparation step rather than download multi-gigabyte rasters on every user interaction.

The PDS Geosciences FAQ describes archived datasets as public-domain data and requests appropriate citation. It also recommends checksum comparison after transfer. [PDS access/use FAQ](https://pds-geosciences.wustl.edu/faq.html). This does not assign the same license to all third-party material encountered through NASA or to every software library; retain per-product attribution and available license records. PGDA pages request their associated scientific citations; the SfS archive separately declares CC BY 4.0.

Proposed provenance record for every ingested terrain asset:

```text
provider / collection / product ID / product version
source URL and DOI / retrieval date / source checksum
source label or README / source license and citation
frame realization / projection parameters / reference radius
latitude convention / longitude direction and domain
sample type / byte order / units / scale / offset / nodata
grid size / affine transform / pixel registration
coverage footprint / valid-pixel mask / quality layers
processing tool and version / crop bounds / resampling method
derived checksum / source-to-derived transformation history
known limitations / validation evidence / reviewer
```

## 5. Terrain evidence register and remaining checks

| Source | What was checked on 2026-11-14 | Access / limits |
|---|---|---|
| [PGDA 90](https://pgda.gsfc.nasa.gov/products/90) | Catalog; 20 m TIFF header | Page read; bounded HTTP ranges succeeded; raster samples not read |
| [PGDA 78](https://pgda.gsfc.nasa.gov/products/78) and [README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README) | Names, units, frame; three local TIFF headers | README read through Python after browser content-type failure; three box-containment calculations performed |
| [PGDA 81](https://pgda.gsfc.nasa.gov/products/81) | Mosaic coverage and limitations | Catalog only |
| [PDS polar archive](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/) | Two actual PDS3 labels and file listing | Web succeeded; Python certificate verification failed for this host; no security verification disabled; XML browser parsing unsupported |
| [SLDEM2015](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/) | Actual FLOAT tile label and listing | No raster download; encoding discrepancy documented |
| [NAC NOBILE01](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01), [SHACKRDGE02](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02), [footprints](https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS) | Catalog bounds, metadata and footprint availability | Two exclusions proved; all-footprint intersection not run |
| [GLD100](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100) | Coverage, spacing versus resolution, polar fill | Catalog read; supplemental README redirect failed in browser |
| [USGS Kaguya](https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/) / [JAXA archive](https://darts.isas.jaxa.jp/missions/kaguya) | Collection descriptions | Individual source tiles not checked |
| [PGDA 104](https://pgda.gsfc.nasa.gov/products/104) / [Zenodo](https://zenodo.org/records/17954508) | Description, region README, archive sizes, license API | Regional ZIPs and TIFF pixels not downloaded |
| [PGDA 95](https://pgda.gsfc.nasa.gov/products/95) | ME/PA distinction and transformed-product documentation | No frame transform executed |

Before adopting terrain, remaining work is concrete:

- Choose an exact product/version for each point and the surrounding horizon region.
- Confirm frame compatibility of the project coordinates and ephemeris inputs.
- Sample the selected elevations and quality layers with a standard geospatial reader; verify nodata and units against known control data.
- Validate crop registration, finite values, local uncertainty and continuity at any dataset boundary.
- Test real download/CORS/cache behavior for the proposed deployment architecture.
- Define terrain-horizon, observer-height, disk visibility and uncertainty methods, and validate them independently before enabling visibility claims.
- Have Diego and the integrator review the evidence and limitations. No update to `ESTADO.md` or `DECISIONES.md` is implied by this research.


## 6. Ephemerides and calculation reference

This section records documentation and proposed methods. It does not change the accepted first-demo scope or certify numerical results.

### Horizons request contract

[The official Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html) describes API version 1.3 (June 2025). The following is a documentation-checked request template, **not a successfully executed fixture**:

~~~ts
const params = new URLSearchParams({
  format: "json",
  COMMAND: "'10'", // Use '399' for Earth.
  OBJ_DATA: "'YES'",
  MAKE_EPHEM: "'YES'",
  EPHEM_TYPE: "'OBSERVER'",
  CENTER: "'coord@301'",
  COORD_TYPE: "'GEODETIC'",
  SITE_COORD: "'37.36667,-85.4381,0'",
  TLIST: "'2026-11-14 12:00:00'",
  TLIST_TYPE: "'CAL'",
  TIME_TYPE: "'UT'",
  QUANTITIES: "'4,13,20'",
  APPARENT: "'AIRLESS'",
  RANGE_UNITS: "'KM'",
  CSV_FORMAT: "'YES'",
});
const url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + params;
~~~

For a time series, replace the discrete-time fields with START_TIME, STOP_TIME, and STEP_SIZE. RANGE_UNITS applies to observer range; OUT_UNITS applies to vector output. JSON wraps a text ephemeris: an HTTP success alone is not a validated measurement. The adapter needs response version, errors, header, column labels, units, and data rows. See the [API parameter and response definitions](https://ssd-api.jpl.nasa.gov/doc/horizons.html).

The [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html) establishes these scientific conventions:

- Quantity 4 is **apparent** azimuth/elevation, including astronomical corrections. AIRLESS removes atmospheric refraction; it does not mean geometric. Azimuth increases north–east–south–west; elevation uses the local horizontal plane.
- Quantity 13 is full angular diameter in arcseconds. Quantity 20 gives observer range and range rate.
- Lunar site input is east-positive longitude, north-positive latitude, and altitude in kilometres above the reference surface. Altitude zero is not ground level. Longitude -171.87 degrees equals 188.13 degrees east.
- The modern lunar orientation uses DE440 PA rotated into standard DE421 ME. Read the response header.
- UT means UTC for the project date; unknown future leap seconds limit future time conversion.
- Truly geometric vectors require VEC_CORR=NONE and a consistent transformation to the observer frame.

**Review finding:** the existing demo guide's word “geometric” needs review if its values come from quantity 4. Suggested user-facing wording: “Apparent position without atmospheric refraction; terrain not included.” This report does not edit existing agreements or UI strings.

### API access and reproducibility

[JPL's fair-use policy](https://ssd-api.jpl.nasa.gov/) requires serial requests, reasonable frequency, caching where practical, error backoff, and an application-specific User-Agent with product, version, and contact. It prohibits embedding the APIs in websites under NASA CORS policy and gives no fixed requests-per-second entitlement.

Implementation proposal: use a backend or prepared data, serialize Sun/Earth requests, debounce UI updates, and cache normalized inputs. A server route addresses browser access architecture; it is not a blanket exemption from the service policy. Preserve request parameters, raw response, retrieval UTC, API version, response model/header, and cache status. A failed fetch must remain an error, never a synthetic zero. Neither the browser fetch nor the researcher's HTTP attempt yielded a validated numeric fixture in this investigation.

### SPICE for a controlled calculation pipeline

The current [NAIF lunar frame kernel](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf), created April 16, 2025, pairs with moon_pa_de440_200625.bpc. It maps MOON_ME to MOON_ME_DE440_ME421 and MOON_PA to MOON_PA_DE440. These are not interchangeable labels. Its documented PA/ME offset is about 875 m on the surface; IAU_MOON is another realization. A map projection change alone does not perform this frame transformation.

A reproducible bundle records exact filenames, versions, checksums, load order, and date coverage for:

| Kernel | Purpose |
|---|---|
| SPK | Positions of Sun, Earth, and Moon |
| LSK | UTC and ephemeris-time conversion |
| Text PCK | Reference-body radii and constants |
| Lunar binary PCK | Lunar orientation |
| Matching FK | Named lunar reference-frame transformations |
| DSK, if used | Actual terrain surface model |

[NAIF azlcpo dependencies](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html) describe the required position, orientation, and frame data. [str2et](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/str2et_c.html) converts an explicitly labelled time to TDB seconds past J2000 with the appropriate leap-second kernel. No kernels were installed or executed for this report.

| Official routine | Useful operation | Important boundary |
|---|---|---|
| [azlcpo](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html) | Azimuth/elevation for an observer fixed in a body frame | ELLIPSOID local normal; no terrain horizon. azccw=false, elplsz=true gives the intended direction convention. NONE is geometric; CN+S adds reception corrections. |
| [ilumin](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/ilumin_c.html) | Phase, incidence, and emission angles | An angle alone does not establish absence of distant terrain shadow. |
| [illumf](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/illumf_c.html) | Surface angles and visibility/illumination flags with DSK support | The lit flag tests the source centre, not visible solar-disk fraction. |
| [sincpt](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/sincpt_c.html) and [dskx02](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/dskx02_c.html) | Ray/surface intersection | Handle self-intersection, finite ray length, mesh coverage, and numerical tolerance. |
| [occult](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/occult_c.html) | Body occultation classification | Supports ellipsoid combinations and DSK plus point; it is not a ready-made extended solar-disk/terrain integration function. |

[DSK required reading](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/dsk.html) is the reference for surface segments, coverage, and tolerances. No intersection through an uncovered region is not proof of clear sky.

### How terrain height becomes a horizon

The established approach is to derive a horizon mask from terrain and compare it with Sun/Earth directions through time. [Bryant's JPL paper abstract](https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html) documents this approach using radar topography; the abstract was inspected, not the full paper.

The equations below are an explicit geometric derivation for a **spherical datum**, offered as an implementation proposal. They are not a copied, validated NASA implementation. [NAIF latrec](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/latrec_c.html) provides the underlying latitude/longitude/radius convention.

Use radians and one consistent length unit. For east longitude lambda, latitude phi, datum radius R, and terrain elevation z:

~~~text
u = (cos(phi) cos(lambda), cos(phi) sin(lambda), sin(phi))
p_ground = (R + z) u
p_observer = p_ground + h_AGL u

E = (-sin(lambda), cos(lambda), 0)
N = (-sin(phi) cos(lambda), -sin(phi) sin(lambda), cos(phi))
U = u

d_i = p_terrain_i - p_observer
A_i = atan2(dot(d_i, E), dot(d_i, N))
e_i = atan2(dot(d_i, U), hypot(dot(d_i, E), dot(d_i, N)))

H(A) = maximum terrain elevation angle along azimuth A
clearance(t) = sourceElevation(t) - H(sourceAzimuth(t))
~~~

Here h_AGL is explicitly radial height above ground. A mast along a terrain normal needs a different displacement. The spherical horizontal basis is separate from the terrain normal used for panel incidence. The exact pole requires an explicitly chosen azimuth convention.

These equations include lunar curvature through body-centred coordinates. Do not apply another curvature subtraction. A single nearby tile is insufficient unless a bound proves more distant terrain cannot raise the horizon. Proposed implementation: detailed local terrain plus a consistent coarser regional continuation, with explicit unknown sectors when coverage is insufficient.

A finite set of DEM samples only approximates H. Angular binning and interpolation can miss a narrow ridge or invent a ridge between rays. Record distance limit, radial sampling, azimuth step, raster interpolation, mesh construction, and missing-data treatment. Compare increasing spatial extents and finer sampling before fixing them.

A synthetic cross-check follows directly from a smooth sphere: at radial observer height h, horizon elevation is -acos(R / (R + h)). An elevated observer can have a negative physical horizon. Clamping H to zero would suppress this effect.

### Partial disks, shadow, and eclipses

The solar disk has finite angular extent, relevant near polar horizons; see [NASA's lunar-environment presentation](https://ntrs.nasa.gov/api/citations/20230000854/downloads/Minow_SciTech_2023%20-%20presentation%20-%20final.pdf), slide 11.

For an approximately flat angular horizon, define c as source-centre clearance and rho as angular radius. The derived classification is:

- c < -rho: disk hidden.
- c > rho: disk fully above that local horizon.
- Between the limits: partial exposure.
- Near either limit within model uncertainty: indeterminate.

If an input diameter is in arcseconds, rho in degrees equals diameter / 7200. This is a unit conversion, not a visibility calculation. A rugged horizon requires rays or integration across the full disk in both angular dimensions. Centre-only visibility must be labelled as such.

Terrain shadow and Earth occulting the Sun are distinct effects. A claim of solar exposure over arbitrary dates also needs an eclipse model, or a stated eclipse exclusion. Do not interpret “Sun above the terrain horizon” as proof that solar flux reaches the panel.

### Time windows, irradiance, and radio links

These are proposed output definitions, not results obtained for the three sites:

| Quantity | Additional information needed |
|---|---|
| Sun/Earth direction at one instant | Site, height, epoch, frame, ephemeris, correction convention |
| Visible disk fraction | Terrain horizon and angular disk model |
| Total exposed hours | Explicit interval, disk threshold, sample weights, coverage |
| Longest darkness or Earth outage | Continuous windows and refined transition times |
| Simultaneous Sun/Earth visibility | Both models on the same time axis |
| Incident direct irradiance | Solar irradiance at distance, disk exposure, panel orientation |
| Electrical power/energy | Panel area, efficiency/temperature model, degradation, load and storage assumptions |
| Direct link to a named Earth station | Station coordinates/orientation over time, both-end masks, radio/link budget and availability |

For a small uniform disk, an idealized derived relation is:

~~~text
directIrradiance_W_m2 ≈ solarIrradianceAtDistance_W_m2
                       * visibleDiskFraction
                       * max(0, dot(panelNormal, sunDirection))
~~~

The vectors must be unit vectors in the same frame. This approximation omits reflected light and treats direction across the disk as constant. It yields irradiance, not watts of electricity or guaranteed energy supply.

The [HLS Lunar Thermal Analysis Guidebook](https://ntrs.nasa.gov/citations/20210010030) provides engineering context for lunar thermal modelling. Its catalogue identifies the January 2021 baseline; this report does not claim it is the latest requirements baseline. [NASA's lunar surface propagation work](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/) explains why terrain reflection and interference matter for radio. The [DSN Telecommunications Link Design Handbook 810-005](https://deepspace.jpl.nasa.gov/dsndocs/810-005/) is the primary entry point for station properties and link interfaces; each module has its own revision.

For duration metrics, integrate using actual time intervals, refine threshold crossings, and test smaller time steps. Missing data must contribute to an “unknown duration” field rather than dark or visible time. A high annual average does not establish a short maximum outage.

## 7. Supporting documentation and contextual layers

### Main NASA reference book

[Moon to Mars Lunar Surface Data Book, M2M-30044 baseline, March 18, 2025](https://ntrs.nasa.gov/citations/20250002845), is a 93-page reference. Its [PDF](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf) provides useful navigation:

- Sections 3–4: source missions, elevation, imagery, slope, roughness, and other data.
- Sections 5–6: illumination modelling, assumptions, terrain and power context.
- Table A2.1-1, page 75: the three project reference-point coordinates.
- Appendix C: references and data-source links.
- Appendix E: continuous darkness.
- Appendix F: reference frames.

The listed locations are reference points, not approved landing sites. This report confirmed the three coordinates against the table. Use the book as an index to the owning dataset documentation, not as a substitute for individual raster labels.

### Precomputed illumination and Earth visibility

[NASA PGDA product 69](https://pgda.gsfc.nasa.gov/products/69) supplies solar illumination, permanent-shadow, Earth-visibility, and sky-visibility products, including IMG, GeoTIFF, and COG options. Its examples average hourly samples across about 18.6 years. Earth “visible” means any part of its disk is unobscured. That differs from either Earth-centre visibility or visibility of a particular DSN station.

These layers are useful context and comparison evidence. They cannot answer an arbitrary selected date, prove uninterrupted power, or replace a time series for the selected mast height. Their source labels define scaling and units. The page warns that COG overviews average values; a zoomed-out view is not the original quantitative grid.

### Thermal observations

[PDS Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) provides raw, calibrated, and derived thermal products, including polar products. Its current page flags missing brightness-temperature values represented by -9999 in affected RDR data. Do not silently interpret these as temperatures.

[The instrument team's data page](https://www.diviner.ucla.edu/data) supplies archive specifications, field definitions, and global/polar temperature maps; it identifies RDR reprocessing version 3.1 and references the corresponding publications. A map statistic or historical observation does not predict hardware temperature at an arbitrary date. Thermal products are optional context beyond the current directional demo.

### Map display and GIS documentation

[Moon Trek WMTS documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html) describes image-tile requests and GetCapabilities. Tile coverage and formats come from each service's capabilities. These rendered imagery services are suitable for a basemap; they do not establish that RGB values encode recoverable elevation.

[GDAL gdalinfo](https://gdal.org/en/stable/programs/gdalinfo.html) documents inspection of dimensions, CRS, geotransform, bands, scale, offset, and missing-data metadata. [The GeoTIFF driver](https://gdal.org/en/stable/drivers/raster/gtiff.html) covers TIFF reading and georeferencing. [GDAL virtual filesystems](https://gdal.org/en/stable/user/virtual_file_systems.html) documents remote /vsicurl/ reads.

Proposed first inspection, after choosing an exact linked raster:

~~~text
gdalinfo -json /vsicurl/<exact-verified-raster-url>
~~~

This is a template, not an executed command. GDAL was not found on the research shell. Avoid statistics/checksum options on a huge remote image during an initial metadata inspection because they can require substantial data reads. Remote-window access still depends on the actual server and client; COG format alone does not prove browser CORS or deployment compatibility.

## 8. Proposed data contract and verification gates

The following is project-specific design advice inferred from the research. No application code or interfaces were changed.

A minimum provenance record for each terrain cutout or derived horizon needs:

- Dataset/product ID, DOI or catalogue URL, version, source-file URL, retrieval UTC, checksum, and citation/reuse terms.
- Body-fixed frame and realization, datum/radius, latitude and longitude convention, map projection, axis order, bounds, and pixel registration.
- Sample type, endianness if applicable, units, scale/offset, missing-data value/mask, interpolation history, pixel size, and available error/count/effective-resolution layers.
- Site coordinates, elevation datum, sampling method, observer height and direction, terrain extent, and known coverage gaps.
- Horizon-generation algorithm/version, angular and radial sampling, curvature model, disk model, ephemeris/correction convention, and time sampling.
- A distinct status for catalogue-described coverage, raster-inspected coverage, and validated calculations.

Before a terrain result is presented as computed, the team needs evidence for these checks:

1. Decode a selected pixel with its actual label. Confirm elevation versus radius and metres versus kilometres.
2. Project each exact site into the raster and inspect its valid-data mask. A familiar place name or bounding rectangle is insufficient.
3. Match the DEM and ephemeris reference frames. Check longitude wrap and cardinal directions.
4. Verify the synthetic sphere horizon, a known ridge obstruction, and the effect of observer height.
5. Refine azimuth sampling, terrain extent, and time steps until the chosen outputs converge within an explicitly agreed tolerance.
6. Exercise centre, upper-limb, partial-disk, and full-disk transitions; keep missing terrain indeterminate.
7. Compare an independent, convention-matched ephemeris calculation or saved authoritative response. Do not call a disagreement a software defect until frames, time scales, height, and corrections match.
8. Check that the 3D display and numerical panel share the same inputs. A visually exaggerated terrain mesh must not feed physical calculations.

No numeric tolerance is prescribed here: it depends on the chosen data quality and what the team intends to claim.

## 9. Completion, remaining gaps, and proposed project follow-up

Research completed on 2026-11-14. This is a broad, source-based inventory of data families needed for this product, not a claim to enumerate every lunar publication or archive file.

**Observed:** official catalogue/document access, selected product metadata/labels, dataset coverage comparisons, documented API parameters and method definitions. The four PGDA TIFF headers were read using an ephemeral Python standard-library script with bounded HTTP ranges (maximum 32,768 bytes per read), requiring HTTP 206 and retaining TLS verification. No pixel arrays were read. The spherical projection calculations were repeated locally and agreed to the reported centimetre rounding; that is not an independent GIS-library validation. **Not performed:** bulk raster ingestion, elevations sampled at the three sites, terrain-horizon computation, end-to-end Horizons/SPICE agreement, power or radio simulation, or deployment checks.

The [official challenge page](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) failed retrieval with HTTP 502 during this research. Its current Resources tab could not be verified. The local challenge guide and confirmed decisions supplied the project scope; no new event requirements are asserted.

Only this research Markdown file was created. Existing application work, project decisions, and status documents were left untouched. During the initial research phase, the working tree contained ongoing work on feat/app-skeleton, so no branch switch, commit, push, or publication was performed. Publication of this report was subsequently requested separately by the integrator.

Suggested follow-up for the integrator and Diego:

- Add a link to this report in ESTADO.md and record “terrain data/method research available; implementation and numeric validation pending.”
- Review the apparent-versus-geometric terminology in the demo guide and results contract.
- If terrain enters the product scope, decide the first dataset, observer-height definition, computation location, disk/visibility semantics, and acceptable uncertainty in DECISIONES.md.
- Start with one site and one reproducible terrain/ephemeris case, then expand to all three. Keep the current no-terrain demo valid while that work is evaluated.

These are proposals, not new confirmed decisions.
