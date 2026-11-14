/**
 * Visible UI text. Spanish is the default; English must provide every key
 * (enforced by the `Messages` type). Keep component text here, not inline.
 *
 * Site names and source titles are proper nouns and are not translated.
 */

import type { ApiErrorCode } from '../../shared/ephemeris.js';
import type { PresenceState } from '../../shared/presence.js';
import type { EffectLevel, FontStyle } from '../preferences/preferences';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export type ClientErrorKey = ApiErrorCode | 'NETWORK' | 'UNEXPECTED_RESPONSE';

export interface Messages {
  readonly app: {
    readonly title: string;
    readonly tagline: string;
    readonly language: string;
    /** Terminal banner line under the title. */
    readonly system: string;
    readonly clock: string;
  };
  /** Large block-letter headings and their status lines. */
  readonly banner: { readonly config: string; readonly configAside: string; readonly horizon: string };
  /** Short bracketed status tags shown next to headings. */
  readonly status: {
    readonly sample: string;
    readonly live: string;
    readonly stale: string;
    readonly loading: string;
    readonly error: string;
    readonly sampleDetail: string;
    readonly liveDetail: string;
  };
  readonly settings: {
    readonly heading: string;
    readonly effects: string;
    readonly effectLevels: Readonly<Record<EffectLevel, string>>;
    readonly font: string;
    readonly fonts: Readonly<Record<FontStyle, string>>;
    readonly language: string;
    /** Fits under the sidebar button. */
    readonly languageShort: string;
    readonly languageNames: Readonly<Record<Locale, string>>;
    readonly setup: string;
    /** Accessible label: "<setting>: <current value>. Activate to change." */
    readonly cycle: (setting: string, value: string) => string;
  };
  readonly setup: {
    readonly title: string;
    readonly boot: readonly string[];
    readonly cores: (count: number) => string;
    readonly coresUnknown: string;
    readonly ready: string;
    readonly language: string;
    readonly effects: string;
    readonly effectDetail: Readonly<Record<EffectLevel, string>>;
    readonly recommended: string;
    readonly start: string;
    readonly cookieNote: string;
  };
  readonly config: {
    readonly heading: string;
    readonly site: string;
    readonly coordinates: string;
    readonly siteNote: string;
    readonly utc: string;
    readonly utcHint: string;
    readonly update: string;
    readonly updating: string;
    readonly invalidTime: string;
    readonly ai: { readonly heading: string; readonly tag: string; readonly placeholder: string; readonly note: string };
  };
  readonly compass: { readonly north: string; readonly east: string; readonly south: string; readonly west: string };
  readonly hemisphere: { readonly north: string; readonly south: string; readonly east: string; readonly west: string };
  readonly bodies: { readonly sun: string; readonly earth: string };
  readonly scene: {
    readonly heading: string;
    readonly notToScale: string;
    readonly loading: string;
    readonly missing: (body: string) => string;
  };
  readonly results: {
    readonly heading: string;
    readonly place: string;
    readonly time: string;
    readonly azimuth: string;
    readonly elevation: string;
    readonly noValue: string;
    readonly bodyError: string;
    readonly terrainWarning: string;
    readonly stale: string;
    readonly provenanceSample: (retrievedAt: string) => string;
    readonly provenanceLive: (retrievedAt: string) => string;
    readonly sources: string;
    readonly siteSource: string;
    readonly positionSource: string;
    readonly method: string;
    readonly methodDetail: string;
    readonly partial: string;
    readonly versionUnverified: string;
  };
  readonly presence: {
    readonly sun: Readonly<Record<PresenceState, string>>;
    readonly earth: Readonly<Record<PresenceState, string>>;
    readonly earthStraddles: string;
  };
  readonly errors: Readonly<Record<ClientErrorKey, string>>;
}

const es: Messages = {
  app: {
    title: 'CLPS Lunar Mission Browser',
    tagline: 'Sol y Tierra vistos desde puntos de referencia del polo sur lunar',
    language: 'Idioma',
    system: 'NASA Space Apps 2026 · Lunar Landing Site Navigator',
    clock: 'Hora UTC actual',
  },
  banner: { config: 'Control', configAside: 'Elige punto de referencia y fecha.', horizon: 'Horizonte' },
  status: {
    sample: 'MUESTRA',
    live: 'EN VIVO',
    stale: 'PENDIENTE',
    loading: 'CONSULTANDO',
    error: 'ERROR',
    sampleDetail: 'Datos guardados de JPL Horizons',
    liveDetail: 'Consulta a JPL Horizons',
  },
  settings: {
    heading: 'Ajustes',
    effects: 'Efectos',
    effectLevels: { full: 'Completos', lite: 'Ligeros', off: 'Desactivados' },
    font: 'Fuente',
    fonts: { terminal: 'Terminal', readable: 'Legible' },
    language: 'Idioma',
    languageShort: 'IDIOMA',
    languageNames: { es: 'Español', en: 'English' },
    setup: 'Configuración inicial',
    cycle: (setting, value) => `${setting}: ${value}. Pulsa para cambiar.`,
  },
  setup: {
    title: 'Configuración inicial',
    boot: ['CLPS-OS BIOS v0.1 · 2026', 'Comprobando memoria ........ OK', 'Enlace con JPL Horizons ..... EN ESPERA'],
    cores: (count) => `Procesadores detectados ...... ${count}`,
    coresUnknown: 'Procesadores detectados ...... ?',
    ready: 'Elige idioma y nivel de efectos. Podrás cambiarlos luego desde la barra lateral.',
    language: 'Idioma',
    effects: 'Efectos visuales',
    effectDetail: {
      full: 'Paralaje, salto estelar y filtro CRT animado. Recomendado en equipos modernos.',
      lite: 'Fondo estático con líneas de barrido. Rápido en cualquier equipo.',
      off: 'Fondo liso sin superposiciones. Máxima velocidad y legibilidad.',
    },
    recommended: 'recomendado',
    start: 'Iniciar',
    cookieNote: 'Tu elección se guarda en una cookie de este sitio para no volver a preguntarte.',
  },
  config: {
    heading: 'Lugar y fecha',
    site: 'Punto de referencia',
    coordinates: 'Coordenadas',
    siteNote: 'Centro de una región candidata publicada por NASA. No es un lugar de aterrizaje aprobado.',
    utc: 'Fecha y hora (UTC)',
    utcHint: 'Entre 2000 y 2099.',
    update: 'Actualizar vista',
    updating: 'Consultando JPL Horizons…',
    invalidTime: 'Introduce una fecha y hora UTC válidas entre 2000 y 2099.',
    ai: {
      heading: 'Búsqueda IA',
      tag: 'OFFLINE',
      placeholder: 'No disponible en esta demo',
      note: 'Función opcional prevista; todavía no está conectada.',
    },
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'O' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'O' },
  bodies: { sun: 'Sol', earth: 'Tierra' },
  scene: {
    heading: 'Horizonte local',
    notToScale: 'Esquema no a escala. Posiciones geométricas; terreno no incluido.',
    loading: 'Cargando vista 3D…',
    missing: (body) => `${body}: sin dato para dibujar.`,
  },
  results: {
    heading: 'Datos',
    place: 'Lugar',
    time: 'Hora calculada',
    azimuth: 'Azimut',
    elevation: 'Elevación',
    noValue: 'Sin dato',
    bodyError: 'No se pudo obtener este dato.',
    terrainWarning: 'Posiciones geométricas. El modelo no incluye montañas ni cráteres del lugar.',
    stale: 'La selección ha cambiado. Pulsa «Actualizar vista» para recalcular.',
    provenanceSample: (date) => `Muestra guardada de JPL Horizons (obtenida el ${date}). No es una consulta en vivo.`,
    provenanceLive: (date) => `Consulta a JPL Horizons obtenida el ${date}.`,
    sources: 'Fuentes',
    siteSource: 'Punto de referencia',
    positionSource: 'Posiciones',
    method: 'Método',
    methodDetail:
      'Azimut medido desde el norte en sentido horario. Elevación del centro del objeto sobre el plano horizontal de referencia (altura 0 km). Sin refracción.',
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
    earthStraddles: 'Su centro queda bajo el plano geométrico, así que parte del disco queda a cada lado.',
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
  app: {
    title: 'CLPS Lunar Mission Browser',
    tagline: 'The Sun and Earth seen from lunar south-pole reference points',
    language: 'Language',
    system: 'NASA Space Apps 2026 · Lunar Landing Site Navigator',
    clock: 'Current UTC time',
  },
  banner: { config: 'Control', configAside: 'Pick a reference point and a date.', horizon: 'Horizon' },
  status: {
    sample: 'SAMPLE',
    live: 'LIVE',
    stale: 'PENDING',
    loading: 'QUERYING',
    error: 'ERROR',
    sampleDetail: 'Saved JPL Horizons data',
    liveDetail: 'JPL Horizons query',
  },
  settings: {
    heading: 'Settings',
    effects: 'Effects',
    effectLevels: { full: 'Full', lite: 'Lite', off: 'Off' },
    font: 'Font',
    fonts: { terminal: 'Terminal', readable: 'Readable' },
    language: 'Language',
    languageShort: 'LANG',
    languageNames: { es: 'Español', en: 'English' },
    setup: 'Initial setup',
    cycle: (setting, value) => `${setting}: ${value}. Press to change.`,
  },
  setup: {
    title: 'Initial setup',
    boot: ['CLPS-OS BIOS v0.1 · 2026', 'Memory check ................ OK', 'JPL Horizons link ........... STANDBY'],
    cores: (count) => `Processors detected ......... ${count}`,
    coresUnknown: 'Processors detected ......... ?',
    ready: 'Choose a language and an effects level. You can change both later from the sidebar.',
    language: 'Language',
    effects: 'Visual effects',
    effectDetail: {
      full: 'Parallax, star jump and animated CRT filter. Recommended on modern devices.',
      lite: 'Static background with scanlines. Fast on any device.',
      off: 'Plain background, no overlays. Fastest and easiest to read.',
    },
    recommended: 'recommended',
    start: 'Start',
    cookieNote: 'Your choice is saved in a cookie for this site so you are not asked again.',
  },
  config: {
    heading: 'Place and time',
    site: 'Reference point',
    coordinates: 'Coordinates',
    siteNote: 'Center of a candidate region published by NASA. Not an approved landing site.',
    utc: 'Date and time (UTC)',
    utcHint: 'Between 2000 and 2099.',
    update: 'Update view',
    updating: 'Querying JPL Horizons…',
    invalidTime: 'Enter a valid UTC date and time between 2000 and 2099.',
    ai: {
      heading: 'AI search',
      tag: 'OFFLINE',
      placeholder: 'Not available in this demo',
      note: 'Planned optional feature; not connected yet.',
    },
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'W' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'W' },
  bodies: { sun: 'Sun', earth: 'Earth' },
  scene: {
    heading: 'Local horizon',
    notToScale: 'Not to scale. Geometric positions; terrain not included.',
    loading: 'Loading 3D view…',
    missing: (body) => `${body}: no data to draw.`,
  },
  results: {
    heading: 'Data',
    place: 'Place',
    time: 'Computed time',
    azimuth: 'Azimuth',
    elevation: 'Elevation',
    noValue: 'No data',
    bodyError: 'This value could not be retrieved.',
    terrainWarning: 'Geometric positions. The model does not include the mountains or craters of the site.',
    stale: 'The selection changed. Press “Update view” to recalculate.',
    provenanceSample: (date) => `Saved JPL Horizons sample (retrieved ${date}). Not a live query.`,
    provenanceLive: (date) => `JPL Horizons query retrieved ${date}.`,
    sources: 'Sources',
    siteSource: 'Reference point',
    positionSource: 'Positions',
    method: 'Method',
    methodDetail:
      'Azimuth measured clockwise from north. Elevation of the object center above the horizontal reference plane (0 km height). No refraction.',
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
    earthStraddles: 'Its center is below the geometric plane, so part of the disk lies on each side.',
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
