/**
 * Project-wide source list for the Sources dialog, taken from the research and
 * design documents in `docs/` (GUIA_PRIMERA_DEMO, LUNAR_DATA_RESEARCH,
 * LUNAR_SOUTH_POLE_RESEARCH, LUNAR_RELIABILITY_AUDIT,
 * POLAR_TERRAIN_SOURCE_REVIEW and the Nobile Rim 1, Nobile Rim 2 and
 * Shackleton Rim terrain READMEs).
 *
 * - `app`: sources whose data or definitions the application uses directly.
 * - `research`: sources the team consulted to choose data, frames and
 *   methods, or to set the limits of what the app claims. Being listed here
 *   does not mean a product is integrated or validated.
 *
 * Titles are proper names and stay untranslated; the reason for each source
 * is translated (`messages.results.sourceReasons`).
 */

export type SourceGroup = 'app' | 'research';

export interface SourceEntry {
  readonly id: string;
  readonly group: SourceGroup;
  readonly title: string;
  readonly url: string;
}

export const SOURCE_CATALOG = [
  // Used directly by the application.
  {
    id: 'apolloLanding',
    group: 'app',
    title: 'NASA/NSSDCA Apollo 11 mission catalogue',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html',
  },
  {
    id: 'apolloTerrain',
    group: 'app',
    title: 'LRO/LROC NAC_DTM_APOLLO11',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO11',
  },
  {
    id: 'lunarSurfaceDataBook',
    group: 'app',
    title: 'NASA Moon to Mars Lunar Surface Data Book (M2M-30044), table A2.1-1',
    url: 'https://ntrs.nasa.gov/citations/20250002845',
  },
  {
    id: 'horizonsApi',
    group: 'app',
    title: 'JPL Horizons API',
    url: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
  },
  {
    id: 'horizonsManual',
    group: 'app',
    title: 'JPL Horizons System manual',
    url: 'https://ssd.jpl.nasa.gov/horizons/manual.html',
  },
  {
    id: 'jplApiPolicy',
    group: 'app',
    title: 'JPL SSD/CNEOS API service',
    url: 'https://ssd-api.jpl.nasa.gov/',
  },
  {
    id: 'pgda78',
    group: 'app',
    title: 'NASA GSFC PGDA product 78: LRO/LOLA local 5 m topography (Site06, DM2)',
    url: 'https://pgda.gsfc.nasa.gov/products/78',
  },
  {
    id: 'pgda78Readme',
    group: 'app',
    title: 'NASA GSFC PGDA LOLA 5 m/pixel README',
    url: 'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README',
  },
  {
    id: 'barker2021',
    group: 'app',
    title: 'Barker et al. (2021), Planetary and Space Science 203, 105119',
    url: 'https://doi.org/10.1016/j.pss.2020.105119',
  },

  // Consulted during research.
  {
    id: 'spaceAppsChallenge',
    group: 'research',
    title: 'NASA Space Apps Challenge 2026: Lunar Landing Site Navigator',
    url: 'https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/',
  },
  {
    id: 'pgda90',
    group: 'research',
    title: 'NASA GSFC PGDA product 90: adjusted regional LOLA topography',
    url: 'https://pgda.gsfc.nasa.gov/products/90',
  },
  {
    id: 'barker2023',
    group: 'research',
    title: 'Barker et al. (2023), A New View of the Lunar South Pole from LOLA, PSJ 4, 183',
    url: 'https://doi.org/10.3847/PSJ/acf3e1',
  },
  {
    id: 'pgda81',
    group: 'research',
    title: 'NASA GSFC PGDA product 81: LOLA 87–90° S 5 m mosaic',
    url: 'https://pgda.gsfc.nasa.gov/products/81',
  },
  {
    id: 'pgda69',
    group: 'research',
    title: 'NASA GSFC PGDA product 69: polar illumination and Earth visibility',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
  },
  {
    id: 'mazarico2011',
    group: 'research',
    title: 'Mazarico et al. (2011), Icarus: lunar polar illumination',
    url: 'https://doi.org/10.1016/j.icarus.2010.10.030',
  },
  {
    id: 'pdsLola',
    group: 'research',
    title: 'NASA PDS Geosciences: LRO LOLA archive',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  },
  {
    id: 'sldem2015',
    group: 'research',
    title: 'SLDEM2015 (LOLA + Kaguya), NASA PDS',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/',
  },
  {
    id: 'lrocNac',
    group: 'research',
    title: 'LROC NAC DTM footprints (NAC_DTM_NOBILE01, NAC_DTM_SHACKRDGE02)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS',
  },
  {
    id: 'lrocGld100',
    group: 'research',
    title: 'LROC WAC GLD100',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100',
  },
  {
    id: 'kaguyaDtm',
    group: 'research',
    title: 'USGS Kaguya Terrain Camera DTMs',
    url: 'https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/',
  },
  {
    id: 'pgda104',
    group: 'research',
    title: 'NASA GSFC PGDA product 104: LOLA + LROC shape from shading',
    url: 'https://pgda.gsfc.nasa.gov/products/104',
  },
  {
    id: 'pgda95',
    group: 'research',
    title: 'NASA GSFC PGDA product 95: MOON_PA shape and frame transformations',
    url: 'https://pgda.gsfc.nasa.gov/products/95',
  },
  {
    id: 'naifFrameKernel',
    group: 'research',
    title: 'NAIF lunar frame kernel moon_de440_250416.tf',
    url: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf',
  },
  {
    id: 'naifSpice',
    group: 'research',
    title: 'NAIF SPICE Toolkit (azlcpo, illumf, occult)',
    url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html',
  },
  {
    id: 'bryantIpn',
    group: 'research',
    title: 'JPL IPN Progress Report 42-176 (Bryant)',
    url: 'https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html',
  },
  {
    id: 'minow2023',
    group: 'research',
    title: 'NASA lunar environment presentation (Minow, SciTech 2023)',
    url: 'https://ntrs.nasa.gov/api/citations/20230000854/downloads/Minow_SciTech_2023%20-%20presentation%20-%20final.pdf',
  },
  {
    id: 'dsn810',
    group: 'research',
    title: 'DSN Telecommunications Link Design Handbook 810-005',
    url: 'https://deepspace.jpl.nasa.gov/dsndocs/810-005/',
  },
  {
    id: 'glennPropagation',
    group: 'research',
    title: 'NASA Glenn: lunar surface propagation',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/',
  },
  {
    id: 'hlsThermal',
    group: 'research',
    title: 'HLS Lunar Thermal Analysis Guidebook',
    url: 'https://ntrs.nasa.gov/citations/20210010030',
  },
  {
    id: 'diviner',
    group: 'research',
    title: 'NASA PDS Geosciences: LRO Diviner archive',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm',
  },
  {
    id: 'lcross',
    group: 'research',
    title: 'NASA LCROSS',
    url: 'https://science.nasa.gov/mission/lcross/',
  },
  {
    id: 'moonWater',
    group: 'research',
    title: 'NASA: Moon water and ices',
    url: 'https://science.nasa.gov/moon/moon-water-and-ices/',
  },
  {
    id: 'shadowCam',
    group: 'research',
    title: 'NASA ShadowCam: Shackleton',
    url: 'https://science.nasa.gov/image-article/apod-2023-may-5-shackleton-from-shadowcam/',
  },
  {
    id: 'zuberShackleton',
    group: 'research',
    title: 'Zuber et al.: Shackleton crater (NASA NTRS 20120013758)',
    url: 'https://ntrs.nasa.gov/api/citations/20120013758/downloads/20120013758.pdf',
  },
  {
    id: 'landingHazard',
    group: 'research',
    title: 'NASA/JPL landing hazard detection (NTRS 20110003001)',
    url: 'https://ntrs.nasa.gov/citations/20110003001',
  },
  {
    id: 'moonTrek',
    group: 'research',
    title: 'NASA Moon Trek',
    url: 'https://trek.nasa.gov/moon/',
  },
  {
    id: 'gazetteer',
    group: 'research',
    title: 'USGS Gazetteer of Planetary Nomenclature',
    url: 'https://www.usgs.gov/tools/gazetteer-planetary-nomenclature',
  },
  {
    id: 'projStere',
    group: 'research',
    title: 'PROJ: stereographic projection',
    url: 'https://proj.org/en/stable/operations/projections/stere.html',
  },
  {
    id: 'gdal',
    group: 'research',
    title: 'GDAL: gdalinfo and GeoTIFF driver',
    url: 'https://gdal.org/en/stable/programs/gdalinfo.html',
  },
] as const satisfies readonly SourceEntry[];

export type SourceId = (typeof SOURCE_CATALOG)[number]['id'];
