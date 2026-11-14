/**
 * Visible UI text. Spanish is the default; English must provide every key
 * (enforced by the `Messages` type). Keep component text here, not inline.
 *
 * The main screen assumes a user who knows the task: explanations live in the
 * per-section help dialogs (`info` paragraphs), not in the layout.
 *
 * Site names and source titles are proper nouns and are not translated.
 */

import type { ApiErrorCode } from '../../shared/ephemeris.js';
import type { PresenceState } from '../../shared/presence.js';
import type { EffectMode } from '../preferences/preferences';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export type ClientErrorKey = ApiErrorCode | 'NETWORK' | 'UNEXPECTED_RESPONSE';

/** Help dialog paragraphs for a section. */
type Paragraphs = readonly string[];

export interface Messages {
  readonly app: { readonly title: string };
  /** Section headings, drawn with block letters. */
  readonly banner: { readonly config: string; readonly horizon: string };
  /** Short bracketed status tags shown next to headings. */
  readonly status: {
    readonly sample: string;
    readonly live: string;
    readonly stale: string;
    readonly loading: string;
    readonly error: string;
    readonly sampleDetail: string;
    readonly liveDetail: string;
    readonly staleDetail: string;
  };
  readonly common: {
    /** Accessible name of the help button of a section. */
    readonly help: (section: string) => string;
    readonly close: string;
  };
  readonly settings: {
    readonly heading: string;
    readonly effects: string;
    readonly effectStates: Readonly<Record<EffectMode, string>>;
    /** Short value shown on the sidebar switch (at most 4 characters). */
    readonly effectGlyphs: Readonly<Record<EffectMode, string>>;
    readonly language: string;
    /** Fits under the sidebar button. */
    readonly languageShort: string;
    readonly languageNames: Readonly<Record<Locale, string>>;
    readonly setup: string;
    /** Accessible label: "<setting>: <current value>. Activate to change." */
    readonly cycle: (setting: string, value: string) => string;
  };
  readonly setup: {
    readonly language: string;
    readonly effects: string;
    readonly start: Readonly<Record<EffectMode, string>>;
    readonly startDetail: Readonly<Record<EffectMode, string>>;
  };
  readonly config: {
    readonly site: string;
    readonly siteInfo: Paragraphs;
    /** Box tag shown while the coordinates match no reference site. */
    readonly customTag: string;
    /** Display name of user-entered coordinates. */
    readonly customName: string;
    readonly search: string;
    readonly searchPlaceholder: string;
    /** Confirms how custom coordinates were read. */
    readonly searchReading: (coordinates: string) => string;
    readonly searchErrors: {
      readonly empty: string;
      readonly format: string;
      readonly latitude: string;
      readonly longitude: string;
      readonly ambiguous: (names: string) => string;
    };
    readonly dateTime: string;
    readonly dateTimeInfo: Paragraphs;
    readonly date: string;
    readonly time: string;
    readonly timeZone: string;
    /** Option for UTC, the time standard NASA uses for launches. */
    readonly zoneUtc: string;
    /** Option for the browser's own time zone; `id` is its IANA identifier (e.g. Europe/Madrid). */
    readonly zoneLocal: (id: string) => string;
    readonly zoneUtcHint: string;
    /** Offset of the local zone at the chosen date (e.g. `UTC+01:00`) and the same instant in UTC. */
    readonly zoneLocalHint: (offset: string, utc: string) => string;
    readonly update: string;
    readonly updating: string;
    /** Shown on the disabled button while the view matches the selection. */
    readonly upToDate: string;
    readonly invalidTime: string;
    /** The local time falls in a daylight-saving gap. */
    readonly nonexistentTime: string;
  };
  readonly compass: { readonly north: string; readonly east: string; readonly south: string; readonly west: string };
  readonly hemisphere: { readonly north: string; readonly south: string; readonly east: string; readonly west: string };
  readonly bodies: { readonly sun: string; readonly earth: string };
  readonly scene: {
    readonly heading: string;
    readonly info: Paragraphs;
    readonly notToScale: string;
    readonly loading: string;
    readonly missing: (body: string) => string;
  };
  readonly results: {
    readonly heading: string;
    readonly info: Paragraphs;
    readonly object: string;
    readonly azimuth: string;
    readonly elevation: string;
    readonly state: string;
    readonly noValue: string;
    readonly bodyError: string;
    readonly terrainWarning: string;
    readonly provenanceSample: (retrievedAt: string) => string;
    readonly provenanceLive: (retrievedAt: string) => string;
    readonly sources: string;
    readonly siteSource: string;
    readonly siteSourceCustom: string;
    readonly coordinates: string;
    readonly positionSource: string;
    readonly partial: string;
    readonly versionUnverified: string;
  };
  readonly presence: {
    readonly sun: Readonly<Record<PresenceState, string>>;
    readonly earth: Readonly<Record<PresenceState, string>>;
    /** Compact state shown in the table; the full sentence is its tooltip. */
    readonly short: Readonly<Record<PresenceState, string>>;
    readonly earthStraddles: string;
    readonly earthStraddlesShort: string;
  };
  readonly errors: Readonly<Record<ClientErrorKey, string>>;
}

const es: Messages = {
  app: { title: 'CLPS Lunar Mission Browser' },
  banner: { config: 'Control', horizon: 'Horizonte' },
  status: {
    sample: 'MUESTRA',
    live: 'EN VIVO',
    stale: 'PENDIENTE',
    loading: 'CONSULTANDO',
    error: 'ERROR',
    sampleDetail: 'Datos guardados de JPL Horizons',
    liveDetail: 'Consulta a JPL Horizons',
    staleDetail: 'La selección ha cambiado. Pulsa «Actualizar vista» para recalcular.',
  },
  common: {
    help: (section) => `Ayuda: ${section}`,
    close: 'Cerrar',
  },
  settings: {
    heading: 'Ajustes',
    effects: 'Efectos visuales',
    effectStates: { on: 'Completos', off: 'Bajo rendimiento' },
    effectGlyphs: { on: 'ALTO', off: 'BAJO' },
    language: 'Idioma',
    languageShort: 'IDIOMA',
    languageNames: { es: 'Español', en: 'English' },
    setup: 'Pantalla de inicio',
    cycle: (setting, value) => `${setting}: ${value}. Pulsa para cambiar.`,
  },
  setup: {
    language: 'Idioma',
    effects: 'Efectos visuales',
    start: { on: 'Efectos completos', off: 'Bajo rendimiento' },
    startDetail: { on: 'CRT animado con curvatura', off: 'Estático, fuente de alta visibilidad, menos CPU' },
  },
  config: {
    site: 'Punto de referencia',
    siteInfo: [
      'Elige el punto del polo sur lunar desde el que se calcula el cielo.',
      'Son los centros de regiones candidatas publicadas por NASA (Lunar Surface Data Book). No son lugares de aterrizaje aprobados.',
      'También puedes escribir unas coordenadas en grados (latitud, longitud; sur y oeste en negativo o con S/O) o buscar un punto por su nombre. Un punto personalizado se calcula con el mismo método, a altura 0 km y sin relieve, y no tiene fuente publicada.',
    ],
    customTag: 'PERSONALIZADO',
    customName: 'Punto personalizado',
    search: 'Coordenadas o nombre',
    searchPlaceholder: '-85.4381, 37.36667 · Shackleton',
    searchReading: (coordinates) => `Punto personalizado: ${coordinates}`,
    searchErrors: {
      empty: 'Escribe unas coordenadas o el nombre de un punto.',
      format: 'Escribe latitud y longitud en grados (p. ej. -85.44, 37.37) o el nombre de un punto.',
      latitude: 'La latitud debe estar entre -90° y 90°.',
      longitude: 'La longitud debe estar entre -180° y 360°.',
      ambiguous: (names) => `Varios puntos coinciden: ${names}.`,
    },
    dateTime: 'Fecha y hora',
    dateTimeInfo: [
      'Fecha y hora entre 2000 y 2099, con la zona horaria que elijas.',
      'UTC es el horario que usa la NASA para los lanzamientos y el que usa el cálculo. «Local» es la zona de tu dispositivo: se convierte a UTC (se muestra la hora UTC equivalente) y cambiar de zona conserva el mismo instante.',
      'Tras cambiar el lugar o la fecha, pulsa «Actualizar vista» para consultar JPL Horizons.',
    ],
    date: 'Fecha',
    time: 'Hora',
    timeZone: 'Zona horaria',
    zoneUtc: 'UTC · NASA (lanzamientos)',
    zoneLocal: (id) => `Local · ${id}`,
    zoneUtcHint: 'UTC es la hora que usa la NASA para los lanzamientos.',
    zoneLocalHint: (offset, utc) => `Hora local (${offset}) = ${utc} UTC.`,
    update: 'Actualizar vista',
    updating: 'Consultando…',
    upToDate: 'Vista actualizada',
    invalidTime: 'Introduce una fecha y hora válidas entre 2000 y 2099.',
    nonexistentTime: 'Esa hora local no existe por el cambio de horario. Elige otra hora.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'O' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'O' },
  bodies: { sun: 'Sol', earth: 'Tierra' },
  scene: {
    heading: 'Horizonte local',
    info: [
      'Arrastra para girar la vista; usa la rueda o pellizca para acercar o alejar.',
      'Las líneas discontinuas van del observador al Sol y a la Tierra. Los tamaños no están a escala y el relieve no está incluido.',
    ],
    notToScale: 'No a escala',
    loading: 'Cargando vista 3D…',
    missing: (body) => `${body}: sin dato para dibujar.`,
  },
  results: {
    heading: 'Datos',
    info: [
      'Azimut: ángulo medido desde el norte en sentido horario.',
      'Elevación: altura del centro del objeto sobre el plano horizontal de referencia (altura 0 km), sin refracción.',
      'Estado: indicador de JPL Horizons sobre si el borde superior del objeto queda sobre ese horizonte de referencia. No garantiza que se vea desde el terreno real.',
    ],
    object: 'Objeto',
    azimuth: 'Azimut',
    elevation: 'Elevación',
    state: 'Estado',
    noValue: 'Sin dato',
    bodyError: 'No se pudo obtener este dato.',
    terrainWarning: 'Posiciones geométricas. El modelo no incluye montañas ni cráteres del lugar.',
    provenanceSample: (date) => `Muestra guardada de JPL Horizons (obtenida el ${date}). No es una consulta en vivo.`,
    provenanceLive: (date) => `Consulta a JPL Horizons obtenida el ${date}.`,
    sources: 'Fuentes',
    siteSource: 'Punto de referencia',
    siteSourceCustom: 'coordenadas introducidas a mano, sin fuente publicada',
    coordinates: 'Coordenadas',
    positionSource: 'Posiciones',
    partial: 'Resultado incompleto: uno de los objetos no se pudo calcular.',
    versionUnverified: 'Horizons devolvió una versión de API no comprobada; revisa los valores.',
  },
  presence: {
    sun: {
      'upper-limb-above-reference-horizon': 'El borde superior del Sol está sobre el horizonte de referencia.',
      'below-reference-horizon': 'El Sol está por debajo del horizonte de referencia.',
      unknown: 'Horizons no indica si el Sol está sobre el horizonte de referencia.',
    },
    earth: {
      'upper-limb-above-reference-horizon': 'El borde superior de la Tierra está sobre el horizonte de referencia.',
      'below-reference-horizon': 'La Tierra está por debajo del horizonte de referencia.',
      unknown: 'Horizons no indica si la Tierra está sobre el horizonte de referencia.',
    },
    short: {
      'upper-limb-above-reference-horizon': '▲ Borde sobre el horizonte',
      'below-reference-horizon': '▼ Bajo el horizonte',
      unknown: '? Sin indicación',
    },
    earthStraddles: 'Su centro queda bajo el plano geométrico, así que parte del disco queda a cada lado.',
    earthStraddlesShort: 'centro bajo el plano',
  },
  errors: {
    INVALID_REQUEST: 'La selección no es válida. Revisa el lugar y la fecha.',
    METHOD_NOT_ALLOWED: 'Petición no admitida por el servidor.',
    UPSTREAM_UNAVAILABLE: 'JPL Horizons no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.',
    UPSTREAM_REJECTED: 'JPL Horizons rechazó la consulta.',
    UPSTREAM_FORMAT: 'JPL Horizons respondió en un formato inesperado.',
    INTERNAL: 'Error interno del servidor.',
    NETWORK: 'No se pudo contactar con el servidor de la aplicación.',
    UNEXPECTED_RESPONSE: 'El servidor de la aplicación respondió de forma inesperada.',
  },
};

const en: Messages = {
  app: { title: 'CLPS Lunar Mission Browser' },
  banner: { config: 'Control', horizon: 'Horizon' },
  status: {
    sample: 'SAMPLE',
    live: 'LIVE',
    stale: 'PENDING',
    loading: 'QUERYING',
    error: 'ERROR',
    sampleDetail: 'Saved JPL Horizons data',
    liveDetail: 'JPL Horizons query',
    staleDetail: 'The selection changed. Press “Update view” to recalculate.',
  },
  common: {
    help: (section) => `Help: ${section}`,
    close: 'Close',
  },
  settings: {
    heading: 'Settings',
    effects: 'Visual effects',
    effectStates: { on: 'Full', off: 'Low performance' },
    effectGlyphs: { on: 'HIGH', off: 'LOW' },
    language: 'Language',
    languageShort: 'LANG',
    languageNames: { es: 'Español', en: 'English' },
    setup: 'Start screen',
    cycle: (setting, value) => `${setting}: ${value}. Press to change.`,
  },
  setup: {
    language: 'Language',
    effects: 'Visual effects',
    start: { on: 'Full effects', off: 'Low performance' },
    startDetail: { on: 'Animated, curved CRT', off: 'Static, high-visibility font, less CPU' },
  },
  config: {
    site: 'Reference point',
    siteInfo: [
      'Choose the lunar south-pole point the sky is computed from.',
      'They are the centers of candidate regions published by NASA (Lunar Surface Data Book). They are not approved landing sites.',
      'You can also type coordinates in degrees (latitude, longitude; south and west negative or with S/W) or search a point by name. A custom point is computed with the same method, at 0 km height and without terrain, and has no published source.',
    ],
    customTag: 'CUSTOM',
    customName: 'Custom point',
    search: 'Coordinates or name',
    searchPlaceholder: '-85.4381, 37.36667 · Shackleton',
    searchReading: (coordinates) => `Custom point: ${coordinates}`,
    searchErrors: {
      empty: 'Type coordinates or the name of a point.',
      format: 'Type latitude and longitude in degrees (e.g. -85.44, 37.37) or the name of a point.',
      latitude: 'Latitude must be between -90° and 90°.',
      longitude: 'Longitude must be between -180° and 360°.',
      ambiguous: (names) => `Several points match: ${names}.`,
    },
    dateTime: 'Date and time',
    dateTimeInfo: [
      'Date and time between 2000 and 2099, in the time zone you choose.',
      'UTC is the time standard NASA uses for launches and the one the calculation uses. “Local” is your device’s time zone: it is converted to UTC (the equivalent UTC time is shown) and switching zones keeps the same instant.',
      'After changing the place or the date, press “Update view” to query JPL Horizons.',
    ],
    date: 'Date',
    time: 'Time',
    timeZone: 'Time zone',
    zoneUtc: 'UTC · NASA (launches)',
    zoneLocal: (id) => `Local · ${id}`,
    zoneUtcHint: 'UTC is the time NASA uses for launches.',
    zoneLocalHint: (offset, utc) => `Local time (${offset}) = ${utc} UTC.`,
    update: 'Update view',
    updating: 'Querying…',
    upToDate: 'View up to date',
    invalidTime: 'Enter a valid date and time between 2000 and 2099.',
    nonexistentTime: 'That local time does not exist because of a daylight-saving change. Pick another time.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'W' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'W' },
  bodies: { sun: 'Sun', earth: 'Earth' },
  scene: {
    heading: 'Local horizon',
    info: [
      'Drag to rotate the view; use the wheel or pinch to zoom in or out.',
      'The dashed lines run from the observer to the Sun and the Earth. Sizes are not to scale and terrain is not included.',
    ],
    notToScale: 'Not to scale',
    loading: 'Loading 3D view…',
    missing: (body) => `${body}: no data to draw.`,
  },
  results: {
    heading: 'Data',
    info: [
      'Azimuth: angle measured clockwise from north.',
      'Elevation: height of the object center above the horizontal reference plane (0 km height), no refraction.',
      'State: JPL Horizons flag telling whether the upper edge of the object is above that reference horizon. It does not guarantee the object is visible from the real terrain.',
    ],
    object: 'Object',
    azimuth: 'Azimuth',
    elevation: 'Elevation',
    state: 'State',
    noValue: 'No data',
    bodyError: 'This value could not be retrieved.',
    terrainWarning: 'Geometric positions. The model does not include the mountains or craters of the site.',
    provenanceSample: (date) => `Saved JPL Horizons sample (retrieved ${date}). Not a live query.`,
    provenanceLive: (date) => `JPL Horizons query retrieved ${date}.`,
    sources: 'Sources',
    siteSource: 'Reference point',
    siteSourceCustom: 'coordinates typed by hand, no published source',
    coordinates: 'Coordinates',
    positionSource: 'Positions',
    partial: 'Incomplete result: one of the objects could not be computed.',
    versionUnverified: 'Horizons returned an unverified API version; check the values.',
  },
  presence: {
    sun: {
      'upper-limb-above-reference-horizon': 'The upper edge of the Sun is above the reference horizon.',
      'below-reference-horizon': 'The Sun is below the reference horizon.',
      unknown: 'Horizons does not say whether the Sun is above the reference horizon.',
    },
    earth: {
      'upper-limb-above-reference-horizon': 'The upper edge of the Earth is above the reference horizon.',
      'below-reference-horizon': 'The Earth is below the reference horizon.',
      unknown: 'Horizons does not say whether the Earth is above the reference horizon.',
    },
    short: {
      'upper-limb-above-reference-horizon': '▲ Edge above horizon',
      'below-reference-horizon': '▼ Below horizon',
      unknown: '? No flag',
    },
    earthStraddles: 'Its center is below the geometric plane, so part of the disk lies on each side.',
    earthStraddlesShort: 'center below the plane',
  },
  errors: {
    INVALID_REQUEST: 'The selection is not valid. Check the place and date.',
    METHOD_NOT_ALLOWED: 'Request not supported by the server.',
    UPSTREAM_UNAVAILABLE: 'JPL Horizons is unavailable right now. Try again in a few minutes.',
    UPSTREAM_REJECTED: 'JPL Horizons rejected the query.',
    UPSTREAM_FORMAT: 'JPL Horizons answered in an unexpected format.',
    INTERNAL: 'Internal server error.',
    NETWORK: 'Could not reach the application server.',
    UNEXPECTED_RESPONSE: 'The application server answered unexpectedly.',
  },
};

export const MESSAGES: Readonly<Record<Locale, Messages>> = { es, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
