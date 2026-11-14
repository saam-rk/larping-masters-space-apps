# Historic lunar landings: evidence and 3D reconstruction dossier

Research dates: **2026-11-14–2026-11-15**. Repository baseline: `main` at `0623174`.
Working branch: `docs/historic-lunar-landings`.

## Purpose and status

Research for the requested historical section of CLPS Lunar Mission Browser: selectable historical locations, event dates, documented terrain, spacecraft and surface activities. This document supplies evidence and implementation considerations; it does not implement the section or approve its final interface or scientific method.

Coverage: all six Apollo landing sites; Soviet and US robotic precursors; selected Chinese, Indian, Japanese and commercial milestones through 2025. This is a curated research catalogue, not an exhaustive inventory of every lunar impact or every mission through the research date. Sources are NASA/NSSDCA, the LROC instrument archive, mission agencies and original research. Links were consulted on the research date; access limitations are recorded below. Catalogue values are not independently remeasured coordinates.

**Best-supported first reconstruction: Apollo 11.** Its landing coordinates, chronology, terrain, equipment mapping and astronaut routes can be connected to specific published products. Apollo 12 provides a compelling second scene containing an earlier robot, Surveyor 3. Apollo 15 and 17 add rover traverses and distinctive large-scale terrain. These are research recommendations, not team decisions.

## 1. Define the event before placing the marker

| Event | Historical meaning | Appropriate representation |
|---|---|---|
| Luna 2 | First spacecraft to reach another celestial body's surface, by impact | Approximate impact area; no intact landed vehicle |
| Luna 9 | First successful survivable lunar landing | Approximate landing region and a separately labelled reconstructed capsule |
| Surveyor 1 | First US successful soft landing | Robotic lander and its photographed surroundings |
| Apollo 11 touchdown | First human lunar landing | Complete lunar module at touchdown |
| Apollo 11 first step | First human step onto the lunar surface, hours after touchdown | Astronaut at the ladder, with event-specific time |
| Luna 16 | First robotic return of lunar samples | Sampling/return mission; distinguish lunar landing from Earth return |
| Luna 17 / Lunokhod 1 | First successful robotic lunar rover | Separate lander location, traverse and rover endpoint |
| Apollo 15 | First Apollo mission using a lunar rover | Mission-specific rover, terrain and traverse |
| Apollo 17 | Final Apollo lunar landing; scientist-astronaut on the surface | Taurus-Littrow exploration, not a generic Apollo 11 scene |
| Chang'e 4 | First soft landing and surface exploration on the lunar far side | Lander, rover and relay context |

Evidence: [NASA Luna 2 history](https://www.nasa.gov/history/60-years-ago-luna-2-makes-impact-in-moon-race/), [NASA robotic exploration history](https://appel.nasa.gov/wp-content/uploads/2013/04/643333main_huntress_presentation.pdf), [NSSDCA Surveyor programme](https://nssdc.gsfc.nasa.gov/planetary/lunar/surveyor.html), [NASA Moon missions](https://science.nasa.gov/moon/missions/), [LROC Luna 17 exhibit](https://lroc.im-ldi.com/visit/exhibits/1/gallery/10), [NASA Apollo 15](https://www.nasa.gov/mission/apollo-15/), [NASA Apollo 17](https://www.nasa.gov/mission/apollo-17/), and [Chinese National Space Science Data Center Chang'e 4 record](https://vsso.nssdc.ac.cn/mobile/nssdc_en/html/task/change4.html).

Do not describe Surveyor 1 as the world's first survivable lunar landing: some NASA prose uses “true soft-landing” to distinguish its propulsion/landing architecture from the Soviet capsule. The geographic catalogue should use the unambiguous national distinction above. Apollo 8 and 10 did not land; Apollo 13's intended Fra Mauro site is not an achieved landing.

## 2. Coordinates and time conventions

- Latitude is in decimal degrees, north positive. Longitude is in decimal degrees, east positive; negative values denote west. The tables use the app's `(-180, 180]` longitude convention. Subtract 360 from a published east longitude greater than 180; preserve the original value in provenance.
- Apollo coordinates below locate the **lunar module**, not a retroreflector, experiment station, target ellipse centre or first footprint. NSSDCA identifies their frame as **planetocentric Mean Earth/Polar Axis, DE421**, derived from LRO images (Wagner et al., 2017). See [coordinate source](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html), updated 2017-03-06.
- NSSDCA's [spacecraft/impact catalogue](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html), including its notes, identifies DE421 mean-Earth/polar-axis coordinates. Approximate historical entries still lack an actual image-based surveyed position. Decimal digits are not an uncertainty covariance.
- No table below supplies a validated surface altitude. Keep it `null` until a compatible elevation product and datum are inspected. Zero can only mean an explicitly selected reference-sphere approximation.
- Historical tables use UT or GMT. Preserve that original label alongside the calendar value and chosen normalization. Do not invent seconds when only a day or minute is supported.
- [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html), version 4.98e, sections “Specification of Time” and “Universal Time”: Horizons UT represents UT1 before 1962 and UTC for later epochs. A 1959 event therefore needs explicit time-scale treatment rather than blindly appending `Z`.

## 3. Apollo: six directly usable geographic anchors

All coordinate pairs in this table come from the [NSSDCA LRO-based coordinate table](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html). Site names and scientific totals below come from the separate [Apollo landings summary](https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html). Times here deliberately follow one source: NASA SP-4029's [LM Lunar Landing table, GMT Date/GMT Time rows](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-27_LM_Lunar_Landing.htm). See discrepancies in section 8 before using them for synchronized animation.

| ID proposal | Landing site | Latitude °N | Longitude °E | Landing calendar time, GMT as published |
|---|---|---:|---:|---|
| `apollo-11` | Mare Tranquillitatis | 0.67416 | 23.47314 | 1969-07-20 20:17:39 |
| `apollo-12` | Oceanus Procellarum | -3.0128 | -23.4219 | 1969-11-19 06:54:36 |
| `apollo-14` | Fra Mauro | -3.64589 | -17.47194 | 1971-02-05 09:18:13 |
| `apollo-15` | Hadley-Apennine / Hadley Rille | 26.13239 | 3.63330 | 1971-07-30 22:16:29 |
| `apollo-16` | Descartes | -8.9734 | 15.5011 | 1972-04-21 02:23:35 |
| `apollo-17` | Taurus-Littrow | 20.1911 | 30.7723 | 1972-12-11 19:54:58 |

### People and reconstruction focus

| Mission | Surface crew | Crew member remaining in lunar orbit | Scene focus and source |
|---|---|---|---|
| Apollo 11 | Neil Armstrong; Edwin “Buzz” Aldrin | Michael Collins | Touchdown and first step are separate scenes. [NSSDCA mission record](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html) |
| Apollo 12 | Charles “Pete” Conrad; Alan Bean | Richard Gordon | Pair the landing site with Surveyor 3. [NSSDCA mission record](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo12info.html) |
| Apollo 14 | Alan Shepard; Edgar Mitchell | Stuart Roosa | Fra Mauro surface exploration. [NSSDCA mission record](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo14info.html) |
| Apollo 15 | David Scott; James Irwin | Alfred Worden | First Apollo rover and Hadley terrain. [NASA mission record](https://www.nasa.gov/mission/apollo-15/) |
| Apollo 16 | John Young; Charles Duke | Thomas Mattingly | Descartes highland terrain. [NSSDCA mission record](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo16info.html) |
| Apollo 17 | Eugene Cernan; Harrison Schmitt | Ronald Evans | Taurus-Littrow; Schmitt was a geologist. [NASA mission record](https://www.nasa.gov/mission/apollo-17/) |

The orbiting crew member must not be placed on the surface. A modern view should not show the complete Apollo lunar module as though its ascent stage remained attached. A historical view needs a selected phase: touchdown, EVA, ascent, or post-departure. Photograph date and mission time determine which equipment and tracks can exist in a scene.

### Quantitative context for scene extent and educational cards

These are the values in the [NSSDCA summary](https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html), not measurements made by this app. Traverse distance is total travel, not straight-line distance from the module; it cannot define a circular coverage radius. Preserve the source's EVA-time definition if exposed in the UI.

| Mission | EVA time (h) | Traverse (km) | Returned samples (kg) |
|---|---:|---:|---:|
| Apollo 11 | 2.53 | 0.25 | 21.55 |
| Apollo 12 | 7.75 | 1.35 | 34.35 |
| Apollo 14 | 9.38 | 3.45 | 42.28 |
| Apollo 15 | 19.13 | 27.9 | 77.31 |
| Apollo 16 | 20.23 | 27 | 95.71 |
| Apollo 17 | 22.07 | 35 | 110.52 |

### Apollo 11 first step

The [Apollo Lunar Surface Journal, “One Small Step”](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.step.html) explains that the mission report gives initial surface contact at **109:24:15 GET**, or **1969-07-21 02:56:15 GMT/UTC**. A later press announcement used GET 109:24:20. Retain the event definition and this timing discrepancy. The familiar US date July 20 is local time; the first step occurred on July 21 in UTC. The LM coordinate is a site anchor, not a measured first-footprint coordinate.

## 4. Robotic sites and selected later milestones

The following compact seed catalogue transcribes dates and coordinate pairs from the [NSSDCA spacecraft/impact table](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html), normalizing west longitudes. Dates are the catalogue's UTC dates; Luna 2 requires the time-scale caveat above. This is a geographic lookup, not a claim of equal positional confidence or mission success.

| Object | Date | Latitude | Longitude |
|---|---|---:|---:|
| Luna 2 | 1959-09-13 | 30 | 0 |
| Ranger 7 | 1964-07-31 | -10.6340 | -20.6770 |
| Luna 9 | 1966-02-03 | 7.13 | -64.37 |
| Surveyor 1 | 1966-06-02 | -2.4745 | -43.3398 |
| Luna 13 | 1966-12-24 | 18.87 | -62.05 |
| Surveyor 3 | 1967-04-20 | -3.0162 | -23.4180 |
| Surveyor 5 | 1967-09-11 | 1.4551 | 23.1943 |
| Surveyor 6 | 1967-11-10 | 0.4742 | -1.4275 |
| Surveyor 7 | 1968-01-10 | -40.9812 | -11.5127 |
| Luna 16 | 1970-09-20 | -0.5137 | 56.3638 |
| Luna 17 | 1970-11-17 | 38.23764 | -35.00163 |
| Luna 20 | 1972-02-21 | 3.7863 | 56.6242 |
| Luna 21 | 1973-01-15 | 25.9994 | 30.4076 |
| Luna 23 | 1974-11-06 | 12.6667 | 62.1511 |
| Luna 24 | 1976-08-18 | 12.7142 | 62.2129 |
| Chang'e 3 | 2013-12-14 | 44.1214 | -19.5117 |
| Chang'e 4 | 2019-01-03 | -45.4561 | 177.5885 |
| Chang'e 5 | 2020-12-01 | 43.0576 | -51.9161 |
| Chandrayaan-3 | 2023-08-23 | -69.3741 | 32.32 |
| SLIM | 2024-01-19 | -13.3160 | 25.2510 |
| Odysseus | 2024-02-22 | -80.13 | 1.44 |
| Chang'e 6 | 2024-06-01 | -41.6385 | -153.9852 |
| Blue Ghost 1 | 2025-03-02 | 18.562 | 61.810 |

### Interpretation, times and model requirements

- **Luna 2:** an impact, not a soft landing. NASA's [historical account](https://www.nasa.gov/history/60-years-ago-luna-2-makes-impact-in-moon-race/) supports September 13 and the first-contact milestone. Treat its position as an approximate area; no exact crater or seconds-level time is adopted here.
- **Luna 9:** use an uncertainty-labelled region. The [NSSDCA Soviet-missions summary](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html) gives 18:44:52 UT and 7.08°N, 295.63°E, unlike the catalogue's 7.13°N. This research has not established a confirmed modern image localization. A capsule mesh is not evidence of its exact position.
- **Surveyor 1:** [NASA mission description](https://science.nasa.gov/mission/surveyor-1/) gives 1966-06-02 06:17:36 UT; approximately 3 m high, with three legs and a triangular structure. Its historical coordinates differ from the LRO-based catalogue. Use mission photographs for landing-leg geometry and antenna/camera placement. [University of Arizona digitization](https://sic.lpl.arizona.edu/surveyor-digitization/surveyor-i) links the mission report, scientific results and television-image catalogue.
- **Surveyor series:** [NSSDCA programme source](https://nssdc.gsfc.nasa.gov/planetary/lunar/surveyor.html) distinguishes cameras, the scoop on Surveyors 3 and 7, and chemical-analysis instruments on 5, 6 and 7. Do not clone a single payload configuration across all five successful landers. Surveyor 3 landed at 00:04:53 UT on 1967-04-20 in that source.
- **Luna sample-return/rover missions:** [NSSDCA Soviet summary](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html) gives landing times 05:18 UT for Luna 16, 03:47 UT for Luna 17, 19:19 UT for Luna 20, 23:35 UT for Luna 21 and 02:00 UT for Luna 24, on the dates above. These do not locate a rover at later times. [JPL lunar constants/models report](https://planetarydata.jpl.nasa.gov/img/data/m3/CH1M3_0002/EXTRAS/LunConstantsModels_2005_jpl_d32296.pdf), lunar timeline, distinguishes successful sample returns from Luna 23's damaged sampling mission. Model the appropriate remaining descent platform after a sample-return ascent.
- **Chang'e 3:** China's first landing on another celestial body; 2013-12-14 13:11 GMT, northwest Mare Imbrium. The original [Liu et al. 2014 terrain paper](https://isprs-archives.copernicus.org/articles/XL-4/149/2014/isprsarchives-XL-4-149-2014.html) describes 0.02 m terrain reconstruction near specific rover observation stations. That local result is not a globally available 2 cm DEM. The paper's rounded site is 44.12°N, 19.51°W.
- **Chang'e 4:** the [mission archive](https://vsso.nssdc.ac.cn/mobile/nssdc_en/html/task/change4.html) gives 2019-01-03 02:26 UTC, Von Karman crater, with Queqiao relay support. [Li et al. 2019](https://www.nature.com/articles/s41467-019-12278-3) reconstruct descent and obtain -45.4446°, 177.5991°, elevation -5935 m. Those values differ from the LROC-based catalogue above: preserve them as a separate solution and inspect frame/control before co-registering. Do not copy that altitude into a different datum. This is a useful primary source for a future descent animation, subject to obtaining its actual trajectory data.
- **Chang'e 5:** the [Chinese science-data archive](https://www.nssdc.ac.cn/mobile/nssdc_en/html/task/change5.html) records lunar landing on 2020-12-01 and Earth return at 17:59 UTC on December 16, with approximately 1,731 g of samples. Landing and return need separate timeline entries.
- **Chandrayaan-3:** India's [UN registration](https://www.unoosa.org/res/osoindex/data/documents/in/st/stsgser_e1198_html/ser1198E.pdf) records -69.373°, 32.319°. [ISRO specifications](https://www.isro.gov.in/ISRO_EN/Chandrayaan3_Details.html) instead list the planned 4 km × 2.4 km landing area centred at -69.367621°, 32.348126°; do not label that centre as actual touchdown. This is southern high latitude, not the geographic south pole. Exact touchdown time, final orientation and mesh dimensions remain to be extracted before a timed reconstruction.
- **SLIM:** [JAXA DARTS](https://darts.isas.jaxa.jp/en/missions/slim) records 2024-01-19 15:20, equivalent to January 20 00:20 JST. Use [JAXA's landing-results report](https://global.jaxa.jp/press/2024/01/file/jaxa_doc01_20240125_e.pdf) and surface photographs to determine actual final attitude; a nominal upright model would misrepresent the event. Precise attitude has not been extracted here.
- **Odysseus / IM-1:** [NASA-hosted navigation paper](https://ntrs.nasa.gov/api/citations/20250007036/downloads/aasimndl.pdf) reports -80.1276°, 1.4367° at 2024-02-22 23:23:00 UTC. This supplies a more precise published solution than the rounded catalogue; retain source identity and verify its frame before terrain placement. Final attitude and landing-versus-resting position require additional checks.
- **Chang'e 6:** the [CAS account](https://english.cas.cn/bcas/2024_2/202508/P020250813589311076398.pdf) gives June 2, 2024 at 06:23 GMT+8: **June 1 at 22:23 UTC**, consistent with the catalogue date. [CAS's mission account](https://english.cas.cn/bcas/2025_1/202508/P020250813611333345559.pdf) records return of 1,935.3 g of far-side samples on June 25. The landing is in the far-side South Pole-Aitken basin, not at the geographic south pole.
- **Blue Ghost 1:** [NASA landing announcement](https://www.nasa.gov/news-release/touchdown-carrying-nasa-science-fireflys-blue-ghost-lands-on-moon/) confirms March 2, 2025, Mare Crisium, and an upright, stable landing configuration under CLPS. It provides a direct historical bridge to this app's CLPS theme. Do not reuse Apollo or Surveyor geometry for it.

## 5. Terrain assets for all six Apollo scenes

The following **individual LROC product pages were opened**, not merely inferred from a naming pattern. These are stereo-derived DTMs. Pixel spacing is not absolute positional accuracy or the size of the smallest reliably modelled object. Use the product's confidence map and documentation when selecting valid terrain.

| Site | Product and download entry point | DTM sampling | Product project date | Relevant available material |
|---|---|---:|---|---|
| Apollo 11 | [NAC_DTM_APOLLO11](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO11) | 2 m/px | 2012-09-17 | 32-bit GeoTIFF, PDS IMG, confidence map; 0.50 m/px and 2 m/px orthophotos |
| Apollo 12 | [NAC_DTM_APOLLO12](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO12) | 2 m/px | 2013-09-05 | DTM and 0.50 m/px orthophotos; useful for the LM/Surveyor context |
| Apollo 14 | [NAC_DTM_APOLLO14](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO14) | 2 m/px | 2013-09-05 | DTM, confidence and orthophoto products |
| Apollo 15 | [NAC_DTM_APOLLO15](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO15) | 2 m/px | 2013-08-22 | DTM, confidence and orthophotos in Hadley terrain |
| Apollo 16 | [NAC_DTM_APOLLO16](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO16) | 2 m/px | 2013-10-02 | Multi-image highland terrain mosaic |
| Apollo 17 | [NAC_DTM_APOLLO17](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO17) | 5 m/px | 2018-11-16 | Taurus-Littrow terrain mosaic |

Apollo 11's listed coverage is latitude 0.31–1.24° and longitude 23.37–23.51°E, with source stereo images **M150361817 L/R** and **M150368601 L/R** acquired in 2011. Its page links a [dedicated GeoTIFF product entry](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11). These are modern observations, not imagery captured in July 1969.

**Download verification limit:** this research did not download or inspect the raster payloads, PDS labels, shapefile archives or models. The Apollo 11 README link redirected to a PDS host that the browsing tool could not retrieve. Thus CRS parameters, vertical datum, NoData values, actual file checksums and usable pixel coverage are still acquisition-stage checks, not passed checks. Product pages confirm suitable candidates; they do not establish that a ready-to-import GLB exists.

## 6. Apollo 11: equipment, paths and reconstruction inputs

### Spatial and temporal mapping

The [LROC Apollo 11 Spatio-Temporal Mapping collection](https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_APOLLO_11), updated **2025-08-21**, is unusually valuable. It contains stations, deployed equipment, separate Armstrong/CDR and Aldrin/LMP point locations and paths, camera/photo locations, sample locations and a detailed transcript CSV. The page offers a complete ZIP plus individual shapefiles and README files.

Its mapping is tied to `NAC_DTM_APOLLO11` using an equirectangular Moon projection described as centred at **1°N, 180°E**. That is a projection definition, not the landing coordinate. Preserve the downloaded `.prj` and metadata instead of manually substituting longitude 23° because it looks more local. Mapped paths are reconstructed observations, not continuously measured body poses.

Suggested use: transform equipment and route layers together with the terrain; attach transcript events to their documented locations; retain the timestamp precision; label interpolated movement. Read the equipment attributes before deciding whether a flag, instrument or camera has an exact mapped location. Do not place props by visual guess and then call them surveyed.

### Spacecraft and human scale

- [NASA Apollo Lunar Module 3D resource](https://science.nasa.gov/3d-resources/apollo-lunar-module/) provides a model entry credited to NASA/Michael D. Carbajal. It is a candidate asset; topology, scale, mission variant, orientation, licensing metadata and GLB conversion have not been checked.
- [NASA spacecraft dimensions reference](https://ntrs.nasa.gov/api/citations/19940023701/downloads/19940023701.pdf), section IV, gives the lunar module approximately **7 m tall with legs extended** and **9.4 m across the legs**. Use these as coarse bounding-box checks, not fabrication drawings. Measure the same endpoints; antennas/probes may extend beyond a mesh's main body.
- The existing repository's 1.7 m astronaut is an illustrative scale figure. It is not a scan of Armstrong or Aldrin and does not establish the height of a suited astronaut with backpack. Keep it labelled as a scale reference until a suitable documented suit/model is obtained.
- Use the [Apollo Lunar Surface Journal](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.step.html) for event context, linked photographs and video. Archive the actual image IDs and camera viewpoint used to justify each detailed prop placement. A museum replica is useful as a modelling reference but is not a measurement of the flight vehicle's final pose.

### Landing pose and lighting evidence

NASA's [SP-4029 landing-conditions table](https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-27_LM_Lunar_Landing.htm) reports Apollo 11's 4.5° east tilt and yaw description, Apollo 15's combined 11° tilt, and a 535 ft Apollo 12 offset northwest of Surveyor III. These are valuable cross-checks. Body pitch/roll/yaw cannot be applied as arbitrary Three.js Euler rotations: first establish body axes, geographic heading and rotation order from the mission documentation. No complete attitude quaternion is derived here.

The table's published Sun angles are historical context, not a complete light direction: azimuth is also needed. Do not use a modern orthophoto's baked shadows as the touchdown shadows. A DTM is geometry; a shaded-relief image is a visualization, not an elevation raster. Missing sub-metre relief, tracks and bootprints must be treated as reconstructed detail rather than measured DTM geometry.

## 7. Fit with the actual application

Repository observations below were checked against source at the baseline above. `ESTADO.md` still says implementation has not begun, while code and terrain assets exist; this dossier does not treat that stale statement as current implementation evidence.

| Existing component | Observation | Consequence for a later implementation |
|---|---|---|
| `shared/sites.ts` | Three fixed reference IDs; planetocentric latitude and east longitude; custom points have `source: null` | Historical points need persistent identities and coordinate provenance; entering them as anonymous custom points loses that provenance |
| `shared/time.ts` | Accepted interval is `[2000-01-01, 2100-01-01)` | Apollo, Luna and Surveyor dates currently fail validation; widening the range requires explicit implementation and verification |
| `server/horizons/query.ts` | Moon `coord@301`; `COORD_TYPE=GEODETIC`; longitude/latitude/altitude-km ordering; quantities 4,13,20; `TIME_TYPE=UT`; `APPARENT=AIRLESS` | Validate historical frame and time behavior before presenting a historical sky; no historical Horizons query was executed in this task |
| `src/features/scene/geometry.ts` | +Y zenith, -Z north, +X east | Keep terrain, equipment and sky in the same local axes |
| `src/features/scene/terrain/siteTerrain.ts` | Current terrain workflow is south-polar stereographic, radius 1,737,400 m, local offsets and grid-north correction | Apollo sites need their own projection/transform metadata; do not reuse the polar crop or its rotation as an Apollo terrain solution |
| `src/i18n/` | Existing bilingual structure | Historical UI text must enter translations; Spanish remains default |

The current repository includes terrain visuals, but their existence does not make the app a validated terrain-occlusion solver. Historical lighting remains an illustrative reconstruction unless terrain, observer height, ephemerides and rendering have been jointly validated. No view guarantees energy, communications or landing suitability.

### Proposed research-to-asset workflow

1. Choose a specific event and evidence tier: global marker, local terrain scene, or timed reconstruction. Keep the event timestamp separate from a freely selected exploration timestamp.
2. Obtain the DTM, matching orthophoto, confidence layer, PDS labels and README. Record publisher, product ID/version, retrieval date, SHA-256, units, bounds, frame, projection, height datum, NoData and accuracy documentation.
3. Inspect actual valid pixels around the lander and planned route; a bounding rectangle alone does not establish coverage. Preserve missing elevations. Use 1:1 vertical scale unless an explicit explanatory mode says otherwise.
4. Transform terrain and all equipment through the same lunar CRS into a local origin near the lander. Keep coordinates in metres; subtract the origin before float32/GLB export. Store the inverse transform and north direction in metadata.
5. Validate at least the lander anchor and two identifiable landmarks against the orthophoto. Check east/west signs, scale, axes, terrain contact and any seams. The landing coordinate locates a vehicle reference point, not necessarily the centre between its footpads.
6. Import documented spacecraft dimensions and mission-specific configuration. Separate descent/ascent stages when necessary. Maintain an explicit distinction between measured location, inferred placement and artistic reconstruction.
7. Query Sun/Earth only for a supported, source-backed instant. Preserve the complete response/header, returned frame, ephemeris identifiers and warnings. Reconcile reference-sphere altitude with terrain datum instead of silently setting elevation to zero.
8. Export a lightweight terrain/prop GLB with metadata and citations; inspect in the actual viewer. Use levels of detail without implying that mesh subdivision increases scientific resolution.

### Proposed minimum record (design suggestion, not an agreed API)

| Field group | Information to preserve |
|---|---|
| Identity | Stable event ID, mission, country/operator, event kind, historical outcome |
| Text | Spanish/English title and description keys |
| Time | Original source text/time scale, normalized instant when justified, precision, uncertainty/dispute notes |
| Location | Latitude, longitude, body-fixed frame, coordinate solution/version, altitude and datum or null, precision/uncertainty status |
| Assets | Terrain product and checksum, orthophoto, GLB, units, local origin, projection and axes, vertical exaggeration, credits |
| Reconstruction | Selected historical phase, equipment configuration, pose source, route source, interpolated/artistic details |
| Evidence | Separate references for chronology, coordinates, dimensions, imagery and terrain; retrieval date and exact table/section |

Do not use a single “verified” boolean for all of these. A known landing date does not imply a surveyed location, available terrain or validated object orientation.

## 8. Conflicts and unresolved evidence

| Issue | Observed disagreement or gap | Treatment in this dossier |
|---|---|---|
| Apollo coordinate revisions | SP-4029 uses an older coordinate solution; NSSDCA's 2017 page uses LRO/DE421 | Prefer the latter for markers; keep older values only with their own frame/source |
| Apollo 11 touchdown | SP-4029 GMT row: 20:17:39; NSSDCA mission page: 20:17:40; SP-4029 GET includes fractional seconds | Publish selected source and seconds-level discrepancy; reconcile event definitions before exact animation |
| Apollo 12 touchdown | SP-4029: 06:54:36; NSSDCA mission page: 06:54:35 | Same approach; do not imply subsecond certainty |
| Apollo 14 touchdown | SP-4029: 09:18:13; NSSDCA mission page: 09:18:11 | Explicit unresolved two-second difference; inspect underlying mission report before final replay |
| Apollo 16 calendar date | Summary table says April 20; detailed GMT and mission records say April 21 | Use April 21 for UTC; April 20 is US local date |
| Luna 2 | Soviet summary gives September 14 and ~07:30 UT; NASA historical article and artifact catalogue give September 13 | Use September 13 at day precision; do not adopt the conflicting clock time |
| Luna 9 | Different nominal latitude between two NSSDCA pages | Approximate region; no high-precision terrain anchor selected |
| Chang'e 4 | Mission-derived and LROC-derived positions differ | Preserve both; no unexplained averaging or assumption of interchangeability |
| Chandrayaan-3 | Planned ellipse centre, registration position and LROC position differ | Distinguish planned vs actual and preserve each solution's provenance |
| Modern local dates | SLIM and Chang'e 6 have different local/UTC dates | Normalize with the published offset and retain original time |
| Terrain downloads | Product pages inspected; raster payloads/labels not validated | Candidate datasets, not finished assets |
| Surface details | Footprints, prop rotations, materials and event-specific tracks are not established by a site coordinate | Require mission images/maps or label as illustrative |

Other mission catalogue links sometimes returned unsupported XML, and several guessed NASA Luna mission URLs were inaccessible. They were not used as evidence. Retrieved NSSDCA summaries and NASA historical material support the claims actually included here. The Apollo 11 README redirect issue is recorded in section 5. Search snippets helped locate some agency papers; no unread paper is treated as a complete engineering specification.

## 9. Review and project handoff

Only this Markdown file is added. No app behavior, scientific algorithm, model or dataset was changed. The user authorized committing, pushing and opening a PR on 2026-11-15; merge remains the integrator's responsibility. `GIT_WORKFLOW.md` was referenced by project instructions but was not found in this checkout; no publication workflow is inferred from that absence.

Verification performed: read current site/time/geometry/query contracts; opened the six Apollo DTM product pages; compared coordinate tables and historical timing records; checked document formatting and the resulting Git scope. Runtime tests are not applicable to this documentation-only change and were not run. Rasters, meshes, physical appearance and historical ephemerides were not executed or validated.

**Human review requested:** Diego should review coordinate frames, timing conflicts and terrain choices; the integrator should review the eventual data contract and historical-date range before implementation. Andrés should review the first selected scene's asset requirements. This document itself also needs another person's diff review; no external review request has been sent.

Proposed `ESTADO.md` update: historical landing research is available here; Apollo 11 has the strongest identified reconstruction inputs; data acquisition, scientific validation and UI implementation remain pending. Correct the stale implementation status separately after a wider project check.

Proposed `DECISIONES.md` update: record only the user's request for a dedicated historical section and this research task as confirmed intent. Event shortlist, scene fidelity, expanded date range and schema remain proposals until the integrator agrees. No existing decision is silently replaced.

For every asset ultimately used, retain its own creator/agency credit, provenance and reuse terms. Hosting on an agency website is not enough to assume every photograph, contractor model or third-party figure has identical terms. This task identifies sources; it does not certify redistribution rights for files that have not been downloaded.
