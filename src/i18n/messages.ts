/**
 * Visible UI text. Spanish is the default; English must provide every key
 * (enforced by the `Messages` type). Keep component text here, not inline.
 *
 * Site names and source titles are proper nouns and are not translated.
 */

import type { ApiErrorCode } from '../../shared/ephemeris.js';
import type { PresenceState } from '../../shared/presence.js';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export type ClientErrorKey = ApiErrorCode | 'NETWORK' | 'UNEXPECTED_RESPONSE';

export interface Messages {
  readonly app: { readonly title: string; readonly tagline: string; readonly language: string };
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
