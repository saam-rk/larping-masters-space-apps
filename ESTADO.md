# Estado del proyecto

## Implementation update — 2026-11-15 (branch `fix/zoom-resize-performance`)

- **Browser zoom and resizing.** The 3D drawing buffer now follows the device
  pixel ratio below 1 (zooming out no longer draws 4× the screen pixels at
  50 %, 9× at 33 %), keeps the 1.5 cap, and stays under a ~2560 × 1440 device
  pixel budget (large full-screen canvases). See `src/features/scene/renderDpr.ts`.
- Canvas resizes are coalesced (100 ms) and no longer tracked on scroll; the
  last frame is stretched to its box meanwhile, so no gap or crop shows.
- Star backdrop keeps the same stars across resizes and resizes once per
  frame; CRT curvature map capped at 256 px and rebuilt on the next frame (no
  clipped frame after zooming out); hyperspace canvas resizes only while it animates.
- Layout: short viewports (≤ 600 px high, e.g. zooming in on a wide screen)
  stack the columns instead of squeezing the 3D view to a strip; in stacked
  layouts every scene (not only Apollo 11) keeps `clamp(19rem, 48svh, 32rem)`.
- Validation observed locally: `npm run check` (682 tests / 63 files) and
  `npm run build` passed (existing large-chunk warning). Browser checks with
  emulated viewports (640×360 to 3840×2160): layout, buffer sizes, curvature
  and star resizes. Frame timings were not measured (preview pane hidden), and
  real browser zoom (device pixel ratio change) was only covered by unit tests.
- No scientific method or source changes. Pending: integrator review.

## Implementation update — 2026-11-15 (branch `feat/advanced-mode`)

- **Advanced mode** section in the control column, where the inverse search,
  feasibility and scenario comparison boxes were: one box that groups them
  below the site and time controls. Closed by default (lists the three tools);
  a Show/Hide switch in its title rule opens it, and an "i" explains what it
  holds. The choice is stored in the preferences cookie (`adv=1`; older
  version 2 cookies read as closed).
- The tools stay mounted while closed, so their fields, results, compared
  scenarios and a running search survive closing and reopening.
- On narrow screens (≤ 560 px) the outer frame keeps only its title rule, so
  the inner boxes keep the full column width.
- Built on `feat/scenario-comparison-assessment` (not yet in `main`). No
  scientific method or source changes. Pending: integrator review.

## Implementation update — 2026-11-15 (branch `feat/scenario-comparison-assessment`)

- **Compare scenarios** box: up to four scenarios (point + UTC) side by side,
  added from the current selection as is or shifted by +1 d, +7 d or +½ mean
  synodic month. Rows: Sun/Earth azimuth, elevation and state; mission
  screening; optional one-synodic-month window. Best value marked (▲) in
  comparable rows; "Show" puts a scenario on the main view.
- **Feasibility** box: screening of the instant on screen against editable
  mission assumptions — solar power (IAU 2015 B3 irradiance, visible disk
  fraction, panel orientation, area, efficiency) vs. demand, and a
  direct-to-Earth link budget (ITU-R P.525 free-space loss, C/N0, Eb/N0,
  margin, Earth elevation mask). Window over ~29.5 d (100 samples): share of
  time with power/link/both, longest gaps, mean power.
- Model: `shared/missionAssessment.ts` (tests in `missionAssessment.test.ts`);
  method and limits in `docs/ARCHITECTURE.md`. Starting assumptions are
  illustrative, not mission data. Terrain is still not modeled; results are
  a geometric screening, not a feasibility guarantee.
- PR #52 review corrections: subtract Earth occultation from the solar disk
  with joint horizon clipping; keep missing geometry unknown; reject negative
  link masks and guard the model against old negative-mask callers; deduplicate
  active and queued window requests across both panels and abort on unmount.
  Longest gaps remain unknown when missing samples prevent establishing
  continuity; unknown time is not compressed into an outage.
  The occultation behavior and correction publication were explicitly approved
  by the integrator in the review questionnaire.
- Review validation observed locally: `npm run check` (typecheck, lint,
  672 tests / 61 files) and `npm run build` passed. The build retains the
  existing large-chunk warning. Browser behavior was not manually verified.
- Pending: human diff review; science review of the power and link model by
  Diego. No physical accuracy certification is claimed.

## Implementation update — 2026-11-15 (branch `feat/interval-toolbar-guides`)

- Interval button in the horizon toolbar; player laid over the view; interval
  dialog with the shared date/time wheels, 16 samples by default (typed), and
  time per sample (Sun = synodic month, Earth = draconic month, or custom
  hours/minutes); camera centered on the Sun or Earth during playback.
- Playback samples now come from `/api/ephemeris-series`: one Horizons range
  request per body for up to 100 samples (same quantities and method).
- "Guide" switch for the straight paths to the Sun and Earth in both views;
  set/rise countdown with ↑/↓ arrows, also during playback.
- Point list in two groups (with first person / third person only), "First
  landing" badge on Apollo 11, no view switch for third-person-only points;
  the "Geometric positions" line under the data table removed.
- Follow-up: 24 samples by default; Sun/Earth presets cover half a mean
  synodic/draconic month (half a body's course); "start at the rise of" the
  Sun or Earth (inverse search); dotted course per body during playback
  (Guide switch); two-column interval dialog with the Horizons details in an
  "i"; custom step wheels centered.
- Details and evidence: `docs/HORIZON_PLAYBACK.md`. Pending: integrator review.

## Implementation update — 2026-11-15

- Branch `feat/horizon-playback`: local horizon player with a user-defined UTC
  interval, cached sample playback, seeking, speed, loading progress and cancellation.
  Sun and Earth from the Moon were explicitly confirmed by the user.
- Implementation and review steps: `docs/HORIZON_PLAYBACK.md`.
- PR #47 review: playback now keeps its frame and countdown suppression when
  the same coordinates are selected again; a real selection change still
  discards the sequence. Regression coverage is in `src/App.playback.test.tsx`.
- Pending: integrator review and merge. The historical preparation snapshot
  below predates the implemented application.

**Actualizado:** 2026-11-11 · **Reto oficial:** Lunar Landing Site Navigator · **Producto:** CLPS Lunar Mission Browser · **Implementación:** aún no iniciada.

## Acordado

- Equipo de tres: usuario coordina e integra, lleva backend y prevé presentar; Diego lleva ciencia/datos; Andrés interfaz.
- Demo inicial definida en `docs/GUIA_PRIMERA_DEMO.md`: tres lugares predefinidos, fecha/hora UTC, posición geométrica del Sol y la Tierra en una visualización 3D sencilla y un panel textual con unidades, fuente y límites. Nobile Rim 1 es el caso de muestra; el relieve no está modelado. Segundo escenario opcional.
- Stack base TypeScript + React. React Three Fiber sobre Three.js recomendado para la escena. Vite y Vercel son elecciones previstas; el alojamiento se puede cambiar durante el evento.
- Aplicación en español por defecto y también disponible en inglés. Código y artefactos técnicos del proyecto en inglés.
- Tope de DeepSeek: 10 €; saldo informado: 5 €.
- Todos están inscritos y tienen acceso al repositorio, según confirmación del usuario.
- El usuario informa que revisó `/subagents-models`, acceso a herramientas/modelos y el endpoint IA; esos preparativos se dan por completados.

## Decisiones aplazadas al hackathon

- Revisar con la organización los requisitos locales, agenda y entrega.
- Verificar con Diego los parámetros/método de Horizons cuando se implemente la conexión.
- Decidir entonces si se necesita un fixture local ante fallo de red, rotulado como simulación.
- No se harán prácticas previas de Git ni ensayo de presentación; el equipo preparará la demo conjuntamente.

## Repositorio y CI

- GitHub: `saam-rk/larping-masters-space-apps`, rama `main`; los documentos base se publicaron el 2026-11-11. El usuario confirma que Andrés y Diego tienen acceso.
- Aún no hay `package.json` ni aplicación. La skill compartida del hackathon se prepara en las rutas de proyecto de Claude Code y Codex.
- GitHub Actions se configurará cuando exista un proyecto con scripts reales para instalar, revisar tipos, lint, probar y compilar.

## Siguiente paso

Clonar el repositorio actualizado en la carpeta de trabajo definitiva y comprobar que la skill de proyecto está disponible en Claude Code y Codex. Después, al iniciar la app, añadir un workflow de CI que ejecute sus comprobaciones reales.

