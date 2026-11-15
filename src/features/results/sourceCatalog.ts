/**
 * Project-wide source list for the Sources dialog, grouped by the part of the
 * project each source supports. Taken from the code and from every document
 * that cites sources: `docs/` (GUIA_PRIMERA_DEMO, HORIZON_PLAYBACK,
 * LUNAR_DATA_RESEARCH, LUNAR_SOUTH_POLE_RESEARCH, LUNAR_ADDITIONAL_SITES_RESEARCH,
 * LUNAR_RELIABILITY_AUDIT, POLAR_TERRAIN_SOURCE_REVIEW,
 * POLAR_TERRAIN_VALIDATION_REPORT, HISTORIC_LUNAR_LANDINGS_RESEARCH and the
 * `docs/research/` READMEs), the terrain and celestial-model READMEs in
 * `assets/`, `tools/lunar-terrain/README.md`, `shared/sites.ts`,
 * `shared/time.ts`, `src/features/scene/playback.ts`, `shared/missionAssessment.ts`
 * and `DECISIONES.md`.
 *
 * Historical references are limited to Apollo 11, the only historical scene
 * integrated in the application; research on other missions stays in `docs/`.
 *
 * Direct file downloads (single rasters, ZIPs, labels) are not listed one by
 * one: the product page that publishes them is listed instead.
 *
 * - `app` sections: sources whose data or definitions the application uses
 *   directly.
 * - `research` sections: sources the team consulted to choose data, frames
 *   and methods, or to set the limits of what the app claims. Being listed
 *   here does not mean a product is integrated or validated.
 *
 * Titles and link labels are proper names and stay untranslated; section
 * names, summaries and the reason for each source are translated
 * (`messages.results.sourceSections` and `messages.results.sourceReasons`).
 */

export type SourceGroup = 'app' | 'research';

export const SOURCE_SECTIONS = [
  { id: 'ephemeris', group: 'app' },
  { id: 'sites', group: 'app' },
  { id: 'mission', group: 'app' },
  { id: 'terrain', group: 'app' },
  { id: 'apollo', group: 'app' },
  { id: 'models', group: 'app' },
  { id: 'challenge', group: 'research' },
  { id: 'polarTerrain', group: 'research' },
  { id: 'imagery', group: 'research' },
  { id: 'frames', group: 'research' },
  { id: 'illumination', group: 'research' },
  { id: 'environment', group: 'research' },
  { id: 'historic', group: 'research' },
] as const satisfies readonly { id: string; group: SourceGroup }[];

export type SourceSectionId = (typeof SOURCE_SECTIONS)[number]['id'];

/** A secondary link of the same source (mirror, related file or paper). */
export interface SourceLink {
  readonly label: string;
  readonly url: string;
}

export interface SourceEntry {
  readonly id: string;
  readonly section: SourceSectionId;
  readonly title: string;
  readonly url: string;
  readonly links?: readonly SourceLink[];
}

export const SOURCE_CATALOG = [
  // ── App: Sun and Earth positions ──
  {
    id: 'horizonsApi',
    section: 'ephemeris',
    title: 'JPL Horizons API',
    url: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
  },
  {
    id: 'horizonsManual',
    section: 'ephemeris',
    title: 'JPL Horizons System manual',
    url: 'https://ssd.jpl.nasa.gov/horizons/manual.html',
  },
  {
    id: 'jplApiPolicy',
    section: 'ephemeris',
    title: 'JPL SSD/CNEOS API service',
    url: 'https://ssd-api.jpl.nasa.gov/',
  },
  {
    id: 'moonOrbit',
    section: 'ephemeris',
    title: "NASA GSFC, F. Espenak: Eclipses and the Moon's Orbit",
    url: 'https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html',
  },

  // ── App: mission feasibility screening (shared/missionAssessment.ts) ──
  {
    id: 'iau2015B3',
    section: 'mission',
    title: 'IAU 2015 Resolution B3: Recommended Nominal Conversion Constants for Selected Solar and Planetary Properties (Prša et al. 2016)',
    url: 'https://arxiv.org/abs/1510.07674',
  },
  {
    id: 'iau2012B2',
    section: 'mission',
    title: 'IAU 2012 Resolution B2: re-definition of the astronomical unit of length',
    url: 'https://www.iau.org/Iau/Publications/List-of-Resolutions',
  },
  {
    id: 'siBrochure',
    section: 'mission',
    title: 'BIPM: The International System of Units (SI Brochure, 9th edition)',
    url: 'https://www.bipm.org/en/publications/si-brochure',
  },
  {
    id: 'ituP525',
    section: 'mission',
    title: 'ITU-R Recommendation P.525: Calculation of free-space attenuation',
    url: 'https://www.itu.int/rec/R-REC-P.525/en',
  },

  // ── App: reference sites ──
  {
    id: 'lunarSurfaceDataBook',
    section: 'sites',
    title: 'NASA Moon to Mars Lunar Surface Data Book (M2M-30044), table A2.1-1',
    url: 'https://ntrs.nasa.gov/citations/20250002845',
    links: [
      {
        label: 'PDF',
        url: 'https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf',
      },
    ],
  },
  {
    id: 'nssdcaLandingSites',
    section: 'sites',
    title: 'NASA/NSSDCA Apollo Landing Site Coordinates',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },

  // ── App: 3D terrain ──
  {
    id: 'pgda78',
    section: 'terrain',
    title:
      'NASA GSFC PGDA product 78: LRO/LOLA local 5 m topography (Site04, Site06, DM1, DM2, Haworth, LM2, LM7, NPA, NPD)',
    url: 'https://pgda.gsfc.nasa.gov/products/78',
  },
  {
    id: 'pgda78Readme',
    section: 'terrain',
    title: 'NASA GSFC PGDA LOLA 5 m/pixel README',
    url: 'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README',
  },
  {
    id: 'barker2021',
    section: 'terrain',
    title: 'Barker et al. (2021), Planetary and Space Science 203, 105119',
    url: 'https://doi.org/10.1016/j.pss.2020.105119',
    links: [
      {
        label: 'NTRS PDF',
        url: 'https://ntrs.nasa.gov/api/citations/20205009660/downloads/Mike%20Barker_%20Paper_%20Improved%20Lola.pdf',
      },
    ],
  },
  {
    id: 'apolloTerrain',
    section: 'terrain',
    title: 'LRO/LROC NAC_DTM_APOLLO11',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO11',
    links: [
      { label: 'NAC_DTM_APOLLO11_CONF', url: 'https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11_CONF' },
      {
        label: 'NAC_DTM_APOLLO11_M150361817_2M',
        url: 'https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11_M150361817_2M',
      },
    ],
  },
  {
    id: 'lrocProcessingGuide',
    section: 'terrain',
    title: 'LROC NAC Processing Guide',
    url: 'https://www.lroc.asu.edu/data/support/downloads/LROC_NAC_Processing_Guide.pdf',
  },
  {
    id: 'lroCoordinateSystem',
    section: 'terrain',
    title: 'LRO Project coordinate system standard',
    url: 'https://pds-imaging.jpl.nasa.gov/documentation/LRO_Coordinate_System.pdf',
  },
  {
    id: 'blenderGltf',
    section: 'terrain',
    title: 'Blender manual: glTF 2.0 importer/exporter',
    url: 'https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html',
  },

  // ── App: Apollo 11 reenactment ──
  {
    id: 'apolloLanding',
    section: 'apollo',
    title: 'NASA/NSSDCA Apollo 11 mission catalogue',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html',
  },
  {
    id: 'alsjStep',
    section: 'apollo',
    title: 'Apollo Lunar Surface Journal: "One Small Step"',
    url: 'https://apollojournals.org/alsj/a11/a11.step.html',
    links: [{ label: 'nasa.gov', url: 'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.step.html' }],
  },
  {
    id: 'alsjLaunch',
    section: 'apollo',
    title: 'Apollo Lunar Surface Journal: "The Return to Orbit"',
    url: 'https://apollojournals.org/alsj/a11/a11.launch.html',
  },
  {
    id: 'nasaFlagHistory',
    section: 'apollo',
    title: 'NASA History: Flag Day, Flying High, the Stars and Stripes in Space',
    url: 'https://www.nasa.gov/history/flag-day-flying-high-the-stars-and-stripes-in-space/',
  },
  {
    id: 'nasaApolloProgram',
    section: 'apollo',
    title: 'NASA: The Apollo Program',
    url: 'https://www.nasa.gov/the-apollo-program/',
  },
  {
    id: 'grcMoonGravity',
    section: 'apollo',
    title: "NASA Glenn Beginner's Guide to Aeronautics: the Moon",
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/moon/',
  },
  {
    id: 'alsjLittleWest',
    section: 'apollo',
    title: 'Apollo Lunar Surface Journal: Little West and USGS mapping',
    url: 'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11EastCraterRIP.html',
  },
  {
    id: 'lrocApolloExhibit',
    section: 'apollo',
    title: 'LROC exhibit: Apollo 11 site and West crater',
    url: 'https://lroc.im-ldi.com/visit/exhibits/1/gallery/8',
  },

  // ── App: Sun, Earth and Moon models ──
  {
    id: 'svsMoonKit',
    section: 'models',
    title: 'NASA SVS CGI Moon Kit (ID 4720)',
    url: 'https://svs.gsfc.nasa.gov/4720/',
  },
  {
    id: 'svsBlueMarble',
    section: 'models',
    title: 'NASA SVS Blue Marble (ID 2915)',
    url: 'https://svs.gsfc.nasa.gov/2915/',
  },
  {
    id: 'nasaMediaGuidelines',
    section: 'models',
    title: 'NASA Images and Media Usage Guidelines',
    url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  },

  // ── Research: challenge, rules and data use ──
  {
    id: 'spaceAppsChallenge',
    section: 'challenge',
    title: 'NASA Space Apps Challenge 2026: Lunar Landing Site Navigator',
    url: 'https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/',
  },
  {
    id: 'spaceAppsLegal',
    section: 'challenge',
    title: 'NASA Space Apps Challenge: legal terms',
    url: 'https://www.spaceappschallenge.org/legal/',
  },
  {
    id: 'pdsFaq',
    section: 'challenge',
    title: 'NASA PDS Geosciences: FAQ (data access and use)',
    url: 'https://pds-geosciences.wustl.edu/faq.html',
  },

  // ── Research: south-pole terrain evaluated ──
  {
    id: 'pgda90',
    section: 'polarTerrain',
    title: 'NASA GSFC PGDA product 90: adjusted regional LOLA topography',
    url: 'https://pgda.gsfc.nasa.gov/products/90',
    links: [{ label: 'doi:10.60903/gsfcpgda-lola-spole', url: 'https://doi.org/10.60903/gsfcpgda-lola-spole' }],
  },
  {
    id: 'barker2023',
    section: 'polarTerrain',
    title: 'Barker et al. (2023), A New View of the Lunar South Pole from LOLA, PSJ 4, 183',
    url: 'https://doi.org/10.3847/PSJ/acf3e1',
    links: [{ label: 'NTRS 20230014419', url: 'https://ntrs.nasa.gov/citations/20230014419' }],
  },
  {
    id: 'pgda81',
    section: 'polarTerrain',
    title: 'NASA GSFC PGDA product 81: LOLA 87–90° S 5 m mosaic',
    url: 'https://pgda.gsfc.nasa.gov/products/81',
  },
  {
    id: 'pgda104',
    section: 'polarTerrain',
    title: 'NASA GSFC PGDA product 104: LOLA + LROC shape from shading',
    url: 'https://pgda.gsfc.nasa.gov/products/104',
    links: [{ label: 'Bertone et al., doi:10.3847/PSJ/ae5b70', url: 'https://doi.org/10.3847/PSJ/ae5b70' }],
  },
  {
    id: 'sfsArchive',
    section: 'polarTerrain',
    title: 'Zenodo record 17954508: shape-from-shading terrain archive',
    url: 'https://zenodo.org/records/17954508',
    links: [{ label: 'README', url: 'https://zenodo.org/records/17954508/files/README.md?download=1' }],
  },
  {
    id: 'pdsLola',
    section: 'polarTerrain',
    title: 'NASA PDS Geosciences: LRO LOLA archive',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  },
  {
    id: 'lolaPolarGdr',
    section: 'polarTerrain',
    title: 'NASA PDS: LOLA polar gridded elevation (LDEM_80S_20M, LDEM_875S_5M)',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/',
    links: [
      {
        label: 'LDEM_80S_20M.LBL',
        url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.lbl',
      },
      {
        label: 'LDEM_875S_5M.LBL',
        url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_875s_5m.lbl',
      },
    ],
  },
  {
    id: 'lolaRdrSis',
    section: 'polarTerrain',
    title: 'LOLA RDR Software Interface Specification',
    url: 'https://science.nasa.gov/wp-content/uploads/2024/01/lola-rdrsis.pdf',
  },
  {
    id: 'lolaArchiveSis',
    section: 'polarTerrain',
    title: 'NASA PDS: LOLA archive Software Interface Specification',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/archsis.htm',
  },
  {
    id: 'lolaInstrument',
    section: 'polarTerrain',
    title: 'LOLA instrument paper, Geophysical Research Letters (doi:10.1029/2010GL043751)',
    url: 'https://doi.org/10.1029/2010GL043751',
  },
  {
    id: 'sldem2015',
    section: 'polarTerrain',
    title: 'SLDEM2015 (LOLA + Kaguya), NASA PDS',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/',
  },
  {
    id: 'lrocNac',
    section: 'polarTerrain',
    title: 'LROC NAC DTM footprints (SHAPEFILE_NAC_DTMS)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_NAC_DTMS',
    links: [
      { label: 'NAC_DTM_NOBILE01', url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_NOBILE01' },
      { label: 'NAC_DTM_SHACKRDGE02', url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_SHACKRDGE02' },
    ],
  },
  {
    id: 'usgsNacStereo',
    section: 'polarTerrain',
    title: 'USGS: Extracting accurate and precise topography from LROC Narrow Angle Camera stereo',
    url: 'https://www.usgs.gov/publications/extracting-accurate-and-precise-topography-lroc-narrow-angle-camera-stereo',
  },
  {
    id: 'lrocGld100',
    section: 'polarTerrain',
    title: 'LROC WAC GLD100',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100',
  },
  {
    id: 'kaguyaDtm',
    section: 'polarTerrain',
    title: 'USGS Kaguya Terrain Camera DTMs',
    url: 'https://stac.astrogeology.usgs.gov/docs/data/moon/kaguyatc_dtms/',
    links: [
      { label: 'JAXA DARTS Kaguya', url: 'https://darts.isas.jaxa.jp/missions/kaguya' },
      {
        label: 'PDS ODE guide',
        url: 'https://ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/KAGUYA%20%28SELENE%29/TC/Derived_Data.htm',
      },
    ],
  },

  // ── Research: polar imagery and maps ──
  {
    id: 'nacPoleControlled',
    section: 'imagery',
    title: 'LROC NAC controlled south-pole mosaic (NAC_POLE_SOUTH_CM_MAX)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH_CM_MAX',
  },
  {
    id: 'nacPoleUncontrolled',
    section: 'imagery',
    title: 'LROC NAC uncontrolled south-pole mosaic (NAC_POLE_SOUTH)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_SOUTH',
  },
  {
    id: 'nacPolePsr',
    section: 'imagery',
    title: 'LROC NAC permanently shadowed regions mosaic (NAC_POLE_PSR_SOUTH)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_POLE_PSR_SOUTH',
  },
  {
    id: 'shadowCamArchive',
    section: 'imagery',
    title: 'ShadowCam archive',
    url: 'https://shadowcam.im-ldi.com/archive',
    links: [{ label: 'ShadowCam cmosaic', url: 'https://pds.shadowcam.im-ldi.com/derived/cmosaic/' }],
  },
  {
    id: 'shadowCam',
    section: 'imagery',
    title: 'NASA ShadowCam: Shackleton',
    url: 'https://science.nasa.gov/image-article/apod-2023-may-5-shackleton-from-shadowcam/',
  },
  {
    id: 'moonTrek',
    section: 'imagery',
    title: 'NASA Moon Trek',
    url: 'https://trek.nasa.gov/moon/',
    links: [{ label: 'Moon Trek WMTS API', url: 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html' }],
  },

  // ── Research: reference frames and computation ──
  {
    id: 'lunarCoordinateWhitePaper',
    section: 'frames',
    title: 'LRO/LGCWG: A Standardized Lunar Coordinate System (version 5, 2008)',
    url: 'https://science.nasa.gov/wp-content/uploads/2024/01/luncoordwhitepaper-10-08.pdf',
  },
  {
    id: 'pgda95',
    section: 'frames',
    title: 'NASA GSFC PGDA product 95: MOON_PA shape and frame transformations',
    url: 'https://pgda.gsfc.nasa.gov/products/95',
  },
  {
    id: 'naifFrameKernel',
    section: 'frames',
    title: 'NAIF lunar frame kernel moon_de440_250416.tf',
    url: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf',
  },
  {
    id: 'naifSpice',
    section: 'frames',
    title: 'NAIF SPICE Toolkit: azlcpo',
    url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html',
    links: [
      { label: 'str2et', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/str2et_c.html' },
      { label: 'latrec', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/latrec_c.html' },
      { label: 'illumf', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/illumf_c.html' },
      { label: 'ilumin', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/ilumin_c.html' },
      { label: 'occult', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/occult_c.html' },
      { label: 'sincpt', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/sincpt_c.html' },
      { label: 'dskx02', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/dskx02_c.html' },
      { label: 'DSK Required Reading', url: 'https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/dsk.html' },
    ],
  },
  {
    id: 'projStere',
    section: 'frames',
    title: 'PROJ: stereographic projection',
    url: 'https://proj.org/en/stable/operations/projections/stere.html',
  },
  {
    id: 'gdal',
    section: 'frames',
    title: 'GDAL: gdalinfo',
    url: 'https://gdal.org/en/stable/programs/gdalinfo.html',
    links: [
      { label: 'GDAL GTiff driver', url: 'https://gdal.org/en/stable/drivers/raster/gtiff.html' },
      { label: 'GDAL virtual file systems', url: 'https://gdal.org/en/stable/user/virtual_file_systems.html' },
    ],
  },

  // ── Research: light, horizon and communications ──
  {
    id: 'pgda69',
    section: 'illumination',
    title: 'NASA GSFC PGDA product 69: polar illumination and Earth visibility',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
  },
  {
    id: 'mazarico2011',
    section: 'illumination',
    title: 'Mazarico et al. (2011), Icarus: lunar polar illumination',
    url: 'https://doi.org/10.1016/j.icarus.2010.10.030',
  },
  {
    id: 'bryantIpn',
    section: 'illumination',
    title: 'JPL IPN Progress Report 42-176 (Bryant)',
    url: 'https://ipnpr.jpl.nasa.gov/progress_report/42-176/176C.html',
  },
  {
    id: 'minow2023',
    section: 'illumination',
    title: 'NASA lunar environment presentation (Minow, SciTech 2023)',
    url: 'https://ntrs.nasa.gov/api/citations/20230000854/downloads/Minow_SciTech_2023%20-%20presentation%20-%20final.pdf',
  },
  {
    id: 'dsn810',
    section: 'illumination',
    title: 'DSN Telecommunications Link Design Handbook 810-005',
    url: 'https://deepspace.jpl.nasa.gov/dsndocs/810-005/',
  },
  {
    id: 'glennPropagation',
    section: 'illumination',
    title: 'NASA Glenn: lunar surface propagation',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/',
  },

  // ── Research: lunar environment ──
  {
    id: 'hlsThermal',
    section: 'environment',
    title: 'HLS Lunar Thermal Analysis Guidebook',
    url: 'https://ntrs.nasa.gov/citations/20210010030',
  },
  {
    id: 'diviner',
    section: 'environment',
    title: 'NASA PDS Geosciences: LRO Diviner archive',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm',
    links: [{ label: 'Diviner (UCLA)', url: 'https://www.diviner.ucla.edu/data' }],
  },
  {
    id: 'lcross',
    section: 'environment',
    title: 'NASA LCROSS',
    url: 'https://science.nasa.gov/mission/lcross/',
  },
  {
    id: 'moonWater',
    section: 'environment',
    title: 'NASA: Moon water and ices',
    url: 'https://science.nasa.gov/moon/moon-water-and-ices/',
  },
  {
    id: 'zuberShackleton',
    section: 'environment',
    title: 'Zuber et al.: Shackleton crater (NASA NTRS 20120013758)',
    url: 'https://ntrs.nasa.gov/api/citations/20120013758/downloads/20120013758.pdf',
  },
  {
    id: 'gazetteer',
    section: 'environment',
    title: 'USGS Gazetteer of Planetary Nomenclature',
    url: 'https://www.usgs.gov/tools/gazetteer-planetary-nomenclature',
    links: [{ label: 'Nobile, Feature 4321', url: 'https://planetarynames.wr.usgs.gov/Feature/4321' }],
  },
  {
    id: 'landingHazard',
    section: 'environment',
    title: 'NASA/JPL landing hazard detection (NTRS 20110003001)',
    url: 'https://ntrs.nasa.gov/citations/20110003001',
  },

  // ── Research: Apollo 11 historical context ──
  {
    id: 'sp4029Landing',
    section: 'historic',
    title: 'NASA SP-4029: Apollo LM lunar landing table',
    url: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-27_LM_Lunar_Landing.htm',
  },
  {
    id: 'lrocApollo11Mapping',
    section: 'historic',
    title: 'LROC Apollo 11 Spatio-Temporal Mapping (SHAPEFILE_APOLLO_11)',
    url: 'https://data.lroc.im-ldi.com/lroc/view_rdr/SHAPEFILE_APOLLO_11',
  },
  {
    id: 'nasaLunarModule3d',
    section: 'historic',
    title: 'NASA 3D Resources: Apollo Lunar Module',
    url: 'https://science.nasa.gov/3d-resources/apollo-lunar-module/',
  },
  {
    id: 'spacecraftDimensions',
    section: 'historic',
    title: 'NASA spacecraft dimensions reference (NTRS 19940023701)',
    url: 'https://ntrs.nasa.gov/api/citations/19940023701/downloads/19940023701.pdf',
  },
] as const satisfies readonly SourceEntry[];

export type SourceId = (typeof SOURCE_CATALOG)[number]['id'];

