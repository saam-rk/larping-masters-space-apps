# Guía práctica para preparar la primera demo

**Fecha:** 10 de noviembre de 2026  
**Estado:** alcance y controles principales confirmados. La interpretación de los campos se contrastó con el manual oficial de JPL Horizons.

## Qué vamos a construir

La primera demo tendrá una pantalla con tres zonas principales:

1. Un panel grande para elegir un lugar lunar y una fecha y hora.
2. Una vista 3D sencilla que muestre el horizonte local y la dirección del Sol y la Tierra.
3. Un panel de texto con los datos de esos mismos objetos, sus unidades, la fuente y una explicación de los límites.

El usuario cambia el lugar o la hora y pulsa **Actualizar vista**. La pantalla actualiza los tres paneles para ese mismo caso. La primera versión no dibuja montañas ni cráteres y no calcula si el relieve tapa el Sol o la Tierra.

## Qué puede elegir la persona usuaria

Usa un menú desplegable con estos tres puntos de referencia del polo sur lunar:

| Opción | Latitud | Longitud |
|---|---:|---:|
| Nobile Rim 1, opción inicial | 85.4381° S | 37.36667° E |
| Nobile Rim 2 | 83.954° S | 58.82206° E |
| Shackleton Rim | 89.7668° S | 171.87° W |

La [tabla A2.1-1 del Lunar Surface Data Book de NASA](https://ntrs.nasa.gov/api/citations/20250002845/downloads/M2M-30044%20Lunar%20Surface%20Data%20Book%20Baseline_Final.pdf?attachment=true) publica estos nombres y coordenadas. La misma fuente explica que los puntos representan el centro de polígonos originales; no son lugares de aterrizaje aprobados.

Muestra las coordenadas del lugar elegido debajo del menú. No pidas coordenadas manuales ni permitas marcar cualquier punto del mapa en esta primera versión. Añade controles de fecha y hora en UTC. Usa el 14 de noviembre de 2026 a las 12:00 UTC como valor inicial y permite cambiarlo.

La vista de muestra puede usar una respuesta guardada de Horizons para Nobile Rim 1. Para que los otros lugares y las horas editadas produzcan resultados nuevos, la aplicación necesita consultar Horizons. JPL documenta que su API no se debe incrustar directamente en una web por su política CORS. El navegador debe llamar a una ruta de servidor del proyecto, que consultará Horizons; hasta que exista esa ruta, Andrés puede trabajar con el caso de muestra guardado.

## Qué muestra el panel de texto

Muestra estos datos en este orden:

1. Nombre del lugar, latitud, longitud y fecha/hora UTC.
2. Para el Sol, azimut y elevación en grados.
3. Para la Tierra, azimut y elevación en grados.
4. Estados legibles derivados de los indicadores de Horizons: el borde superior del Sol está sobre el horizonte de referencia; el borde superior de la Tierra también está sobre él. En la Tierra, el centro queda bajo el plano geométrico, por lo que parte del disco queda a cada lado.
5. Fuentes: NASA Lunar Surface Data Book para el punto de referencia y JPL Horizons para las posiciones.
6. Una advertencia visible: "Posiciones geométricas. El modelo no incluye montañas ni cráteres del lugar."

No muestres `delta` ni `deldot` en el resumen principal. La consulta los devuelve como distancia y velocidad de cambio de distancia entre el observador y el objeto. No indican por sí solos que haya una conexión de comunicaciones disponible. El tamaño angular puede omitirse del resumen inicial; si Andrés lo usa para dibujar los discos, la vista debe decir "no a escala".

## Qué significan los datos

Horizons devuelve dos datos de dirección para cada objeto:

- **Azimut**, en grados: la dirección sobre el horizonte, como una brújula. 0° es norte, 90° este, 180° sur y 270° oeste.
- **Elevación**, en grados: cuánto queda el objeto por encima o por debajo del plano horizontal local. Un valor positivo queda por encima; uno negativo, por debajo.

La elevación de Horizons no incluye por sí sola el efecto de montañas y cráteres. Por eso la interfaz debe decir "posición geométrica; terreno no incluido" y no afirmar que el objeto será visible desde el suelo real.

## Caso de ejemplo disponible

Ya tenemos una respuesta de Horizons para el punto de referencia Nobile Rim 1, el 14 de noviembre de 2026 a las 12:00 UT. La consulta usó `h=0`, que en este caso es altura cero respecto a la esfera de referencia de Horizons. No significa que hayamos medido la altura real del terreno.

| Objeto | Azimut | Elevación | Tamaño angular |
|---|---:|---:|---:|
| Sol | 83.3015° | +2.0947° | 1941.825 segundos de arco |
| Tierra | 320.8167° | -0.5879° | 6492.344 segundos de arco |

El manual de Horizons define el tamaño angular como el ancho completo del disco. En la respuesta, el indicador `i` significa que el borde superior de la Tierra está en o sobre el horizonte de referencia. La elevación negativa corresponde al centro de la Tierra. Estos datos describen el plano geométrico; no demuestran que el relieve permita verla.

Usad estos números como datos de muestra para dibujar y revisar la pantalla. No los presentéis como predicción de una misión ni como resultado validado para el terreno. La consulta/respuesta cruda de Horizons no está incluida en esta guía ni en el paquete compartible actual; si se usa como fixture reproducible durante el hackathon, guardad el original y los parámetros junto al fixture.

## Tareas concretas para el equipo

Estas tareas reparten el trabajo según los roles ya acordados. No cambian el alcance de la demo.

### Andrés, interfaz

Construye la pantalla acordada con los tres paneles. Añade un menú para los tres puntos de referencia de la tabla, muestra las coordenadas del lugar seleccionado y permite cambiar la fecha y hora en UTC. Usa el caso guardado de Nobile Rim 1 para que la pantalla funcione mientras preparamos la conexión con Horizons.

Muestra azimut y elevación en el panel de texto. Dibuja la dirección de cada objeto según esos valores. Traduce los estados de Horizons a frases comprensibles. Añade la nota visible sobre montañas y cráteres. Mantén los valores de muestra en un único objeto de datos para sustituirlos luego por una respuesta de servidor.

### Diego, datos

La coordinación ya contrastó los campos con el [manual oficial de Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html). No hace falta que Diego repita esa búsqueda ni que certifique el resultado científico. Su tarea útil para el recorrido inicial es preparar la consulta de Horizons para las ubicaciones y fechas seleccionadas y comprobar que el adaptador de datos devuelve los campos que la interfaz necesita:

1. Recibir la ubicación elegida y su latitud/longitud junto con la fecha/hora UTC.
2. Consultar las posiciones del Sol y la Tierra en JPL Horizons.
3. Devolver azimut y elevación, sus unidades, la hora calculada, la ubicación consultada y la fuente.
4. Conservar los marcadores de presencia de Horizons para traducirlos a los estados del panel.
5. Devolver errores o datos ausentes como tales, sin sustituirlos por cero.

La consulta actual también pide la cantidad 13, tamaño angular, y la cantidad 20, distancia y velocidad de cambio de distancia. El tamaño angular es opcional para la primera pantalla. La distancia y su variación no van en el resumen principal. No hace falta calcular el efecto de montañas, escoger una fecha de misión ni recomendar un lugar de aterrizaje.

### Coordinador, integración

Si el caso de muestra se incorpora como fixture reproducible, conserva junto a él la consulta y respuesta originales y sus parámetros. Esos originales aún no forman parte de esta guía ni del paquete compartible. Reúne la pantalla de Andrés y la ficha de Diego. Comprueba que los mismos valores aparecen en la visualización y en el panel de texto, y que la advertencia sobre el terreno se ve sin buscarla.

## Cuándo consideraremos lista la primera demo

- El usuario puede elegir un lugar y una fecha/hora.
- La pantalla muestra el Sol y la Tierra para la selección actual.
- La vista 3D y el panel de texto usan los mismos azimuts y elevaciones.
- El panel muestra unidades, la fuente y la hora consultada.
- La pantalla dice que el modelo no incluye montañas ni cráteres.
- La aplicación no llama "visible desde el terreno" a un resultado que solo compara el objeto con el plano geométrico.
- Si faltan datos o falla la consulta, la pantalla lo indica y no sustituye la ausencia por cero.

## Qué dejamos para después

La altura real del observador, el cálculo del horizonte con topografía, la comparación de un segundo lugar y la elección de fechas de misión no bloquean esta primera demo. Los retomaremos cuando el recorrido básico funcione y tengamos una fuente y un método comprobables.
