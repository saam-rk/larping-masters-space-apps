# Decisiones

Registrar acuerdos con fecha, responsable y evidencia. Propuestas y preguntas no son acuerdos. No borrar acuerdos antiguos: marcarlos sustituidos y enlazar la nueva decisión.

## Confirmadas
| ID | Fecha | Decisión | Contexto |
|---|---|---|---|
| D-001 | 2026-11-09 | Equipo de 3 personas. | Confirmado por el usuario. |
| D-002 | 2026-11-09 | Cuatro suscripciones: 2 ChatGPT/Codex y 2 Claude; usuario tiene 2, compañeros 1 cada uno. | Confirmado por el usuario. |
| D-003 | 2026-11-09 | El usuario integra y mergea PR. | Confirmado por el usuario. |
| D-004 | 2026-11-09 | El usuario informa que configuró DeepSeek API en Pi y cargó 5 € de saldo. El tope máximo de gasto es 10 € (confirmado el 2026-11-11). | El saldo cargado no cambia el límite de gasto. Precios/modelo concretos no verificados aquí. |
| D-005 | 2026-11-09 | Hackathon de Salamanca 14–15 noviembre 2026; reto oficial Lunar Landing Site Navigator. CLPS Lunar Mission Browser es el nombre de trabajo del producto. | Contexto del usuario; título oficial enlazado en `ENUNCIADO_RETO.md`. |
| D-006 | 2026-11-09 | Mantener cuatro agentes generales (`scout`, `worker`, `reviewer`, `oracle`) y dos agentes CLPS de lectura (`researcher`, `evidence-auditor`); archivar perfiles SDD/Judgment Day no usados. | Configuración creada para Pi; el usuario confirma el 2026-11-11 que revisó `/subagents-models`, el acceso efectivo y el endpoint. |
| D-007 | 2026-11-09 | Reparto humano: usuario coordina e integra; Diego lleva ciencia/datos; Andrés lleva interfaz. | Confirmado por el usuario. |
| D-008 | 2026-11-09 | Meta mínima: una app funcional que cubra lo principal del reto y tenga una interfaz llamativa, sofisticada y bien realizada para el tiempo disponible. | Confirmado por el usuario; el recorrido inicial está desarrollado en D-014/D-015. |
| D-009 | 2026-11-09 | Preparar la solución conforme a los términos oficiales NASA Space Apps 2026: abordar directamente un reto; original propio libre o con licencia OSI; materiales de terceros con disponibilidad/licencias compatibles; citar cada fuente y documentar licencias. | [Términos oficiales](https://www.spaceappschallenge.org/legal/) y [descripción oficial de CLPS Lunar Mission Browser](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/). Consultado el 2026-11-09. |
| D-010 | 2026-11-09 | Crear el repositorio remoto privado `larping-masters-space-apps` en la cuenta `saam-rk`. | [Repositorio](https://github.com/saam-rk/larping-masters-space-apps); creado y verificado con GitHub CLI a petición del usuario. Vacío por ahora; la visibilidad privada es reversible, revisar política/licencia antes de la entrega. |
| D-011 | 2026-11-09 | Conectar el checkout local en rama `main` al remoto `origin` y enviar invitaciones de escritura a Diego (`DMZ880`) y Andrés (`andrescurto`). | El usuario confirmó el 2026-11-11 que todos tienen acceso. La API de GitHub consultada en esta revisión devuelve el remoto vacío (tamaño 0); esta carpeta local aún tiene documentación sin seguimiento. |
| D-012 | 2026-11-09 | Acordar como recorrido inicial del MVP: el usuario selecciona un lugar lunar disponible y una fecha/hora; el dashboard muestra una visualización 3D sencilla con Sol/Tierra respecto al horizonte y un panel textual con sus datos básicos, fuente, unidades y límites. Comparar un segundo escenario queda como mejora opcional. | Confirmado por el usuario; los tres lugares, fecha inicial, campos y unidades se detallan en D-015 y `docs/GUIA_PRIMERA_DEMO.md`. La validación del método y los datos de Horizons se posponen hasta que se implemente el flujo. |
| D-013 | 2026-11-09 | El código y los artefactos técnicos del proyecto se escribirán en inglés. La aplicación ofrecerá español e inglés seleccionables; el idioma predeterminado será español (actualización confirmada el 2026-11-11). Los prompts a agentes pueden estar en cualquiera de los dos idiomas, pero los archivos y resultados incorporados al proyecto deben estar en inglés. | Confirmado por el usuario en conversación. Aplicar según las instrucciones de idioma de `AGENTS.md`; no implica traducir la documentación de preparación existente en español. |
| D-014 | 2026-11-10 | Confirmar el alcance de la primera demo: selector de lugar lunar y fecha/hora; posiciones del Sol y la Tierra en vista 3D sencilla y datos básicos textuales con unidades, fuentes y límites visibles. La aproximación inicial no considera montañas ni cráteres. Nobile Rim 1 se usará como caso de prueba inicial, no como sitio de aterrizaje aprobado; `h=0` es solo una referencia geométrica preliminar, no altura validada del terreno. La comparación de un segundo escenario es opcional. | Confirmación explícita del usuario en conversación. Ver `docs/GUIA_PRIMERA_DEMO.md`. La validación del método se hará si se integra Horizons durante la hackathon. |
| D-015 | 2026-11-10 | El panel de configuración tendrá un desplegable con Nobile Rim 1, Nobile Rim 2 y Shackleton Rim como puntos de referencia predefinidos. Mostrará las coordenadas del lugar seleccionado, permitirá elegir fecha y hora en UTC, iniciará en 2026-11-14 12:00 UTC y tendrá un botón para actualizar la vista. La entrada de coordenadas personalizadas queda fuera de la primera demo (restriction superseded by D-019). El panel de resultados mostrará azimut y elevación del Sol y la Tierra en grados, el lugar y hora, fuentes, estados explicados en lenguaje sencillo y la advertencia de que el relieve no está modelado. `delta` y `deldot` quedan fuera del resumen principal. | Aceptado explícitamente por el usuario. Coordenadas de la tabla A2.1-1 del Lunar Surface Data Book de NASA. Ver `docs/GUIA_PRIMERA_DEMO.md`. La consulta web directa a Horizons requiere una ruta de servidor por la política CORS de JPL; el mockup puede usar el caso guardado. |
| D-016 | 2026-11-11 | Stack previsto: TypeScript + React; español predeterminado con opción de inglés; el usuario será responsable del backend; Vercel es el alojamiento previsto. React Three Fiber sobre Three.js es la opción recomendada para 3D; es una decisión de implementación inicial, revisable si el stack presenta problemas. Tope de gasto de DeepSeek: 10 €. | Confirmado por el usuario en conversación. Vercel se probará primero y el equipo acepta cambiar de alojamiento durante la hackathon si no encaja. Revisar las condiciones del plan al desplegar. |
| D-017 | 2026-11-11 | Para la escena 3D se recomienda React Three Fiber sobre Three.js, ya que integra el render 3D con los componentes React. Andrés no tiene preferencia entre esta opción y Three.js directo; React Three Fiber queda como recomendación inicial y Vercel puede cambiarse durante la hackathon si no encaja. | Recomendación técnica tras consultar documentación oficial; el usuario deja la elección a criterio del asistente tras indicar la preferencia de Andrés. El stack base TypeScript/React y el alojamiento previsto Vercel están en D-016. |
| D-018 | 2026-11-11 | Compartir únicamente la skill `clps-hackathon-assistant` como skill de proyecto para Claude Code y Codex. Mantener fuera del repositorio todas las skills personales del usuario. | Confirmado por el usuario. Claude Code descubre `.claude/skills/`; Codex descubre `.agents/skills/`. |
| D-019 | 2026-11-14 | Extend the configuration scope to accept custom coordinates and browser-local date/time entry alongside the predefined sites and UTC. Supersedes the corresponding restrictions in D-015 and the original demo guide. With valid inputs and no request in progress, allow querying or retrying the same case, including the saved sample and partial results. | Explicitly confirmed by the integrator during the PR #8 review. Requests still use UTC; custom points have no published coordinate source. The geometric method and terrain limitations remain unchanged. |

## Pendientes
- [x] Inscripción y acceso de los tres integrantes al repositorio, confirmados por el usuario.
- [x] Stack base, responsable de backend, idioma predeterminado e inglés seleccionable, alojamiento previsto y tope de DeepSeek acordados.
- [x] Validación de acceso a modelos/herramientas, catálogo `/subagents-models` y endpoint IA probado, según confirmación del usuario el 2026-11-11.
- [x] Publicar el paquete reducido de preparación en `main` (commits `chore: add initial shared project docs` y `docs: add shared hackathon preparation`).
- [ ] Publicar la única skill compartida de Claude Code y Codex; comprobar que las skills personales siguen excluidas.
- [ ] Clonar el repositorio actualizado en la carpeta definitiva de trabajo.
- [ ] Preparar workflow de GitHub Actions cuando el esqueleto incluya `package.json` y scripts reales.
- [ ] Durante el hackathon, revisar reglas/entrega y actualizar el plan solo si la organización da requisitos distintos.
- [ ] Si se implementa la consulta Horizons, verificar parámetros/método con Diego y guardar un caso reproducible.
- [ ] Decidir al implementar si hace falta un fixture local para fallo de red; identificarlo siempre como muestra/simulación.
- [ ] Elegir licencia compatible antes de publicar o entregar el código.

## IA y seguridad
- [x] Configuración de subagentes y asignación de modelos/esfuerzo consultadas mediante `/subagents-models`; el usuario reporta que ya comprobó el mapa y las delegaciones.
- [x] Acceso efectivo a las herramientas/modelos y endpoint de IA probado, según confirmación del usuario.
- [x] Cada integrante utiliza sus propias credenciales; no incluir claves en prompts ni archivos compartidos.
- [x] Tope de gasto de DeepSeek: 10 €; el saldo actual informado es 5 €.
- [x] Revisados endpoint y acceso efectivo, según confirmación del usuario; no se registran modelos/precios concretos como acuerdos del producto.

## Propuestas de referencia
### P-001 — Experiencia principal con vista 3D y panel de datos
- **Fecha:** 2026-11-09
- **Estado:** adoptada como recorrido inicial mediante D-012, D-014 y D-015. El equipo puede ajustarla si las instrucciones del evento o la implementación lo requieren.
- **Propuesta:** pantalla principal tipo dashboard con controles de lugar y fecha, una visualización 3D sencilla del entorno lunar con Sol y Tierra relativos al horizonte, y un panel de datos/texto que explique resultados, fuentes y límites. Mantener la visualización contenida para priorizar datos y comparación. Enfocar la demo en el polo sur lunar sin afirmar que NASA exija limitar allí toda la herramienta.
- **Responsable(s):** según el reparto de D-007; la revisión de los parámetros de Horizons se hará con Diego si se implementa la conexión durante el evento.
- **Motivo y evidencia/enlaces:** interpretación del integrador a partir del enunciado oficial y conversación de diseño; ver [ENUNCIADO_RETO.md](ENUNCIADO_RETO.md) y [guía de demo](docs/GUIA_PRIMERA_DEMO.md).
- **Consecuencias o límites:** la demo inicial usa geometría sin topografía y no afirma que iluminación garantice energía ni que elevación geométrica garantice comunicaciones.
- **Revisar si:** el equipo no lo ve claro, los datos no sostienen la visualización o el tiempo de hackathon requiere reducir alcance.

## Plantilla de decisión
### D-XXX — <título>
- **Fecha:** AAAA-MM-DD
- **Estado:** propuesta / acordada / sustituida
- **Decisión:**
- **Responsable(s):**
- **Opciones consideradas:**
- **Motivo y evidencia/enlaces:**
- **Consecuencias o límites:**
- **Revisar si:**

