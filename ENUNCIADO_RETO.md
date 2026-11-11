# Enunciado del reto — Lunar Landing Site Navigator

**Fuente oficial:** [NASA Space Apps Challenge 2026 — Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)  
**Consultado:** 2026-11-09; recursos revisados de nuevo el 2026-11-11  
**Estado de esta copia:** guía fiel en español y estructurada; no es una reproducción literal ni sustituye la página oficial. Los nombres de secciones reflejan la página consultada.

> Si una interpretación de esta guía y la página oficial difieren, prevalece la página oficial. Al 9 de noviembre, la página del reto anunciaba recursos para el viernes 13; al revisar el portal general de Resources el 11 de noviembre aún no se mostraba material. El equipo decidió comprobarlo al llegar al hackathon.

## En una frase

Crear una herramienta intuitiva para evaluar y comparar rápidamente lugares y fechas de aterrizaje lunar, mostrando dónde están el Sol y la Tierra respecto al horizonte para explorar las posibilidades de energía solar y comunicación directa con la Tierra.

## Descripción del reto

Las misiones que se dirigen al polo sur lunar deben planificarse teniendo en cuenta condiciones exigentes de iluminación y comunicación. La selección de lugares y fechas requiere coordinar necesidades científicas y de ingeniería.

Existen herramientas para calcular dónde estarán el Sol y la Tierra vistos desde posibles lugares de aterrizaje, pero sus interfaces pueden resultar complicadas y hacen lenta la evaluación de información importante. El reto propone una herramienta o aplicación intuitiva para que planificadores de misiones, educadores y público general comparen rápidamente ubicaciones y fechas. Debe visualizar la posición del Sol y de la Tierra respecto al horizonte y ayudar a evaluar el potencial de generación de energía y las oportunidades de comunicación directa con la Tierra.

## Antecedentes y problema que motiva el reto

- El programa CLPS de NASA y otras misiones lunares dependen de elegir lugares y fechas que equilibren objetivos de ciencia e ingeniería.
- La posición del Sol afecta la disponibilidad de energía para paneles solares y las condiciones térmicas de los equipos. La posición de la Tierra afecta si sería posible comunicarse directamente sin satélites repetidores.
- El polo sur lunar es especialmente complejo: la iluminación y la visibilidad de la Tierra pueden variar mucho según el lugar, el día lunar y la estación. Cambios pequeños de ubicación o fecha pueden cambiar sustancialmente esas condiciones.
- Los planes pueden cambiar por retrasos de lanzamiento o dificultades de desarrollo del hardware. Los equipos necesitan comparar con rapidez otros lugares de la región o nuevas fechas para entender cómo cambian las condiciones.
- Herramientas como NASA QuickMap, Moon Trek y JPL Horizons permiten análisis detallados, pero pueden exigir navegar varias interfaces e interpretar datos sin procesar. El reto identifica una oportunidad para hacer esa información más clara y comparable.

## Objetivo

Construir una herramienta o aplicación que permita evaluar rápidamente opciones de lugares de aterrizaje lunar. El enunciado dice que la solución **puede incluir** las funciones siguientes; son posibilidades orientativas, no una lista de requisitos obligatorios que haya que implementar todas:

1. **Elegir y comparar lugares:** una lista seleccionada de lugares destacados —por ejemplo, misiones Apollo pasadas, objetivos CLPS futuros u otras misiones comerciales o internacionales— y, si se desea, coordenadas lunares personalizadas. La comparación puede ser lado a lado o secuencial.
2. **Elegir fechas y horas:** permitir seleccionar fecha/hora y explorar cambios entre días lunares o estaciones para entender el efecto de cambios de calendario.
3. **Visualizar Sol y Tierra:** mostrar su posición respecto al horizonte en el lugar y fecha elegidos. Podría indicarse cuánto falta para la puesta del Sol o de la Tierra.
4. **Evaluar energía y comunicación:** podrían mostrarse métricas como elevación solar, duración de la iluminación y ventanas de visibilidad de la Tierra para comparar condiciones del lugar y la fecha.
5. **Escoger una representación adecuada:** mapas 2D, superficie 3D u otras visualizaciones que ayuden a comprender las relaciones espaciales.
6. **Mostrar el cambio en el tiempo:** animación o línea temporal de la posición del Sol y la Tierra a lo largo de un día lunar o varios días.
7. **Servir a distintos niveles de conocimiento:** tanto a personas que necesitan información técnica para planificar como a quienes quieren aprender sobre las dificultades de explorar la Luna.

La solución puede adoptar distintos formatos, como aplicación web o móvil, visualización interactiva, juego educativo u otro formato, siempre que facilite una evaluación rápida, clara y eficaz de las opciones.

## Consideraciones opcionales de la página

La página presenta las siguientes ideas con carácter expresamente opcional («may», «consider»; no son mandatos):

### Enfoque técnico

- Usar posiciones calculadas con herramientas como JPL Horizons o conjuntos de datos ya calculados.
- Usar topografía lunar, por ejemplo datos del instrumento LOLA, para visualizaciones de superficie o cálculos del horizonte más realistas.
- Tener en cuenta que la Luna carece de atmósfera: no hay que aplicar refracción atmosférica terrestre; el horizonte depende del terreno local y del borde de la esfera lunar visible desde el punto.
- Considerar la elevación del Sol como indicador relevante para la generación solar.

### Experiencia de usuario

- Priorizar la comparación rápida de varios escenarios.
- Explicar claramente el tiempo que queda antes de que el Sol o la Tierra se oculten, si se muestra esa información.
- Hacer comprensibles las diferencias entre las condiciones lunares y terrestres.
- Ayudar a entender por qué un cambio pequeño de ubicación o fecha puede tener un efecto grande.

### Datos y precisión

- Considerar la topografía real, que puede cambiar el horizonte y los periodos de visibilidad.
- Evaluar si se tendrán en cuenta la libración de la Tierra vista desde la Luna y las variaciones orbitales lunares.
- Considerar pendientes pronunciadas y cráteres profundos, que producen sombras complejas en el polo sur.

### Utilidad

- Apoyar la coordinación entre ciencia e ingeniería durante el desarrollo de misiones.
- Ayudar a evaluar alternativas cuando cambien fechas o lugares por retrasos o problemas técnicos.
- Servir como material educativo para explicar por qué la planificación lunar es compleja.

## Qué exige el enunciado y qué deja a elección

**Núcleo explícito del reto:** una herramienta intuitiva que haga rápida la evaluación y comparación de lugares y fechas; que visualice posiciones del Sol y de la Tierra relativas al horizonte; y que permita explorar las implicaciones para energía solar y comunicación directa.

**A elección del equipo:** formato de la solución, lugares concretos, entrada de coordenadas, comparación simultánea o secuencial, nivel de detalle, métricas, fuentes y métodos, mapas 2D o 3D, animación, y profundidad científica que pueda justificarse en el tiempo disponible.

**No afirma por sí solo:** que un sitio sea seguro o viable para aterrizar; que visibilidad geométrica equivalga a un enlace de radio disponible; ni que la iluminación determine por sí sola la energía generada. Esas conclusiones requieren datos, supuestos y métodos definidos. Esta nota es una cautela de interpretación para el equipo, no texto literal del reto.

## Recursos oficiales

La pestaña **Resources** de la página del reto indicaba al consultarla el 9 de noviembre de 2026: «Resources will be available on Friday, November 13.» En la revisión del portal general el 11 de noviembre todavía no se mostraba material. Esta guía no incluye recursos adicionales; el equipo los revisará en el hackathon si están disponibles y anotará fuentes/licencias que realmente use.

## Cómo usar esta guía para revisar el alcance

Ante una propuesta, preguntar:

1. ¿Ayuda a evaluar o comparar rápidamente lugares y fechas lunares?
2. ¿Hace comprensibles las posiciones del Sol y la Tierra respecto al horizonte?
3. ¿Conecta esa visualización con las preguntas de energía solar y comunicación directa?
4. ¿Sus datos y conclusiones están explicados con fuentes y límites, sin afirmar más de lo que permiten?

Si la respuesta a las tres primeras es no, puede que la propuesta se esté alejando del núcleo del reto. Las funciones concretas mencionadas en «Objetivo» y «Consideraciones opcionales» no deben tratarse como obligatorias solo por aparecer en esta guía.
