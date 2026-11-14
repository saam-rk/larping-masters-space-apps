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
import type { SourceId } from '../features/results/sourceCatalog';
import type { ViewMode } from '../features/scene/viewMode';
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
  /** First-visit landing window (also reopened from the sidebar). */
  readonly setup: {
    /** Event and challenge line under the title (proper nouns). */
    readonly tagline: string;
    /** Short introduction of the purpose and limits of the app. */
    readonly intro: Paragraphs;
    readonly options: string;
    readonly language: string;
    readonly effects: string;
    readonly effectNames: Readonly<Record<EffectMode, string>>;
    readonly effectDetails: Readonly<Record<EffectMode, string>>;
    readonly save: string;
    /** Where the choice is stored. */
    readonly storage: string;
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
    /** Drop-down of further reference points; its options are placeholders for now. */
    readonly morePoints: {
      readonly label: string;
      /** Shown while no option is chosen. */
      readonly placeholder: string;
      readonly options: readonly string[];
      /** States that the options are placeholders without coordinates. */
      readonly hint: string;
    };
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
    readonly live: string;
    readonly liveHint: string;
    readonly wheels: {
      readonly day: string;
      readonly month: string;
      readonly year: string;
      readonly hour: string;
      readonly minute: string;
      /** Accessible name of the time zone wheel. */
      readonly zone: string;
    };
    /** Screen-reader description of the wheels: how to open the exact picker. */
    readonly wheelPickerHint: string;
    /** Titles of the exact picker opened from each date wheel's label (the time is only set with its wheels). */
    readonly picker: { readonly day: string; readonly month: string; readonly year: string };
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
    /** Update button label once the live result on screen matches the selection (the button still allows a retry). */
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
    /** Help paragraphs per view. */
    readonly info: Readonly<Record<ViewMode, Paragraphs>>;
    readonly views: {
      readonly label: string;
      readonly names: Readonly<Record<ViewMode, string>>;
      /** Fits in the title rule. */
      readonly short: Readonly<Record<ViewMode, string>>;
      readonly firstPersonUnavailable: string;
    };
    /** "Compass" show/hide switch for the horizon line (first person) and grid (third person). */
    readonly compassToggle: {
      /** Visible text and accessible name of the switch (pressed = shown); fits in the title rule. */
      readonly label: string;
      readonly show: string;
      readonly hide: string;
    };
    /** Full-screen switch in the title rule (accessible name and tooltip). */
    readonly fullscreen: { readonly enter: string; readonly exit: string };
    /** Zoom slider and buttons over the view. */
    readonly zoom: {
      readonly label: string;
      readonly slider: string;
      readonly in: string;
      readonly out: string;
      /** Slider value in first person: vertical field of view in degrees. */
      readonly fieldOfView: (degrees: string) => string;
      /** Slider value in third person: camera distance to the site in km. */
      readonly distance: (km: string) => string;
    };
    readonly firstPersonNote: string;
    readonly thirdPersonNote: string;
    readonly moon: string;
    readonly loading: string;
    readonly terrainLoading: string;
    readonly terrainMissing: string;
    readonly missing: (body: string) => string;
    /** Horizons gave no angular diameter or range; a nominal value is drawn. */
    readonly nominal: (body: string) => string;
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
    /** Sources dialog group headings (see `features/results/sourceCatalog.ts`). */
    readonly sourcesCurrent: string;
    readonly sourcesApp: string;
    readonly sourcesResearch: string;
    /** Why each project source is listed (one short sentence). */
    readonly sourceReasons: Readonly<Record<SourceId, string>>;
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
    setup: 'Preferencias',
    cycle: (setting, value) => `${setting}: ${value}. Pulsa para cambiar.`,
  },
  setup: {
    tagline: 'NASA Space Apps 2026 · Lunar Landing Site Navigator',
    intro: [
      'Explora el cielo desde puntos de referencia del polo sur lunar. Elige un lugar y una fecha y hora UTC, y verás dónde están el Sol y la Tierra respecto al horizonte local, en una vista 3D y en un resumen con unidades y fuentes.',
      'Las posiciones proceden de JPL Horizons. El relieve no está modelado: es geometría, no una garantía de luz, comunicaciones ni idoneidad de aterrizaje.',
    ],
    options: 'Preferencias',
    language: 'Idioma',
    effects: 'Efectos visuales',
    effectNames: { on: 'Efectos completos', off: 'Bajo rendimiento' },
    effectDetails: { on: 'CRT animado con curvatura', off: 'Estático, fuente de alta visibilidad, menos CPU' },
    save: 'Guardar preferencias',
    storage: 'Se guardan en una cookie de este navegador. Puedes cambiarlas desde el botón de ajustes de la barra lateral.',
  },
  config: {
    site: 'Punto de referencia',
    siteInfo: [
      'Elige el punto del polo sur lunar desde el que se calcula el cielo.',
      'Son los centros de regiones candidatas publicadas por NASA (Lunar Surface Data Book). No son lugares de aterrizaje aprobados.',
      'También puedes escribir unas coordenadas en grados (latitud, longitud; sur y oeste en negativo o con S/O) o buscar un punto por su nombre. Un punto personalizado se calcula con el mismo método, a altura 0 km y sin relieve, y no tiene fuente publicada.',
      'La lista «Más puntos de referencia» tiene valores provisionales: aún no tienen coordenadas y elegirlos no cambia el cálculo.',
    ],
    customTag: 'PERSONALIZADO',
    customName: 'Punto personalizado',
    search: 'Coordenadas o nombre',
    searchPlaceholder: '-85.4381, 37.36667 · Shackleton',
    searchReading: (coordinates) => `Punto personalizado: ${coordinates}`,
    morePoints: {
      label: 'Más puntos de referencia',
      placeholder: 'Elegir un punto (provisional)…',
      options: ['Punto de ejemplo A', 'Punto de ejemplo B', 'Punto de ejemplo C'],
      hint: 'Valores provisionales: aún no tienen coordenadas y no cambian el cálculo.',
    },
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
      'Gira las ruletas con la rueda del ratón, deslizando verticalmente (con impulso) o pulsando el número de arriba o de abajo. Con el teclado, usa las flechas, RePág/AvPág, Inicio/Fin o escribe un número.',
      'Para elegir una fecha exacta, pulsa el nombre encima de una ruleta de la fecha («Día», «Mes» o «Año»), o Intro sobre la ruleta: se abre un desplegable solo con ese campo. Al elegir un valor se aplica y la ruleta gira hasta él; Escape o un clic fuera lo cierran sin cambios. La hora y los minutos se eligen solo con sus ruletas.',
      '«EN VIVO» selecciona la fecha y hora actuales de tu dispositivo, al minuto, en la zona elegida. Se toma al pulsar el botón; no avanza automáticamente ni consulta datos hasta que pulses «Actualizar vista».',
      'UTC es el horario que usa la NASA para los lanzamientos y el que usa el cálculo. «Local» es la zona de tu dispositivo: se convierte a UTC (se muestra la hora UTC equivalente) y cambiar de zona conserva el mismo instante.',
      'Tras cambiar el lugar o la fecha, pulsa «Actualizar vista» para consultar JPL Horizons.',
    ],
    date: 'Fecha',
    time: 'Hora',
    live: 'EN VIVO',
    liveHint: 'Seleccionar la fecha y hora actuales',
    wheels: { day: 'Día', month: 'Mes', year: 'Año', hour: 'Hora', minute: 'Min', zone: 'Zona horaria' },
    wheelPickerHint: 'Pulsa Intro para elegir un valor exacto de la lista.',
    picker: { day: 'Elegir día', month: 'Elegir mes', year: 'Elegir año' },
    timeZone: 'Zona horaria',
    zoneUtc: 'UTC · NASA (lanzamientos)',
    zoneLocal: (id) => `Local · ${id}`,
    zoneUtcHint: 'UTC es la hora que usa la NASA para los lanzamientos.',
    zoneLocalHint: (offset, utc) => `Hora local (${offset}) = ${utc} UTC.`,
    update: 'Actualizar vista',
    updating: 'Consultando…',
    upToDate: 'Actualizado',
    invalidTime: 'Introduce una fecha y hora válidas entre 2000 y 2099.',
    nonexistentTime: 'Esa hora local no existe por el cambio de horario. Elige otra hora.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'O' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'O' },
  bodies: { sun: 'Sol', earth: 'Tierra' },
  scene: {
    heading: 'Horizonte local',
    info: {
      'first-person': [
        'Vista a la altura de los ojos, de pie y quieto a unos metros de un astronauta de 1,70 m en Nobile Rim 1 o Nobile Rim 2. Arrastra para girar la cabeza: en horizontal para mirar alrededor y en vertical para mirar al suelo o al cielo. La rueda, el pellizco o el control de zoom (+, barra y −) acercan o alejan la imagen, como unos prismáticos, sin moverte del sitio. Con la vista seleccionada, también funcionan las flechas y +/−. El botón Brújula, junto a 1ª P y 3ª P, muestra u oculta la línea del horizonte y los puntos cardinales; el botón de las esquinas abre la vista a pantalla completa.',
        'El relieve es un recorte de 10 × 10 km del modelo LOLA de 5 m/píxel (NASA GSFC PGDA, producto 78). La línea verde es el horizonte geométrico (elevación 0). Más allá del recorte no hay datos de relieve: la zona oscura es un horizonte supuesto, el de una Luna lisa de 1737,4 km de radio que sigue a la altura del borde del recorte, visto desde los ojos (1,60 m sobre el suelo). No es terreno real. Donde el terreno baja, ese horizonte queda bajo la línea verde y el Sol o la Tierra pueden verse en parte aunque su centro esté bajo el horizonte geométrico. La parte del Sol o de la Tierra que tapan el relieve o ese horizonte supuesto se dibuja translúcida, para poder localizarla; desde allí no se vería.',
        'El Sol y la Tierra se dibujan con su posición y su diámetro aparente de JPL Horizons. La iluminación es ilustrativa: sin sombras proyectadas; el recorte de relieve es plano y la curvatura lunar solo se supone más allá de él. No es un análisis de visibilidad, energía, comunicaciones ni idoneidad de aterrizaje.',
        'El astronauta es una figura de escala ilustrativa. Las estrellas son decorativas y no reproducen el cielo real.',
      ],
      'third-person': [
        'Arrastra para girar la vista; usa la rueda, pellizca o mueve el control de zoom (+, barra y −) para acercar o alejar. Puedes alejarte hasta más allá del Sol. El botón Brújula, junto a 1ª P y 3ª P, muestra u oculta el plano del horizonte, su cuadrícula y las guías; el botón de las esquinas abre la vista a pantalla completa.',
        'A escala, en kilómetros: la Luna es una esfera de 1737,4 km de radio y el Sol y la Tierra están a la distancia y con el tamaño que da JPL Horizons. Por eso se ven pequeños: alejarte muestra el sistema Tierra-Luna.',
        'El plano verde es el horizonte local de referencia (elevación 0), tangente en el lugar, con la brújula N/E/S/O; crece al alejarte para seguir sirviendo de referencia. Para el Sol y la Tierra, una línea de color sobre el plano marca su azimut y un arco, su elevación; las líneas discontinuas van del observador a cada uno. La línea gris es el eje de rotación lunar.',
        'No están a escala el marcador del observador, los halos que ayudan a localizar el Sol y la Tierra ni el tamaño del plano. La Luna no tiene relieve y las estrellas son decorativas.',
      ],
    },
    views: {
      label: 'Vista',
      names: { 'first-person': 'Primera persona', 'third-person': 'Tercera persona' },
      short: { 'first-person': '1ª P', 'third-person': '3ª P' },
      firstPersonUnavailable: 'Primera persona: solo disponible en Nobile Rim 1 y Nobile Rim 2, que tienen modelo de relieve.',
    },
    compassToggle: {
      label: 'Brújula',
      show: 'Mostrar la brújula: línea y cuadrícula del horizonte',
      hide: 'Ocultar la brújula: línea y cuadrícula del horizonte',
    },
    fullscreen: { enter: 'Ver el horizonte local a pantalla completa', exit: 'Salir de pantalla completa' },
    zoom: {
      label: 'Zoom',
      slider: 'Nivel de zoom',
      in: 'Acercar',
      out: 'Alejar',
      fieldOfView: (degrees) => `Campo de visión vertical: ${degrees}°`,
      distance: (km) => `Distancia de la cámara al lugar: ${km} km`,
    },
    firstPersonNote: 'Relieve LOLA 10 × 10 km · luz ilustrativa · figura 1,70 m',
    thirdPersonNote: 'A escala · marcador y halos no a escala',
    moon: 'Luna',
    loading: 'Cargando vista 3D…',
    terrainLoading: 'Cargando relieve…',
    terrainMissing: 'No se pudo situar el lugar en el modelo de relieve.',
    missing: (body) => `${body}: sin dato para dibujar.`,
    nominal: (body) => `${body}: tamaño o distancia nominal; Horizons no lo indicó.`,
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
    sourcesCurrent: 'Esta consulta',
    sourcesApp: 'Datos y métodos usados en la aplicación',
    sourcesResearch: 'Consultadas en la investigación (no integradas ni validadas en la app)',
    sourceReasons: {
      lunarSurfaceDataBook:
        'Nombres y coordenadas de los tres puntos de referencia; son centros de regiones candidatas, no lugares de aterrizaje aprobados.',
      horizonsApi: 'Calcula azimut, elevación, tamaño angular y distancia del Sol y la Tierra desde el punto lunar elegido.',
      horizonsManual: 'Define las cantidades del observador y los marcadores de presencia que traducimos a los estados del panel.',
      jplApiPolicy: 'Normas de uso y política CORS: por eso la consulta pasa por nuestra ruta de servidor y se guarda en caché.',
      pgda78: 'Relieve LOLA de 5 m/píxel del que salen las mallas 3D de 10 × 10 km de Nobile Rim 1 y Nobile Rim 2 en primera persona.',
      pgda78Readme: 'Unidades, marco MOON_ME/DE421 y proyección estereográfica polar con los que situamos el punto sobre la malla.',
      barker2021: 'Cita del producto DM2: método de los mapas LOLA mejorados, sus errores y el cálculo de horizontes.',
      spaceAppsChallenge: 'Enunciado del reto que define el alcance del proyecto.',
      pgda90: 'Relieve regional ajustado del polo sur: contexto de los tres puntos y perfiles de horizonte exploratorios.',
      barker2023: 'Describe los productos LOLA regionales y sus capas de error y densidad de observaciones.',
      pgda81: 'Mosaico polar evaluado: cubre Shackleton Rim, pero no los dos puntos Nobile.',
      pgda69: 'Iluminación, sombra permanente y visibilidad de la Tierra promediadas a largo plazo; no valen para una hora concreta.',
      mazarico2011: 'Método de referencia para modelar la iluminación polar teniendo en cuenta el relieve.',
      pdsLola: 'Archivo oficial de LOLA; consultamos sus etiquetas para decodificar alturas y unidades.',
      sldem2015: 'Descartado: solo cubre latitudes entre ±60°, lejos de los puntos polares.',
      lrocNac: 'Relieve estéreo de alto detalle; los modelos revisados (NOBILE01, SHACKRDGE02) no cubren los puntos elegidos.',
      lrocGld100: 'Contexto global; en los polos no es relieve estéreo propio, sino relleno con LOLA.',
      kaguyaDtm: 'Evaluado: su cobertura llega a ±70°, fuera de los puntos polares.',
      pgda104: 'Alternativa de 5 m con más detalle en zonas iluminadas; evaluada, no integrada.',
      pgda95: 'Diferencia entre los marcos MOON_ME y MOON_PA (unos 875 m): no se deben mezclar.',
      naifFrameKernel: 'Correspondencia oficial de los marcos lunares para un futuro cálculo con SPICE.',
      naifSpice: 'Rutinas de referencia para un cálculo controlado de dirección, iluminación y ocultación.',
      bryantIpn: 'Enfoque establecido: máscara de horizonte desde el relieve comparada con el Sol y la Tierra.',
      minow2023: 'Tamaño finito del disco solar, relevante cerca del horizonte polar.',
      dsn810: 'Referencia de enlaces de radio: la geometría por sí sola no garantiza comunicación.',
      glennPropagation: 'Por qué el relieve afecta a la propagación de radio en la superficie lunar.',
      hlsThermal: 'Contexto de ingeniería para el análisis térmico lunar.',
      diviner: 'Temperaturas superficiales de LRO como contexto térmico.',
      lcross: 'Evidencia de hielo de agua en Cabeus; contexto, no dato de los puntos elegidos.',
      moonWater: 'Contexto general sobre agua y hielo en la Luna.',
      shadowCam: 'Imágenes del interior en sombra de Shackleton; no aportan alturas.',
      zuberShackleton: 'Dimensiones del cráter Shackleton como contexto.',
      landingHazard: 'La seguridad del aterrizaje exige analizar pendientes, rocas y cráteres aparte.',
      moonTrek: 'Inspección visual de perfiles y del relieve alrededor de los puntos.',
      gazetteer: 'Nombres oficiales de accidentes lunares y su ubicación aproximada.',
      projStere: 'Referencia de la proyección estereográfica polar usada para situar coordenadas.',
      gdal: 'Inspección de dimensiones, sistema de referencia y datos ausentes de los ráster.',
    },
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
    setup: 'Preferences',
    cycle: (setting, value) => `${setting}: ${value}. Press to change.`,
  },
  setup: {
    tagline: 'NASA Space Apps 2026 · Lunar Landing Site Navigator',
    intro: [
      'Explore the sky from reference points at the lunar south pole. Pick a site and a UTC date and time to see where the Sun and the Earth are relative to the local horizon, in a 3D view and in a summary with units and sources.',
      'Positions come from JPL Horizons. Terrain is not modeled: this is geometry, not a guarantee of light, communications or landing suitability.',
    ],
    options: 'Preferences',
    language: 'Language',
    effects: 'Visual effects',
    effectNames: { on: 'Full effects', off: 'Low performance' },
    effectDetails: { on: 'Animated, curved CRT', off: 'Static, high-visibility font, less CPU' },
    save: 'Save preferences',
    storage: 'Stored in a cookie in this browser. You can change them from the settings button in the sidebar.',
  },
  config: {
    site: 'Reference point',
    siteInfo: [
      'Choose the lunar south-pole point the sky is computed from.',
      'They are the centers of candidate regions published by NASA (Lunar Surface Data Book). They are not approved landing sites.',
      'You can also type coordinates in degrees (latitude, longitude; south and west negative or with S/W) or search a point by name. A custom point is computed with the same method, at 0 km height and without terrain, and has no published source.',
      'The "More reference points" list has placeholder values: they have no coordinates yet and choosing one does not change the calculation.',
    ],
    customTag: 'CUSTOM',
    customName: 'Custom point',
    search: 'Coordinates or name',
    searchPlaceholder: '-85.4381, 37.36667 · Shackleton',
    searchReading: (coordinates) => `Custom point: ${coordinates}`,
    morePoints: {
      label: 'More reference points',
      placeholder: 'Choose a point (placeholder)…',
      options: ['Sample point A', 'Sample point B', 'Sample point C'],
      hint: 'Placeholder values: they have no coordinates yet and do not change the calculation.',
    },
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
      'Turn the wheels with your mouse wheel, by swiping vertically (they keep spinning) or by pressing the number above or below. On a keyboard, use the arrows, Page Up/Down, Home/End or type a number.',
      'To pick an exact date, press the name above a date wheel (“Day”, “Month” or “Year”), or Enter on the wheel: a dropdown opens with just that field. Picking a value applies it and the wheel rolls to it; Escape or a click outside closes it without changes. The hour and minute are set with their wheels only.',
      '“LIVE” selects your device’s current date and time, to the minute, in the chosen zone. It captures the time when pressed; it does not keep ticking or query data until you press “Update view”.',
      'UTC is the time standard NASA uses for launches and the one the calculation uses. “Local” is your device’s time zone: it is converted to UTC (the equivalent UTC time is shown) and switching zones keeps the same instant.',
      'After changing the place or the date, press “Update view” to query JPL Horizons.',
    ],
    date: 'Date',
    time: 'Time',
    live: 'LIVE',
    liveHint: 'Select the current date and time',
    wheels: { day: 'Day', month: 'Month', year: 'Year', hour: 'Hour', minute: 'Min', zone: 'Time zone' },
    wheelPickerHint: 'Press Enter to pick an exact value from a list.',
    picker: { day: 'Pick the day', month: 'Pick the month', year: 'Pick the year' },
    timeZone: 'Time zone',
    zoneUtc: 'UTC · NASA (launches)',
    zoneLocal: (id) => `Local · ${id}`,
    zoneUtcHint: 'UTC is the time NASA uses for launches.',
    zoneLocalHint: (offset, utc) => `Local time (${offset}) = ${utc} UTC.`,
    update: 'Update view',
    updating: 'Querying…',
    upToDate: 'Updated',
    invalidTime: 'Enter a valid date and time between 2000 and 2099.',
    nonexistentTime: 'That local time does not exist because of a daylight-saving change. Pick another time.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'W' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'W' },
  bodies: { sun: 'Sun', earth: 'Earth' },
  scene: {
    heading: 'Local horizon',
    info: {
      'first-person': [
        'Eye-level view, standing still a few meters from a 1.70 m astronaut at Nobile Rim 1 or Nobile Rim 2. Drag to turn your head: sideways to look around, up or down to look at the ground or the sky. The wheel, a pinch or the zoom control (+, bar and −) zooms the image in or out, like binoculars, without moving you. With the view focused, the arrow keys and +/− also work. The Compass button, next to 1ST and 3RD, shows or hides the horizon line and the cardinal points; the corners button opens the view full screen.',
        'The relief is a 10 × 10 km crop of the 5 m/pixel LOLA model (NASA GSFC PGDA, product 78). The green line is the geometric horizon (elevation 0). There is no relief data beyond the crop: the dark area is an assumed horizon, that of a smooth Moon of 1,737.4 km radius continuing at the height of the crop edge, seen from the eyes (1.60 m above the ground). It is not real terrain. Where the terrain falls away, that horizon lies below the green line, so the Sun or the Earth may show in part even when its center is below the geometric horizon. The part of the Sun or the Earth hidden by the relief or that assumed horizon is drawn translucent so it can be found; it would not be visible from there.',
        'The Sun and the Earth are drawn with their JPL Horizons position and apparent diameter. Lighting is illustrative: no cast shadows; the relief crop is flat and lunar curvature is only assumed beyond it. This is not a visibility, power, communications or landing-suitability analysis.',
        'The astronaut is an illustrative scale figure. The stars are decorative and do not reproduce the real sky.',
      ],
      'third-person': [
        'Drag to rotate the view; use the wheel, a pinch or the zoom control (+, bar and −) to zoom in or out. You can zoom out beyond the Sun. The Compass button, next to 1ST and 3RD, shows or hides the horizon plane, its grid and the guides; the corners button opens the view full screen.',
        'To scale, in kilometers: the Moon is a sphere of 1,737.4 km radius and the Sun and the Earth are at the distance and size given by JPL Horizons. That is why they look small: zoom out to see the Earth–Moon system.',
        'The green plane is the local reference horizon (elevation 0), tangent at the site, with the N/E/S/W compass; it grows as you zoom out so it stays a reference. For the Sun and the Earth, a colored line on the plane marks the azimuth and an arc the elevation; the dashed lines run from the observer to each one. The gray line is the lunar spin axis.',
        'Not to scale: the observer marker, the glows that help find the Sun and the Earth, and the plane size. The Moon has no relief and the stars are decorative.',
      ],
    },
    views: {
      label: 'View',
      names: { 'first-person': 'First person', 'third-person': 'Third person' },
      short: { 'first-person': '1ST', 'third-person': '3RD' },
      firstPersonUnavailable: 'First person: only available at Nobile Rim 1 and Nobile Rim 2, which have a relief model.',
    },
    compassToggle: {
      label: 'Compass',
      show: 'Show the compass: horizon line and grid',
      hide: 'Hide the compass: horizon line and grid',
    },
    fullscreen: { enter: 'Show the local horizon full screen', exit: 'Exit full screen' },
    zoom: {
      label: 'Zoom',
      slider: 'Zoom level',
      in: 'Zoom in',
      out: 'Zoom out',
      fieldOfView: (degrees) => `Vertical field of view: ${degrees}°`,
      distance: (km) => `Camera distance to the site: ${km} km`,
    },
    firstPersonNote: 'LOLA relief 10 × 10 km · illustrative light · 1.70 m figure',
    thirdPersonNote: 'To scale · marker and glows not to scale',
    moon: 'Moon',
    loading: 'Loading 3D view…',
    terrainLoading: 'Loading relief…',
    terrainMissing: 'The site could not be placed on the relief model.',
    missing: (body) => `${body}: no data to draw.`,
    nominal: (body) => `${body}: nominal size or distance; Horizons did not provide it.`,
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
    sourcesCurrent: 'This query',
    sourcesApp: 'Data and methods used in the app',
    sourcesResearch: 'Consulted during research (not integrated or validated in the app)',
    sourceReasons: {
      lunarSurfaceDataBook:
        'Names and coordinates of the three reference points; they are centers of candidate regions, not approved landing sites.',
      horizonsApi: 'Computes azimuth, elevation, angular size and range of the Sun and the Earth from the chosen lunar point.',
      horizonsManual: 'Defines the observer quantities and the presence markers we turn into the panel states.',
      jplApiPolicy: 'Usage rules and CORS policy: the reason the query goes through our server route and is cached.',
      pgda78: 'LOLA 5 m/pixel terrain behind the 10 × 10 km 3D meshes of Nobile Rim 1 and Nobile Rim 2 in first person.',
      pgda78Readme: 'Units, MOON_ME/DE421 frame and polar stereographic projection used to place the point on the mesh.',
      barker2021: 'Citation for the DM2 product: method of the improved LOLA maps, their errors and horizon computation.',
      spaceAppsChallenge: 'Challenge statement that defines the project scope.',
      pgda90: 'Adjusted regional south-pole terrain: context for the three points and exploratory horizon profiles.',
      barker2023: 'Describes the regional LOLA products and their error and observation-density layers.',
      pgda81: 'Polar mosaic evaluated: it covers Shackleton Rim, but not the two Nobile points.',
      pgda69: 'Long-term averaged illumination, permanent shadow and Earth visibility; not valid for a specific hour.',
      mazarico2011: 'Reference method for modeling polar illumination with terrain.',
      pdsLola: 'Official LOLA archive; we read its labels to decode heights and units.',
      sldem2015: 'Ruled out: it only covers latitudes within ±60°, far from the polar points.',
      lrocNac: 'High-detail stereo terrain; the models we checked (NOBILE01, SHACKRDGE02) do not cover the chosen points.',
      lrocGld100: 'Global context; at the poles it is not native stereo terrain but filled with LOLA.',
      kaguyaDtm: 'Evaluated: its coverage reaches ±70°, outside the polar points.',
      pgda104: 'A 5 m alternative with more detail in sunlit areas; evaluated, not integrated.',
      pgda95: 'Difference between the MOON_ME and MOON_PA frames (about 875 m): they must not be mixed.',
      naifFrameKernel: 'Official mapping of the lunar frames for a future SPICE calculation.',
      naifSpice: 'Reference routines for a controlled direction, illumination and occultation calculation.',
      bryantIpn: 'Established approach: a terrain horizon mask compared with the Sun and the Earth.',
      minow2023: 'Finite size of the solar disk, relevant near the polar horizon.',
      dsn810: 'Radio link reference: geometry alone does not guarantee communication.',
      glennPropagation: 'Why terrain affects radio propagation on the lunar surface.',
      hlsThermal: 'Engineering context for lunar thermal analysis.',
      diviner: 'LRO surface temperatures as thermal context.',
      lcross: 'Evidence of water ice at Cabeus; context, not data for the chosen points.',
      moonWater: 'General context on water and ice on the Moon.',
      shadowCam: 'Images of the shadowed interior of Shackleton; they do not provide heights.',
      zuberShackleton: 'Dimensions of Shackleton crater as context.',
      landingHazard: 'Landing safety requires a separate analysis of slopes, rocks and craters.',
      moonTrek: 'Visual inspection of profiles and terrain around the points.',
      gazetteer: 'Official names of lunar features and their approximate location.',
      projStere: 'Reference for the polar stereographic projection used to place coordinates.',
      gdal: 'Inspection of raster dimensions, reference system and missing data.',
    },
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
