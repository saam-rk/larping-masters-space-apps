# Lunar south pole terrain research

Research checked on 2026-11-14 for the CLPS Lunar Mission Browser. The [first-demo guide](GUIA_PRIMERA_DEMO.md) defines the three reference points and the geometric Sun and Earth display. This research evaluates possible terrain inputs and records one exploratory line-of-sight calculation. The project has yet to decide whether to add terrain to the demo.

## Reference points and terrain samples

NASA's *Lunar Surface Data Book*, baseline dated 2025-03-18, gives the coordinates in Table A2.1-1. The table identifies centers of original polygons and reports center-coordinate accuracy of approximately 5–10 m. Treat each coordinate as a reference point for scientific exploration. [NASA Lunar Surface Data Book, p. 75](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf#page=75)

The values below come from the containing cell in each 5 m/pixel NASA Goddard Lunar Orbiter Laser Altimeter (LOLA) product. Latitude uses positive north and longitude uses positive east. Elevation is radial height above a 1,737,400 m lunar reference sphere. The rasters use south polar stereographic coordinates in meters, with the pole at −90°, the central meridian at 0°, and true scale at the pole. The lunar body-fixed frame is the DE421 mean Earth/polar axis frame (`MOON_ME`). [NASA product documentation](https://pgda.gsfc.nasa.gov/products/78) · [Local GeoTIFF metadata](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README) · [LOLA instrument and elevation definition](https://doi.org/10.1029/2010GL043751)

| Reference point | Latitude | East longitude | Elevation (m) | Slope (°) | Elevation RMS error (m) | Slope RMS error (°) | LOLA returns | Elevation raster |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Nobile Rim 1 | −85.4381° | +37.36667° | 5,946.13 | 15.05 | 0.72 | 2.66 | 0 | [Site06](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif) |
| Nobile Rim 2 | −83.954° | +58.82206° | 1,009.58 | 3.58 | 0.19 | 1.04 | 0 | [DM2](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/DM2/DM2_final_adj_5mpp_surf.tif) |
| Shackleton Rim | −89.7668° | −171.87° | 771.04 | 31.49 | 0.21 | 1.28 | 0 | [Site04](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif) |

To reproduce the values, take the named elevation raster and its companions from the same site directory. The file pattern is `<site>_final_adj_5mpp_<layer>.tif`, where the layers are `surf` (elevation), `slp` (slope), `toterr` (elevation RMS error), `slperr` (slope RMS error), and `ldec` (count of laser returns). Use the following projected coordinates to identify the containing cells. The table reports raster indices from zero, with the origin in the upper-left corner. [NASA local LOLA archive](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/)

| Product | Projected X (m) | Projected Y (m) | Column | Row | Elevation GeoTIFF Last-Modified (UTC) |
| --- | ---: | ---: | ---: | ---: | --- |
| Site06 | 84000.0100 | 110000.0108 | 2000 | 1999 | 2021-02-12 13:33:34 |
| DM2 | 157000.4520 | 95000.2534 | 2000 | 1999 | 2021-02-08 18:59:33 |
| Site04 | −1000.0366 | −7000.3456 | 1599 | 1600 | 2020-06-05 18:40:02 |

A zero in the returns layer means the cell received zero direct LOLA returns. The model interpolates elevations between observations. Preserve this distinction between a valid interpolated elevation and a missing value. LOLA can measure terrain in shadow because it emits its own laser pulses. The local product page reports about 90% interpolated cells in the polar 5 m grids it discusses. Pixel spacing, effective resolution and RMS height error describe different properties. The reported errors characterize the raster model at the sampled cells. The location of a polygon center, terrain variations within a cell and changes in the position of an observer can add uncertainty. [Barker et al., 2021, improved local LOLA maps](https://doi.org/10.1016/j.pss.2020.105119) · [NASA Goddard product notes](https://pgda.gsfc.nasa.gov/products/78)

The steep slope sampled at Shackleton Rim warrants checking the surrounding terrain before interpreting local traversability. Zuber et al. measured a mean rim diameter of 21 km, a mean rim-to-floor depth of 4.1 ± 0.05 km, and an average wall slope of 30.5° for Shackleton crater. The IAU and USGS list a diameter of 79.27 km for Nobile crater. Those crater dimensions describe regional features. Whether a feature obstructs the view depends on the exact observer, direction and time. [Zuber et al., 2012, Table 1](https://ntrs.nasa.gov/api/citations/20120013758/downloads/20120013758.pdf) · [IAU/USGS Gazetteer entry for Nobile](https://planetarynames.wr.usgs.gov/Feature/4321)

## Nobile Rim 1 line-of-sight example

**Time:** 2026-11-14 12:00 UTC. **Observer:** 85.4381° S, 37.36667° E, at a chosen height of 2 m above the model surface. Bilinear sampling of the four surrounding 5 m cell centers gives a surface elevation of 5,946.899 m, so the observer altitude entered into Horizons was 5.948899 km above the reference sphere.

A direct JPL Horizons query reproduced the figures in the demo guide for zero reference altitude. The table below uses a second query with the model-based observer altitude. The returned headers identified the high-precision mean Earth lunar frame, spherical radii of 1,737.4 km and a DE441 ephemeris. Azimuth increases clockwise from local north and elevation is measured from the local horizontal plane. The Horizons response identified API version 1.2. [Horizons user manual](https://ssd.jpl.nasa.gov/horizons/manual.html) · [Horizons API parameters](https://ssd-api.jpl.nasa.gov/doc/horizons.html)

| Object | Azimuth (°) | Center elevation (°) | Angular diameter (arcsec) | Highest sampled terrain on center azimuth |
| --- | ---: | ---: | ---: | --- |
| Sun | 83.301542 | +2.094720 | 1941.825 | −3.8795° at 153.1 km |
| Earth | 320.816668 | −0.588744 | 6492.343 | +6.5572° at 3.74 km |

The Earth's upper limb was approximately +0.31° above the geometric horizontal plane. A ridge at approximately **85.34185° S, 36.40708° E** reached +6.56° on the center azimuth, above the upper limb. The eight neighboring azimuths sampled around the disk in the regional maps also showed obstructing terrain. At the center-ray ridge location, the 20 m and 5 m elevation models both give approximately **6,384.4 m** by bilinear sampling. In the solar direction, the sampled terrain was below even the Sun's lower limb at approximately **+1.83°**. The profiles cover one time, one observer position and sampled directions only. The result is a terrain-model estimate of geometric visibility. [Site06 local elevation](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif) · [20 m regional elevation](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF) · [NASA polar illumination and Earth visibility methods](https://pgda.gsfc.nasa.gov/products/69)

### Reproducing the Horizons query

Use the same inputs for both targets. The raw responses can be retrieved with the [Sun request](https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%2710%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&CENTER=%27coord%40301%27&COORD_TYPE=%27GEODETIC%27&SITE_COORD=%2737.36667%2C-85.4381%2C5.948899%27&TLIST=%272026-11-14%2012%3A00%3A00%27&TIME_TYPE=%27UT%27&QUANTITIES=%274%2C13%27&CSV_FORMAT=%27YES%27&EXTRA_PREC=%27YES%27) and [Earth request](https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%27399%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&CENTER=%27coord%40301%27&COORD_TYPE=%27GEODETIC%27&SITE_COORD=%2737.36667%2C-85.4381%2C5.948899%27&TLIST=%272026-11-14%2012%3A00%3A00%27&TIME_TYPE=%27UT%27&QUANTITIES=%274%2C13%27&CSV_FORMAT=%27YES%27&EXTRA_PREC=%27YES%27).

```text
EPHEM_TYPE = 'OBSERVER'
CENTER     = 'coord@301'
COORD_TYPE = 'GEODETIC'
SITE_COORD = '37.36667,-85.4381,5.948899'
TLIST      = '2026-11-14 12:00:00'
TIME_TYPE  = 'UT'
QUANTITIES = '4,13'
CSV_FORMAT = 'YES'
EXTRA_PREC = 'YES'
COMMAND    = '10' for the Sun or '399' for Earth
```

Preserved data lines from between `$$SOE` and `$$EOE`. The fields after the time and the two Horizons flags are center azimuth in degrees, center elevation in degrees, and disk diameter in arcseconds.

```text
2026-Nov-14 12:00:00.000,*,i,  83.301542163,  2.094719934, 1941.825,
2026-Nov-14 12:00:00.000,*,i, 320.816667632, -0.588744225, 6492.343,
```

### Reproducing the terrain profile

| Spherical surface distance from observer | Elevation source | Distance between samples |
| --- | --- | ---: |
| First 200 m | [Site06 at 5 m/pixel](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site06/Site06_final_adj_5mpp_surf.tif) | 1.25 m |
| 200 m–18 km | [80–90° S at 20 m/pixel](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF) | 10 m |
| 18–100 km | [80–90° S at 80 m/pixel](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF) | 40 m |
| 100–400 km | [60–90° S at 240 m/pixel](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF) | 100 m |

1. Sample the spherical great-circle path outward at each azimuth from the observer. For the regional grids, use nine azimuths per target, given by the center azimuth plus `i × (angular diameter in arcseconds / 7200) / 4` degrees for integer `i` from −4 to +4. This approximates the disk's horizontal footprint at these low elevations. The 5 m grid was sampled along the center and two outermost azimuths.
2. Project each sample into the raster CRS and interpolate elevation bilinearly using pixel centers. With latitude `φ` and east longitude `λ` in radians, use `ρ = 2R × tan((π/2 + φ) / 2)`, `X = ρ × sin(λ)` and `Y = ρ × cos(λ)` for these specific rasters. Record unavailable terrain samples explicitly.
3. For a sample at spherical distance `d` and radial elevation `z`, use the angle below. It compares the sample to the observer's local tangent plane and accounts for lunar curvature. Use meters for `R = 1737400`, `d`, `z` and the observer's radial elevation `zObserver = 5948.899`. Convert the resulting angle to degrees.

   ```text
   centralAngle = d / R
   up = (R + z) × cos(centralAngle) − (R + zObserver)
   horizontal = (R + z) × sin(centralAngle)
   terrainElevation = atan2(up, horizontal)
   ```

4. Record the maximum sampled terrain elevation for each azimuth and compare it with the target disk. Treat comparisons near the skyline as uncertain until terrain coverage, angular sampling and propagated errors have been checked. Across the nine directions sampled with regional grids, the largest sampled terrain angle toward the solar disk was about −3.82°. The maxima for the Earth directions ranged from about +6.33° to +6.79°.

The sampling intervals and 400 km radius above are choices for this exploratory calculation. Barker et al. document a related approach that combines nested DEMs with 720 sight lines at 0.5° azimuth spacing. A production analysis should verify angular and radial convergence, test overlap between layers, and quantify sensitivity to the observer's coordinates, height and raster uncertainty. Other dates and sites and the full 360° profiles remain open. [Barker et al., 2021, horizon method](https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf) · [Mazarico et al., 2011, polar illumination](https://doi.org/10.1016/j.icarus.2010.10.030)

## Source inventory

| Data | Use and coverage | Source |
| --- | --- | --- |
| LOLA 5 m local models | Terrain, slopes, laser return counts and model uncertainty for Site06, DM2 and Site04. NASA also supplies adjusted point clouds and ensembles of elevation realizations for uncertainty studies. | [NASA Goddard local topography](https://pgda.gsfc.nasa.gov/products/78) · [NASA PDS LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) |
| Adjusted regional LOLA models | The 20 m/pixel, 80–90° S raster gives regional context for all three points. The 10 m/pixel, 83–90° S product covers all three centers and can be used to cross-check individual sectors. Wider rasters extend to 75° S and 60° S. Where provided, use `EFFRES`, `ERR` and `LDEC` to assess effective resolution, elevation error and observation density. There are also slope, roughness and permanent-shadow products. The Cloud Optimized GeoTIFFs support regional reads without downloading entire multi-gigabyte rasters. | [NASA Goddard regional topography](https://pgda.gsfc.nasa.gov/products/90) · [Barker et al., 2023](https://doi.org/10.3847/PSJ/acf3e1) · [Regional dataset DOI](https://doi.org/10.60903/gsfcpgda-lola-spole) |
| LOLA 87–90° S mosaic | A 5 m/pixel interpolated mosaic with slope and return count layers. It covers Shackleton Rim. Both Nobile points are farther from the pole than its nominal coverage. | [NASA Goddard polar mosaic](https://pgda.gsfc.nasa.gov/products/81) |
| LROC NAC stereo and shape-from-shading | Use imagery and higher-detail elevation products within verified footprints to examine small craters, rock fields and local roughness. NASA Goddard's shape-from-shading archive improves detail in sunlit areas and provides coverage and quality layers. LROC's 3 m/pixel `NAC_DTM_NOBILE01` ends at 36.17° E, west of the Nobile Rim 1 point at 37.36667° E. | [USGS LROC stereo method](https://www.usgs.gov/publications/extracting-accurate-and-precise-topography-lroc-narrow-angle-camera-stereo) · [NASA Goddard shape-from-shading](https://pgda.gsfc.nasa.gov/products/104) · [Dataset v1.0.0](https://zenodo.org/records/17954508) · [Official LROC product footprint](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_NOBILE01) |
| ShadowCam imagery | View deep shadow and terrain features such as those inside Shackleton. For measuring elevation, use an elevation product with documented geometry and quality. | [NASA ShadowCam, Shackleton](https://science.nasa.gov/image-article/apod-2023-may-5-shackleton-from-shadowcam/) |
| Polar illumination, Earth visibility and permanent shadow | Use to interpret regional conditions. NASA's long-term products average modeled conditions over an 18.6-year cycle. Use terrain profiles and a time-specific ephemeris for a selected hour. A hillshade depicts lighting chosen for visualization. | [NASA Goddard illumination products](https://pgda.gsfc.nasa.gov/products/69) · [Lunar Surface Data Book, §§4.3.2 and 5.1](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf#page=32) |
| Thermal and volatile evidence | Diviner provides surface temperature products. LCROSS observations from the Cabeus impact provide site-specific evidence of water ice. A shadow layer describes illumination and cannot establish the presence or amount of ice. | [NASA PDS Diviner archive](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) · [NASA LCROSS](https://science.nasa.gov/mission/lcross/) · [NASA lunar water evidence](https://science.nasa.gov/moon/moon-water-and-ices/) |
| Mapping tools and feature names | Inspect profiles or surrounding terrain in NASA Moon Trek. Use the IAU/USGS Gazetteer to label named features and verify approximate locations. | [NASA Moon Trek](https://trek.nasa.gov/moon/) · [USGS Gazetteer](https://www.usgs.gov/tools/gazetteer-planetary-nomenclature) |

## Project use and limits

- **Terrain visibility.** Precompute a horizon curve for each point and observer height to cover the full azimuth circle. Store azimuth and terrain angle in degrees, the distance and coordinates of the controlling obstacle, data provenance, valid distance coverage, and uncertainty. Compare the full apparent disk against the horizon for the requested UTC time. Use an indeterminate result near the modeled skyline or when required terrain is missing. [NASA Goddard illumination products](https://pgda.gsfc.nasa.gov/products/69) · [Barker et al., 2021](https://doi.org/10.1016/j.pss.2020.105119)
- **Approach, touchdown and exploration.** Assess the approach corridor and landing ellipse with vehicle-specific tolerances, slope and roughness at footpad scale, rocks and small craters. For surface science, evaluate routes with slope, obstacle sizes, illumination and thermal conditions at the scale of the crew or rover. A single elevation or slope pixel can guide inspection. Landing safety, available solar power and a working communications link each require separate mission-specific evidence, including the link geometry to a ground station or relay. [NASA Lunar Surface Data Book, §§4.3, 5 and 7](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf#page=32) · [NASA/JPL landing hazard detection](https://ntrs.nasa.gov/citations/20110003001)
- **Next research task.** Diego can have another team member reproduce the Nobile Rim 1 profile using the parameters above and compare its shape in Moon Trek. For subsequent results, record exact product names and versions, source URLs, checksums of retained files, CRS, datum, units, interpolation and coverage. Then extend the check to a full horizon and the other two reference points. Add verified terrain research to the project status when the team reviews it. If the team adopts terrain as a feature, record that scope decision separately.
