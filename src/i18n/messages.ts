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
import type { SkySearchDirection } from '../../shared/skySearch.js';
import type { SkySearchExample } from '../features/sky-search/examples';
import type { SourceId } from '../features/results/sourceCatalog';
import type { SceneScale } from '../features/scene/sceneScale';
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
    /** Historic instants offered while Apollo 11 is selected. */
    readonly apollo11: {
      /** Box tag shown while Apollo 11 is selected. */
      readonly tag: string;
      readonly title: string;
      readonly landing: string;
      readonly flag: string;
      /** Marks the instant currently selected. */
      readonly selected: string;
    };
    readonly search: string;
    readonly searchPlaceholder: string;
    /** Confirms how custom coordinates were read. */
    readonly searchReading: (coordinates: string) => string;
    /** Drop-down of further reference points; its options are placeholders for now. */
    readonly siteList: {
      readonly label: string;
      /** Shown while no option is chosen (a custom point). */
      readonly placeholder: string;
      /** Read with the drop-down: what its points are, their order and how they are computed. */
      readonly hint: (count: number, featured: number) => string;
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
    /** Disabled update button label when a complete live result matches the selected point and UTC instant (D-020). */
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
      /** Slider value in third person at visual scale (distances carry no meaning): level in percent. */
      readonly level: (percent: string) => string;
    };
    /** Visual/real scale switch of the third-person view. */
    readonly scale: {
      readonly label: string;
      readonly names: Readonly<Record<SceneScale, string>>;
      /** Tooltip of each option. */
      readonly titles: Readonly<Record<SceneScale, string>>;
    };
    /** Angle guides of the visual scale: 3D labels (value already formatted with its degree sign) and the legend table. */
    readonly guides: {
      readonly azimuth: (value: string) => string;
      readonly elevation: (value: string) => string;
      readonly separation: (value: string) => string;
      readonly azimuthDifference: (value: string) => string;
      readonly legend: {
        readonly caption: string;
        readonly azimuth: string;
        readonly elevation: string;
        /** Row header of the Earth − Sun difference; short. */
        readonly difference: string;
        readonly differenceTitle: string;
        readonly separation: string;
        /** Footer: vertical exaggeration factor of the drawn elevations (e.g. `10`). */
        readonly exaggeration: (factor: string) => string;
      };
    };
    readonly apolloReenactmentNote: string;
    /** `crop`: size of the site's relief crop, already formatted (e.g. `10 × 10`). */
    readonly firstPersonNote: (crop: string) => string;
    readonly thirdPersonNote: {
      /** `exaggeration`: vertical exaggeration factor of the drawn elevations, or null when drawn true. */
      readonly visual: (exaggeration: string | null) => string;
      readonly real: string;
    };
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
    /** Note for an entry that shares another site's coordinates (Site20v2). */
    readonly siteVariant: (baseName: string) => string;
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
  /** Inverse search: Sun/Earth azimuth and elevation ranges -> closest matching date. */
  readonly skySearch: {
    readonly heading: string;
    /** Short help of the box's "i" button; the full guide is in the search window. */
    readonly info: Paragraphs;
    /** One line in the box, above the button that opens the window. */
    readonly intro: string;
    /** Button that opens the search window. */
    readonly open: string;
    /** Title of the search window. */
    readonly dialogTitle: string;
    /** Box summary: number of quantities with a condition. */
    readonly summary: (count: number) => string;
    readonly lastMatch: string;
    readonly lastNone: string;
    /** Footer button that closes the window. */
    readonly close: string;
    /** Numbered steps of the form. */
    readonly steps: { readonly conditions: string; readonly direction: string; readonly result: string };
    readonly conditionsHint: string;
    readonly min: string;
    readonly max: string;
    readonly angles: { readonly azimuth: string; readonly elevation: string };
    /** Unit and convention under each angle name. */
    readonly angleHints: { readonly azimuth: string; readonly elevation: string };
    /** Accessible name of one field, e.g. "Sun, azimuth, minimum". */
    readonly fieldLabel: (body: string, angle: string, bound: string) => string;
    readonly minimum: string;
    readonly maximum: string;
    /** Column with the values a quantity can take at the site. */
    readonly possibleHeading: string;
    /** Every azimuth is possible. */
    readonly anyAzimuth: string;
    /** Range shown in the possible column, e.g. "-6.5° to 6.5°". */
    readonly span: (min: string, max: string) => string;
    readonly clear: string;
    readonly direction: string;
    readonly directions: Readonly<Record<SkySearchDirection, string>>;
    readonly directionHints: Readonly<Record<SkySearchDirection, string>>;
    /** The site and instant the search starts from (the control panel's selection). */
    readonly reference: (site: string, utc: string) => string;
    readonly search: string;
    readonly searching: string;
    readonly cancel: string;
    /** A search keeps running while the window is closed. */
    readonly background: string;
    readonly needOne: string;
    readonly rowErrors: {
      readonly format: string;
      readonly azimuthBounds: string;
      readonly elevationBounds: string;
      readonly order: string;
    };
    /** Azimuth row whose min is above its max. */
    readonly wrapsNorth: (body: string) => string;
    /** Well-formed rows of a body that it never meets at the site. */
    readonly impossible: (body: string) => string;
    /** Placeholder of the result step before the first search. */
    readonly noResult: string;
    readonly examplesHeading: string;
    readonly examplesIntro: string;
    readonly examples: Readonly<Record<SkySearchExample, { readonly title: string; readonly detail: string }>>;
    /** Button that fills the form with an example. */
    readonly tryExample: string;
    /** Accessible name of that button. */
    readonly tryExampleLabel: (example: string) => string;
    readonly guideHeading: string;
    /** Extended explanation shown beside the form. */
    readonly guide: readonly { readonly heading: string; readonly paragraphs: Paragraphs }[];
    readonly matchHeading: string;
    readonly offset: string;
    readonly condition: string;
    readonly value: string;
    readonly shown: string;
    /** Closes the window and shows the match on the horizon view. */
    readonly show: string;
    readonly incomplete: string;
    readonly notFound: (start: string, end: string) => string;
    readonly budget: (start: string, end: string) => string;
    /** The control panel's site changed after the search. */
    readonly otherSite: (site: string) => string;
    readonly precision: string;
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
      'Son los centros de regiones candidatas publicadas por NASA (Lunar Surface Data Book, tabla A2.1-1). No son lugares de aterrizaje aprobados.',
      'El desplegable «Lista de puntos» empieza por el Apolo 11 y los tres puntos originales de la demo (Nobile Rim 1, Nobile Rim 2 y Shackleton Rim) y sigue con el resto de puntos documentados, en orden alfabético. Todos se calculan con el mismo método; la vista en primera persona con relieve solo existe para algunos puntos y el resto se muestra en tercera persona.',
      'También puedes escribir unas coordenadas en grados (latitud, longitud; sur y oeste en negativo o con S/O) o buscar un punto por su nombre o código (p. ej. «Haworth», «DM1», «Site20v2»). Un punto personalizado se calcula con el mismo método, a altura 0 km y sin relieve, y no tiene fuente publicada.',
      '«Leibnitz Beta Plateau, extended boundaries» (Site20v2) es una variante del producto de terreno de PGDA con las mismas coordenadas que Leibnitz Beta Plateau (Site20): su cálculo es idéntico.',
    ],
    customTag: 'PERSONALIZADO',
    customName: 'Punto personalizado',
    apollo11: {
      tag: '★ HISTÓRICO',
      title: 'Momentos del Apolo 11',
      landing: 'Alunizaje',
      flag: 'Bandera izada',
      selected: 'seleccionado',
    },
    search: 'Coordenadas o nombre',
    searchPlaceholder: '-85.4381, 37.36667 · Haworth',
    searchReading: (coordinates) => `Punto personalizado: ${coordinates}`,
    siteList: {
      label: 'Lista de puntos',
      placeholder: 'Elegir un punto de la lista…',
      hint: (count, featured) =>
        `${count} puntos del Lunar Surface Data Book: primero los ${featured} principales de la demo y después el resto, en orden alfabético. Todos se calculan con el mismo método.`,
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
      'Fecha y hora entre 1969 y 2099, con la zona horaria que elijas.',
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
    invalidTime: 'Introduce una fecha y hora válidas entre 1969 y 2099.',
    nonexistentTime: 'Esa hora local no existe por el cambio de horario. Elige otra hora.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'O' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'O' },
  bodies: { sun: 'Sol', earth: 'Tierra' },
  scene: {
    heading: 'Horizonte local',
    info: {
      'first-person': [
        'Vista a la altura de los ojos, de pie y quieto en el Apolo 11 o a unos metros de un astronauta de 1,70 m en Nobile Rim 1, Nobile Rim 2, Shackleton Rim, Amundsen Rim, Haworth, Shoemaker Rim A o Faustini Rim A. Arrastra para girar la cabeza: en horizontal para mirar alrededor y en vertical para mirar al suelo o al cielo. La rueda, el pellizco o el control de zoom (+, barra y −) acercan o alejan la imagen, como unos prismáticos, sin moverte del sitio. Con la vista seleccionada, también funcionan las flechas y +/−. El botón Brújula, junto a 1ª P y 3ª P, muestra u oculta la línea del horizonte y los puntos cardinales; el botón de las esquinas abre la vista a pantalla completa.',
        'El relieve es un recorte de 10 × 10 km (12 × 14 km en Haworth y 12 × 12 km en Shoemaker Rim A y Faustini Rim A) del modelo LOLA de 5 m/píxel (NASA GSFC PGDA, producto 78). La línea verde es el horizonte geométrico (elevación 0). Más allá del recorte no hay datos de relieve: hay un horizonte supuesto (invisible; bajo él solo se ven las estrellas), el de una Luna lisa de 1737,4 km de radio que sigue a la altura del borde del recorte, visto desde los ojos (1,60 m sobre el suelo). No es terreno real. Donde el terreno baja, ese horizonte queda bajo la línea verde y el Sol o la Tierra pueden verse en parte aunque su centro esté bajo el horizonte geométrico. La parte del Sol o de la Tierra que tapan el relieve o ese horizonte supuesto se dibuja translúcida, para poder localizarla; desde allí no se vería.',
        'El Sol y la Tierra se dibujan con su posición y su diámetro aparente de JPL Horizons. La iluminación es ilustrativa: sin sombras proyectadas; el recorte de relieve es plano y la curvatura lunar solo se supone más allá de él. No es un análisis de visibilidad, energía, comunicaciones ni idoneidad de aterrizaje.',
        'El astronauta es una figura de escala ilustrativa. Las estrellas son decorativas y no reproducen el cielo real.',
      ],
      'third-person': [
        'Arrastra para girar la vista; usa la rueda, pellizca o mueve el control de zoom (+, barra y −) para acercar o alejar. El selector Escala, arriba a la izquierda, cambia entre la escala visual y la real. El botón Brújula, junto a 1ª P y 3ª P, muestra u oculta el plano del horizonte, su cuadrícula y las guías de ángulos; el botón de las esquinas abre la vista a pantalla completa.',
        'Escala visual (predeterminada): un esquema del cielo local que no está a escala. El Sol y la Tierra aparecen en su azimut real (el de JPL Horizons que muestra el panel de datos), sobre una cúpula de radio fijo y con un tamaño ampliado: en esta escala, la distancia y el tamaño no significan nada. Cerca del polo sur suelen estar a pocos grados del horizonte, así que la elevación se dibuja ampliada en vertical (×2 a ×10, indicado en la nota y en la tabla); las etiquetas dan siempre el valor real. Sobre el plano verde (elevación 0), un arco de color va del norte al azimut de cada uno y otro vertical sube del plano a su elevación, con su valor. La línea blanca discontinua une el Sol y la Tierra e indica su separación angular; el arco blanco sobre el plano, su diferencia de azimut. La tabla resume los valores y la diferencia Tierra − Sol. La separación se calcula con trigonometría esférica a partir del azimut y la elevación reales.',
        'Escala real, en kilómetros: la Luna es un globo de 1737,4 km de radio (modelo de NASA SVS orientado para que el lugar quede bajo el observador) y el Sol y la Tierra están a la distancia y con el tamaño que da JPL Horizons. Por eso se ven pequeños: al alejarte se ve el sistema Tierra-Luna, y puedes ir más allá del Sol. El plano verde es el horizonte local de referencia, tangente en el lugar, con la brújula N/E/S/O; crece al alejarte para seguir sirviendo de referencia. Las líneas y arcos de color marcan el azimut y la elevación; la línea gris es el eje de rotación lunar.',
        'En ninguna de las dos escalas están a escala el marcador del observador, los halos que ayudan a localizar el Sol y la Tierra ni el tamaño del plano. Los globos de la Luna, la Tierra y el Sol son modelos de apariencia: el relieve lunar es grueso y no es el terreno del lugar, y no se calcula la rotación de la Tierra ni la del Sol. Las estrellas son decorativas. No es un análisis de visibilidad, energía, comunicaciones ni idoneidad de aterrizaje.',
      ],
    },
    views: {
      label: 'Vista',
      names: { 'first-person': 'Primera persona', 'third-person': 'Tercera persona' },
      short: { 'first-person': '1ª P', 'third-person': '3ª P' },
      firstPersonUnavailable: 'Primera persona: solo disponible en el Apolo 11, Nobile Rim 1, Nobile Rim 2, Shackleton Rim, Amundsen Rim, Haworth, Shoemaker Rim A y Faustini Rim A, que tienen modelo de relieve.',
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
      level: (percent) => `Zoom de la escala visual: ${percent} %`,
    },
    scale: {
      label: 'Escala',
      names: { visual: 'Visual', real: 'Real' },
      titles: {
        visual: 'Escala visual: azimut real, elevación ampliada si es pequeña y guías de ángulos; tamaños y distancias no a escala',
        real: 'Escala real: la Luna, la Tierra y el Sol a escala, en kilómetros',
      },
    },
    guides: {
      azimuth: (value) => `Az ${value}`,
      elevation: (value) => `El ${value}`,
      separation: (value) => `Separación ${value}`,
      azimuthDifference: (value) => `ΔAz ${value}`,
      legend: {
        caption: 'Azimut y elevación del Sol y la Tierra desde el lugar, su diferencia y su separación angular',
        azimuth: 'Az',
        elevation: 'El',
        difference: 'Δ T − S',
        differenceTitle: 'Diferencia Tierra − Sol. En azimut, el giro más corto; positivo hacia el este (sentido horario).',
        separation: 'Separación',
        exaggeration: (factor) => `Elevación dibujada ×${factor}`,
      },
    },
    apolloReenactmentNote: 'Recreación del Apolo 11 sobre relieve LROC · Collins permaneció en órbita.',
    firstPersonNote: (crop) => `Relieve LOLA ${crop} km · luz ilustrativa · figura 1,70 m`,
    thirdPersonNote: {
      visual: (exaggeration) =>
        exaggeration
          ? `Escala visual · azimut real, elevación dibujada ×${exaggeration}; tamaños y distancias no a escala`
          : 'Escala visual · direcciones reales; tamaños y distancias no a escala',
      real: 'A escala · marcador, halos, brújula y eje lunar no a escala',
    },
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
    siteVariant: (baseName) =>
      `Variante de terreno ampliada (PGDA, producto 78) con las mismas coordenadas que ${baseName}; el cálculo es idéntico.`,
    coordinates: 'Coordenadas',
    positionSource: 'Posiciones',
    partial: 'Resultado incompleto: uno de los objetos no se pudo calcular.',
    versionUnverified: 'Horizons devolvió una versión de API no comprobada; revisa los valores.',
    sourcesCurrent: 'Esta consulta',
    sourcesApp: 'Datos y métodos usados en la aplicación',
    sourcesResearch: 'Consultadas en la investigación (no integradas ni validadas en la app)',
    sourceReasons: {
      apolloLanding: 'Fecha y hora del alunizaje del Apolo 11, según el catálogo de NASA.',
      apolloTerrain: 'Modelo de elevación LROC de 2 m/píxel que sirve de base a la recreación del Apolo 11.',
      lunarSurfaceDataBook:
        'Nombres y coordenadas de puntos de referencia en el polo sur; son centros de regiones candidatas.',
      horizonsApi: 'Calcula azimut, elevación, tamaño angular y distancia del Sol y la Tierra desde el punto lunar elegido.',
      horizonsManual: 'Define las cantidades del observador y los marcadores de presencia que traducimos a los estados del panel.',
      jplApiPolicy: 'Normas de uso y política CORS: por eso la consulta pasa por nuestra ruta de servidor y se guarda en caché.',
      pgda78: 'Relieve LOLA de 5 m/píxel del que salen las mallas 3D de Nobile Rim 1, Nobile Rim 2, Shackleton Rim y Amundsen Rim (10 × 10 km), de Haworth (12 × 14 km) y de Shoemaker Rim A y Faustini Rim A (12 × 12 km) en primera persona; también documenta la variante ampliada Site20v2.',
      pgda78Readme: 'Unidades, marco MOON_ME/DE421 y proyección estereográfica polar con los que situamos el punto sobre la malla.',
      barker2021: 'Cita de los productos DM1, DM2, Haworth, LM2 y LM7: método de los mapas LOLA mejorados, sus errores y el cálculo de horizontes.',
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
  skySearch: {
    heading: 'Búsqueda inversa',
    info: [
      'Busca la fecha y hora en que el Sol y la Tierra están donde indiques, vistos desde el punto elegido en «Punto de referencia».',
      'Abre la ventana de búsqueda para escribir las condiciones. Allí tienes ejemplos y una guía completa sobre unidades, valores posibles, precisión y límites.',
      'Son posiciones geométricas: el relieve no está modelado. Una coincidencia no garantiza luz, comunicaciones ni idoneidad de aterrizaje.',
    ],
    intro: 'Indica dónde quieres ver el Sol y la Tierra; se busca la fecha.',
    open: 'Abrir',
    dialogTitle: 'Búsqueda inversa · Sol y Tierra → fecha',
    summary: (count) => (count === 0 ? 'Sin condiciones' : count === 1 ? '1 condición' : `${count} condiciones`),
    lastMatch: 'Última coincidencia',
    lastNone: 'La última búsqueda no encontró coincidencia.',
    close: 'Cerrar',
    steps: { conditions: '1 · Condiciones', direction: '2 · Fecha buscada', result: '3 · Resultado' },
    conditionsHint:
      'Rellena de una a cuatro filas. Mínimo y máximo forman un rango; si rellenas solo uno, se busca ese valor exacto. Las filas vacías no imponen condición.',
    min: 'Mín',
    max: 'Máx',
    angles: { azimuth: 'Azimut', elevation: 'Elevación' },
    angleHints: { azimuth: '0° a 360°, desde el norte, horario', elevation: '-90° a 90°, sobre el plano de referencia' },
    fieldLabel: (body, angle, bound) => `${body}, ${angle}, ${bound}`,
    minimum: 'mínimo',
    maximum: 'máximo',
    possibleHeading: 'Posible aquí',
    anyAzimuth: 'cualquiera',
    span: (min, max) => `${min} a ${max}`,
    clear: 'Vaciar campos',
    direction: 'Fecha buscada',
    directions: { nearest: 'Más próxima', after: 'Siguiente', before: 'Anterior' },
    directionHints: {
      nearest: 'La coincidencia más cercana a la referencia, antes o después.',
      after: 'La coincidencia más cercana posterior a la referencia.',
      before: 'La coincidencia más cercana anterior a la referencia.',
    },
    reference: (site, utc) => `Referencia: ${site} · ${utc}`,
    search: 'Buscar fecha',
    searching: 'Buscando',
    cancel: 'Cancelar',
    background: 'Puedes cerrar esta ventana: la búsqueda sigue y el resultado aparecerá aquí.',
    needOne: 'Rellena al menos un campo.',
    rowErrors: {
      format: 'Escribe grados con hasta 4 decimales.',
      azimuthBounds: 'El azimut va de 0° a 360°.',
      elevationBounds: 'La elevación va de -90° a 90°.',
      order: 'En la elevación, el mínimo no puede superar al máximo.',
    },
    wrapsNorth: (body) => `${body}: el rango de azimut cruza el norte.`,
    impossible: (body) => `${body}: desde este punto nunca alcanza esos valores.`,
    noResult: 'Aún no has buscado. El resultado aparecerá aquí y, si hay coincidencia, también en el horizonte local.',
    examplesHeading: 'Ejemplos',
    examplesIntro: 'Rellenan el formulario para que veas cómo se escribe cada caso; puedes ajustarlos antes de buscar.',
    examples: {
      sunLow: { title: 'Sol bajo', detail: 'Elevación del Sol entre 0° y 2°: un rango con mínimo y máximo.' },
      earthUp: { title: 'Tierra sobre el plano', detail: 'Elevación de la Tierra de 0° a 90°: «al menos 0°» se escribe con 90° como máximo.' },
      sunNorth: { title: 'Sol hacia el norte', detail: 'Azimut del Sol de 350° a 10°: el mínimo es mayor que el máximo, así que el rango cruza el norte.' },
      both: { title: 'Sol y Tierra a la vez', detail: 'Ambas elevaciones de 0° a 90°: todas las filas rellenas deben cumplirse en el mismo instante.' },
    },
    tryExample: 'Probar',
    tryExampleLabel: (example) => `Probar el ejemplo: ${example}`,
    guideHeading: 'Guía',
    guide: [
      {
        heading: 'Qué hace',
        paragraphs: [
          '«Actualizar vista» responde a «en esta fecha, ¿dónde están el Sol y la Tierra?». La búsqueda inversa responde a la pregunta contraria: indicas dónde quieres verlos y obtienes la fecha y hora UTC en que ocurre, vista desde el punto elegido en «Punto de referencia».',
          'Rellena entre uno y cuatro campos: azimut y elevación del Sol y de la Tierra. Todas las filas rellenas deben cumplirse a la vez; las vacías no imponen nada.',
        ],
      },
      {
        heading: 'Azimut y elevación',
        paragraphs: [
          'Azimut: dirección a lo largo del horizonte, de 0° a 360°, medida desde el norte en sentido horario (90° es el este, 180° el sur y 270° el oeste).',
          'Elevación: ángulo sobre el plano de referencia, de -90° a 90°. Un valor negativo indica que el objeto está por debajo de ese plano.',
        ],
      },
      {
        heading: 'Rangos, valores exactos y campos vacíos',
        paragraphs: [
          'Con mínimo y máximo, la fila es un rango que incluye los dos extremos. Si rellenas solo uno de los dos, la fila pide ese valor exacto, comparado con 4 decimales.',
          'Para pedir «al menos» o «como mucho», escribe también el otro extremo con el límite del ángulo: por ejemplo, elevación mínima 0 y máxima 90 para «sobre el plano de referencia».',
          'Los valores van en grados con hasta 4 decimales; se acepta punto o coma decimal.',
          'En el azimut, si el mínimo es mayor que el máximo, el rango cruza el norte: de 350 a 10 abarca de 350° a 360° y de 0° a 10°. En la elevación, el mínimo no puede superar al máximo.',
        ],
      },
      {
        heading: 'Qué valores son posibles en este punto',
        paragraphs: [
          'Visto desde la Luna, el Sol nunca se aparta más de 1,6° del ecuador lunar y la Tierra nunca más de unos 10,7° de su posición media. Por eso, desde un punto cercano al polo, cada objeto solo recorre una franja estrecha del cielo.',
          'La columna «Posible aquí» indica qué elevación y azimut puede tener cada objeto en el punto elegido. Los límites salen de JPL Horizons (DE441, 1969–2100) con 0,25° de margen. Si una fila pide valores fuera de esa franja, el formulario la marca y no deja buscar.',
          'Una condición aceptada puede, aun así, no cumplirse dentro de la ventana buscada, sobre todo si combinas varias filas que deben coincidir en el mismo instante.',
        ],
      },
      {
        heading: 'Fecha buscada y ventana',
        paragraphs: [
          'La búsqueda parte de la fecha y hora seleccionadas en «Fecha y hora». «Más próxima» acepta coincidencias antes o después; «Siguiente», solo posteriores; «Anterior», solo anteriores.',
          'Explora hasta 366 días y entre 1969 y 2099, con resolución de 1 segundo. Si cambias el punto de referencia o la fecha y hora, la siguiente búsqueda parte de los nuevos valores.',
        ],
      },
      {
        heading: 'Precisión y tiempo de respuesta',
        paragraphs: [
          'Cada coincidencia se comprueba con los valores que da JPL Horizons para ese segundo, redondeados a 4 decimales, y se muestra en el horizonte local. Un rango más estrecho que lo que el objeto recorre en un segundo puede no tener coincidencia.',
          'La búsqueda consulta JPL Horizons varias veces y puede tardar. Hay un límite de consultas: si se alcanza, el resultado lo indica; prueba con rangos más amplios o con otra fecha de referencia.',
        ],
      },
      {
        heading: 'Límites',
        paragraphs: [
          'Son posiciones geométricas: el relieve no está modelado. Una coincidencia no garantiza luz, comunicaciones ni idoneidad de aterrizaje.',
        ],
      },
    ],
    matchHeading: 'Coincidencia',
    offset: 'Respecto a la referencia',
    condition: 'Condición',
    value: 'Valor',
    shown: 'Ya se muestra en el horizonte local.',
    show: 'Ver en el horizonte',
    incomplete: 'Se agotó el límite de consultas: la coincidencia es real, pero podría haber otra más próxima.',
    notFound: (start, end) => `Ninguna fecha entre ${start} y ${end} cumple las condiciones.`,
    budget: (start, end) =>
      `Se agotó el límite de consultas (revisado de ${start} a ${end}) sin encontrar coincidencia. Prueba con rangos más amplios o con otra fecha de referencia.`,
    otherSite: (site) => `Resultado para ${site}; el punto de referencia ha cambiado. Vuelve a buscar.`,
    precision: 'JPL Horizons · resolución 1 s · 4 decimales · sin relieve',
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
      'They are the centers of candidate regions published by NASA (Lunar Surface Data Book, table A2.1-1). They are not approved landing sites.',
      'The "Point list" drop-down starts with Apollo 11 and the three original demo points (Nobile Rim 1, Nobile Rim 2 and Shackleton Rim) and continues with the other documented points, in alphabetical order. All are computed with the same method; the first-person terrain view only exists for some points, and the others are shown in third person.',
      'You can also type coordinates in degrees (latitude, longitude; south and west negative or with S/W) or search a point by name or code (e.g. "Haworth", "DM1", "Site20v2"). A custom point is computed with the same method, at 0 km height and without terrain, and has no published source.',
      '"Leibnitz Beta Plateau, extended boundaries" (Site20v2) is a PGDA terrain-product variant with the same coordinates as Leibnitz Beta Plateau (Site20): its calculation is identical.',
    ],
    customTag: 'CUSTOM',
    customName: 'Custom point',
    apollo11: {
      tag: '★ HISTORIC',
      title: 'Apollo 11 moments',
      landing: 'Landing',
      flag: 'Flag erected',
      selected: 'selected',
    },
    search: 'Coordinates or name',
    searchPlaceholder: '-85.4381, 37.36667 · Haworth',
    searchReading: (coordinates) => `Custom point: ${coordinates}`,
    siteList: {
      label: 'Point list',
      placeholder: 'Choose a point from the list…',
      hint: (count, featured) =>
        `${count} points from the Lunar Surface Data Book: the ${featured} main demo points first, then the others in alphabetical order. All are computed with the same method.`,
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
      'Date and time between 1969 and 2099, in the time zone you choose.',
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
    invalidTime: 'Enter a valid date and time between 1969 and 2099.',
    nonexistentTime: 'That local time does not exist because of a daylight-saving change. Pick another time.',
  },
  compass: { north: 'N', east: 'E', south: 'S', west: 'W' },
  hemisphere: { north: 'N', south: 'S', east: 'E', west: 'W' },
  bodies: { sun: 'Sun', earth: 'Earth' },
  scene: {
    heading: 'Local horizon',
    info: {
      'first-person': [
        'Eye-level view, standing still at Apollo 11 or a few meters from a 1.70 m astronaut at Nobile Rim 1, Nobile Rim 2, Shackleton Rim, Amundsen Rim, Haworth, Shoemaker Rim A or Faustini Rim A. Drag to turn your head: sideways to look around, up or down to look at the ground or the sky. The wheel, a pinch or the zoom control (+, bar and −) zooms the image in or out, like binoculars, without moving you. With the view focused, the arrow keys and +/− also work. The Compass button, next to 1ST and 3RD, shows or hides the horizon line and the cardinal points; the corners button opens the view full screen.',
        'The relief is a 10 × 10 km crop (12 × 14 km at Haworth, 12 × 12 km at Shoemaker Rim A and Faustini Rim A) of the 5 m/pixel LOLA model (NASA GSFC PGDA, product 78). The green line is the geometric horizon (elevation 0). There is no relief data beyond the crop: there is an assumed horizon (invisible; only stars show below it), that of a smooth Moon of 1,737.4 km radius continuing at the height of the crop edge, seen from the eyes (1.60 m above the ground). It is not real terrain. Where the terrain falls away, that horizon lies below the green line, so the Sun or the Earth may show in part even when its center is below the geometric horizon. The part of the Sun or the Earth hidden by the relief or that assumed horizon is drawn translucent so it can be found; it would not be visible from there.',
        'The Sun and the Earth are drawn with their JPL Horizons position and apparent diameter. Lighting is illustrative: no cast shadows; the relief crop is flat and lunar curvature is only assumed beyond it. This is not a visibility, power, communications or landing-suitability analysis.',
        'The astronaut is an illustrative scale figure. The stars are decorative and do not reproduce the real sky.',
      ],
      'third-person': [
        'Drag to rotate the view; use the wheel, a pinch or the zoom control (+, bar and −) to zoom in or out. The Scale switch at the top left changes between the visual and the real scale. The Compass button, next to 1ST and 3RD, shows or hides the horizon plane, its grid and the angle guides; the corners button opens the view full screen.',
        'Visual scale (default): a schematic local sky, not to scale. The Sun and the Earth are at their true azimuth (the JPL Horizons value shown in the data panel), on a dome of fixed radius and enlarged: at this scale, distance and size mean nothing. Near the south pole they are usually a few degrees from the horizon, so elevation is drawn with a vertical exaggeration (×2 to ×10, shown in the note and the table); the labels always give the true value. On the green plane (elevation 0), a colored arc runs from north to each azimuth and a vertical one rises from the plane to each elevation, with its value. The dashed white line joins the Sun and the Earth and gives their angular separation; the white arc on the plane, their azimuth difference. The table sums up the values and the Earth − Sun difference. The separation is computed with spherical trigonometry from the true azimuth and elevation.',
        'Real scale, in kilometers: the Moon is a globe of 1,737.4 km radius (a NASA SVS model turned so the site lies under the observer) and the Sun and the Earth are at the distance and size given by JPL Horizons. That is why they look small: zoom out to see the Earth–Moon system, and on beyond the Sun. The green plane is the local reference horizon, tangent at the site, with the N/E/S/W compass; it grows as you zoom out so it stays a reference. The colored lines and arcs mark the azimuth and elevation; the gray line is the lunar spin axis.',
        'At neither scale are the observer marker, the glows that help find the Sun and the Earth, or the plane size to scale. The Moon, Earth and Sun globes are appearance models: the lunar relief is coarse and is not the terrain of the site, and the rotation of the Earth and the Sun is not computed. The stars are decorative. This is not a visibility, power, communications or landing-suitability analysis.',
      ],
    },
    views: {
      label: 'View',
      names: { 'first-person': 'First person', 'third-person': 'Third person' },
      short: { 'first-person': '1ST', 'third-person': '3RD' },
      firstPersonUnavailable: 'First person: only available at Apollo 11, Nobile Rim 1, Nobile Rim 2, Shackleton Rim, Amundsen Rim, Haworth, Shoemaker Rim A and Faustini Rim A, which have a relief model.',
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
      level: (percent) => `Visual scale zoom: ${percent}%`,
    },
    scale: {
      label: 'Scale',
      names: { visual: 'Visual', real: 'Real' },
      titles: {
        visual: 'Visual scale: true azimuth, elevation stretched when low, and angle guides; sizes and distances not to scale',
        real: 'Real scale: the Moon, the Earth and the Sun to scale, in kilometers',
      },
    },
    guides: {
      azimuth: (value) => `Az ${value}`,
      elevation: (value) => `El ${value}`,
      separation: (value) => `Separation ${value}`,
      azimuthDifference: (value) => `ΔAz ${value}`,
      legend: {
        caption: 'Azimuth and elevation of the Sun and the Earth from the site, their difference and their angular separation',
        azimuth: 'Az',
        elevation: 'El',
        difference: 'Δ E − S',
        differenceTitle: 'Earth − Sun difference. In azimuth, the shortest turn; positive toward east (clockwise).',
        separation: 'Separation',
        exaggeration: (factor) => `Elevation drawn ×${factor}`,
      },
    },
    apolloReenactmentNote: 'Apollo 11 reenactment on LROC terrain · Collins remained in orbit.',
    firstPersonNote: (crop) => `LOLA relief ${crop} km · illustrative light · 1.70 m figure`,
    thirdPersonNote: {
      visual: (exaggeration) =>
        exaggeration
          ? `Visual scale · true azimuth, elevation drawn ×${exaggeration}; sizes and distances not to scale`
          : 'Visual scale · true directions; sizes and distances not to scale',
      real: 'To scale · marker, glows, compass and lunar axis not to scale',
    },
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
    siteVariant: (baseName) =>
      `Extended terrain-product variant (PGDA product 78) with the same coordinates as ${baseName}; the calculation is identical.`,
    coordinates: 'Coordinates',
    positionSource: 'Positions',
    partial: 'Incomplete result: one of the objects could not be computed.',
    versionUnverified: 'Horizons returned an unverified API version; check the values.',
    sourcesCurrent: 'This query',
    sourcesApp: 'Data and methods used in the app',
    sourcesResearch: 'Consulted during research (not integrated or validated in the app)',
    sourceReasons: {
      apolloLanding: 'Apollo 11 touchdown date and time from the NASA mission catalogue.',
      apolloTerrain: 'LROC 2 m/pixel elevation model behind the Apollo 11 reenactment.',
      lunarSurfaceDataBook:
        'Names and coordinates of south pole reference points, at the centers of candidate regions.',
      horizonsApi: 'Computes azimuth, elevation, angular size and range of the Sun and the Earth from the chosen lunar point.',
      horizonsManual: 'Defines the observer quantities and the presence markers we turn into the panel states.',
      jplApiPolicy: 'Usage rules and CORS policy: the reason the query goes through our server route and is cached.',
      pgda78: 'LOLA 5 m/pixel terrain behind the first-person 3D meshes of Nobile Rim 1, Nobile Rim 2, Shackleton Rim and Amundsen Rim (10 × 10 km), Haworth (12 × 14 km) and Shoemaker Rim A and Faustini Rim A (12 × 12 km); it also documents the extended Site20v2 variant.',
      pgda78Readme: 'Units, MOON_ME/DE421 frame and polar stereographic projection used to place the point on the mesh.',
      barker2021: 'Citation for the DM1, DM2, Haworth, LM2 and LM7 products: method of the improved LOLA maps, their errors and horizon computation.',
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
  skySearch: {
    heading: 'Inverse search',
    info: [
      'Finds the date and time at which the Sun and the Earth are where you say, seen from the point chosen under "Reference point".',
      'Open the search window to enter the conditions. It has examples and a full guide to units, possible values, precision and limits.',
      'These are geometric positions: terrain is not modeled. A match does not guarantee light, communications or landing suitability.',
    ],
    intro: 'Say where you want the Sun and the Earth; the date is found.',
    open: 'Open',
    dialogTitle: 'Inverse search · Sun and Earth → date',
    summary: (count) => (count === 0 ? 'No conditions' : count === 1 ? '1 condition' : `${count} conditions`),
    lastMatch: 'Last match',
    lastNone: 'The last search found no match.',
    close: 'Close',
    steps: { conditions: '1 · Conditions', direction: '2 · Date to find', result: '3 · Result' },
    conditionsHint:
      'Fill in one to four rows. Minimum and maximum make a range; fill in only one and that exact value is searched. Empty rows set no condition.',
    min: 'Min',
    max: 'Max',
    angles: { azimuth: 'Azimuth', elevation: 'Elevation' },
    angleHints: { azimuth: '0° to 360°, clockwise from north', elevation: '-90° to 90°, above the reference plane' },
    fieldLabel: (body, angle, bound) => `${body}, ${angle}, ${bound}`,
    minimum: 'minimum',
    maximum: 'maximum',
    possibleHeading: 'Possible here',
    anyAzimuth: 'any',
    span: (min, max) => `${min} to ${max}`,
    clear: 'Clear fields',
    direction: 'Date to find',
    directions: { nearest: 'Closest', after: 'Next', before: 'Previous' },
    directionHints: {
      nearest: 'The match closest to the reference, earlier or later.',
      after: 'The closest match after the reference.',
      before: 'The closest match before the reference.',
    },
    reference: (site, utc) => `Reference: ${site} · ${utc}`,
    search: 'Find date',
    searching: 'Searching',
    cancel: 'Cancel',
    background: 'You can close this window: the search keeps going and the result will show up here.',
    needOne: 'Fill in at least one field.',
    rowErrors: {
      format: 'Enter degrees with up to 4 decimals.',
      azimuthBounds: 'Azimuth goes from 0° to 360°.',
      elevationBounds: 'Elevation goes from -90° to 90°.',
      order: 'For elevation, the minimum cannot exceed the maximum.',
    },
    wrapsNorth: (body) => `${body}: the azimuth range wraps through north.`,
    impossible: (body) => `${body}: never reaches these values from this point.`,
    noResult: 'No search yet. The result will show up here and, if there is a match, on the local horizon too.',
    examplesHeading: 'Examples',
    examplesIntro: 'They fill in the form so you can see how each case is typed; adjust them before searching if you like.',
    examples: {
      sunLow: { title: 'Low Sun', detail: 'Sun elevation between 0° and 2°: a range with a minimum and a maximum.' },
      earthUp: { title: 'Earth above the plane', detail: 'Earth elevation from 0° to 90°: "at least 0°" is typed with 90° as the maximum.' },
      sunNorth: { title: 'Sun towards north', detail: 'Sun azimuth from 350° to 10°: the minimum is above the maximum, so the range wraps through north.' },
      both: { title: 'Sun and Earth together', detail: 'Both elevations from 0° to 90°: every filled row must hold at the same instant.' },
    },
    tryExample: 'Try',
    tryExampleLabel: (example) => `Try the example: ${example}`,
    guideHeading: 'Guide',
    guide: [
      {
        heading: 'What it does',
        paragraphs: [
          '"Update view" answers "on this date, where are the Sun and the Earth?". The inverse search answers the opposite question: you say where you want to see them and get the UTC date and time at which that happens, seen from the point chosen under "Reference point".',
          'Fill in one to four fields: azimuth and elevation of the Sun and of the Earth. Every filled row must hold at once; empty rows set nothing.',
        ],
      },
      {
        heading: 'Azimuth and elevation',
        paragraphs: [
          'Azimuth: direction along the horizon, 0° to 360°, measured clockwise from north (90° is east, 180° south and 270° west).',
          'Elevation: angle above the reference plane, -90° to 90°. A negative value means the body is below that plane.',
        ],
      },
      {
        heading: 'Ranges, exact values and empty fields',
        paragraphs: [
          'With a minimum and a maximum, the row is a range that includes both ends. Fill in only one of the two and the row asks for that exact value, compared at 4 decimals.',
          'To ask for "at least" or "at most", also type the other end as the angle limit: for example, elevation minimum 0 and maximum 90 for "above the reference plane".',
          'Values are degrees with up to 4 decimals; a decimal point or comma is accepted.',
          'For azimuth, if the minimum is above the maximum, the range wraps through north: 350 to 10 covers 350° to 360° and 0° to 10°. For elevation, the minimum cannot exceed the maximum.',
        ],
      },
      {
        heading: 'Which values are possible at this point',
        paragraphs: [
          'Seen from the Moon, the Sun never strays more than 1.6° from the lunar equator and the Earth never more than about 10.7° from its mean position. So, from a point near the pole, each body only covers a narrow band of the sky.',
          'The "Possible here" column shows which elevation and azimuth each body can have at the chosen point. The bounds come from JPL Horizons (DE441, 1969–2100) with a 0.25° margin. If a row asks for values outside that band, the form flags it and does not allow the search.',
          'An accepted condition may still not be met within the searched window, especially when you combine several rows that must hold at the same instant.',
        ],
      },
      {
        heading: 'Date to find and window',
        paragraphs: [
          'The search starts from the date and time selected under "Date and time". "Closest" accepts matches earlier or later; "Next", only later ones; "Previous", only earlier ones.',
          'It covers up to 366 days, between 1969 and 2099, to the second. If you change the reference point or the date and time, the next search starts from the new values.',
        ],
      },
      {
        heading: 'Precision and response time',
        paragraphs: [
          'Every match is checked against the values JPL Horizons gives for that second, rounded to 4 decimals, and is shown on the local horizon. A range narrower than what the body moves in one second may have no match.',
          'The search queries JPL Horizons several times and can take a while. There is a request limit: if it is reached, the result says so; try wider ranges or another reference date.',
        ],
      },
      {
        heading: 'Limits',
        paragraphs: ['These are geometric positions: terrain is not modeled. A match does not guarantee light, communications or landing suitability.'],
      },
    ],
    matchHeading: 'Match',
    offset: 'From the reference',
    condition: 'Condition',
    value: 'Value',
    shown: 'Already shown on the local horizon.',
    show: 'Show on horizon',
    incomplete: 'The request limit was reached: the match is real, but a closer one may exist.',
    notFound: (start, end) => `No date between ${start} and ${end} meets the conditions.`,
    budget: (start, end) =>
      `The request limit was reached (searched ${start} to ${end}) without a match. Try wider ranges or another reference date.`,
    otherSite: (site) => `Result for ${site}; the reference point has changed. Search again.`,
    precision: 'JPL Horizons · 1 s resolution · 4 decimals · no terrain',
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
