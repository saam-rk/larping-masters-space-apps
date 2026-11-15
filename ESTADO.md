# Estado del proyecto

## Implementation update — 2026-11-15 (branch `fix/model-loading-transition`)

- Model loading now holds the shared hyperspace transition until all suspended
  scene boundaries resolve, including the lazy scene module, first-person
  terrain/actors and third-person celestial models. Timed view switches no
  longer reveal an unfinished scene. Cancelled loads release the transition.
- Removed the relief and 3D-view loading labels in both languages. Scene notes,
  controls and playback overlays stay hidden while models load. Model loading
  uses the jump even with decorative effects off; reduced motion remains respected.
- Validation observed: `npm run check` (typecheck, lint, 706 tests / 67 files),
  `npm run build` (existing large-chunk warning), and `git diff --check` passed.
  Regression coverage includes delayed and concurrent loads, cancellation,
  cached models, Strict Mode, data jumps and reduced motion. Visual browser
  verification remains pending: the integrated browser timed out connecting
  to the local Vite server.
- No scientific methods, sources or assets changed. Pending: integrator diff
  review and visual verification. No commit, push or merge performed.

## Implementation update — 2026-11-15 (branch `fix/zoom-resize-performance`)

- PR #57 review: integrated `main` at `c855e67`, retaining the mobile wheel,
  scene HUD and camera framing fixes. Resolved the state-log and CSS conflicts.
- Fixed pointer remapping while resizing: coordinates, clicks and range presses
  stay native when the curvature filter is temporarily off; an existing slider
  drag follows the visible coordinates. Stale remapped hover/cursor is cleared
  on resize and native CSS hover is enabled during the pause.
- Review validation observed: `npm run check` (typecheck, lint, 696 tests /
  65 files) and `npm run build` passed (existing large-chunk warning).
  Three pointer regression tests were added; two reproduced failures before
  the fix. Real browser zoom and frame timings were not verified in this review.
  No scientific method, source or project decision changed.

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
- **Zoom-out legibility.** Zooming out widens the CSS viewport, so every
  `rem`-sized element shrank on screen. The root font size is now
  `max(100%, min(0.8333vw, 1.6vh))` (`src/styles.css`): unchanged up to a
  1920 × 1000 CSS px viewport and never below the user's font size, then it
  grows with the viewport so text, controls, dialogs and the 3D view keep about
  the size they have at 100 % zoom (50 % zoom ≈ 2× root). Side effect: very
  large monitors at 100 % zoom (e.g. 2560 × 1440) also get a ~1.3× interface.
  Checked in the browser pane with emulated viewports (2560 × 1300, 3840 × 2000,
  7680 × 4000, advanced mode open): no truncation, readings panel visible,
  control column scrolls. Real browser zoom was not tried; no automated test
  covers the CSS.
- **Zoom stutter.** Each zoom step re-lays out and repaints the whole page, and
  the full-frame curvature filter plus the animated CRT overlay made that
  expensive. `src/features/backdrop/resizeActivity.ts` sets
  `data-resizing="on"` on the root while `resize` events keep arriving (cleared
  220 ms after the last one); meanwhile the CSS drops the curvature filter and
  pauses the overlay animations. The curvature map and the star canvas are now
  rebuilt once the viewport has been still for 100 ms (before the flag clears),
  instead of on every step. Observed in the browser pane (full effects, manual
  `resize` events): flag on through a burst, filter off and animations paused,
  map and stars rebuilt, filter back. Unit tests added (688 total, `npm run
  check` passed). Frame timings and real browser zoom were not measured.
  Visible side effect: the curved-glass distortion is absent for ~0.3 s during
  and after a zoom change.

## Implementation update — 2026-11-15 (branch `fix/mobile-wheels-and-views`)

- Date and time wheels on touch screens: a drag no longer stops after the
  first move. A touch is implicitly captured by the row it lands on; when the
  reel took the capture over, that row's `lostpointercapture` bubbled to the
  reel and cancelled the gesture. The reel now only reacts to its own capture,
  and takes every touch gesture (`touch-action: none`). Regression test in
  `NumberWheel.test.tsx`.
- Local horizon box on stacked layouts (≤ 1040 px): every view and site keeps
  the height Apollo 11 first person already had (`clamp(19rem, 48svh, 32rem)`),
  instead of shrinking to 7–9 rem in third person and in first person at the
  other sites.
- Overlays over the view: the scale switch and the countdown share one top
  row and the countdown wraps below the switch when both do not fit; the 3D
  labels stay under the overlays. On views narrower than 1.4:1 the
  third-person cameras widen their vertical field of view (up to 70°) so the
  horizon ring and the bodies near it stay in frame (`fitFov.ts`). Framing
  only; directions, values and zoom distances are unchanged.
- Checks observed: `npm run check` (typecheck, lint, 680 tests / 63 files) and
  `npm run build` passed (existing large-chunk warning). Touch gestures and
  layouts checked in emulated Chromium (Pixel 7, Galaxy S8, landscape,
  1440×900); not tested on a physical phone. Pending: integrator review.

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

