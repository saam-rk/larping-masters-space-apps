/**
 * Single-screen dashboard (no page scroll): settings rail, control column
 * (site and time, then the inverse search), the view column (3D horizon above,
 * data below) and the update bar. The update button belongs to the site and
 * time form but is drawn in the bar (see `ConfigPanel`): above the view on wide
 * screens and between the view and the controls when they stack, so it stays
 * in sight next to what it refreshes. The scene and results both read the same
 * `useEphemeris` state.
 *
 * Decorative layers (stars, schematics, CRT overlay, screen curvature) live
 * in `Backdrop` and `CrtCurvature` and follow the effects switch: full
 * effects or low performance (the same look, static).
 */

import { lazy, Suspense, useRef, useState } from 'react';
import { APOLLO_11_SITE_ID } from '../shared/sites';
import { Backdrop } from './features/backdrop/Backdrop';
import { CrtCurvature } from './features/backdrop/CrtCurvature';
import { ConfigPanel } from './features/mission-config/ConfigPanel';
import { ResultsPanel } from './features/results/ResultsPanel';
import { CompassToggle } from './features/scene/CompassToggle';
import { FullscreenToggle } from './features/scene/FullscreenToggle';
import { useFullscreen } from './features/scene/useFullscreen';
import { useViewMode } from './features/scene/viewMode';
import { ViewToggle } from './features/scene/ViewToggle';
import { SetupScreen } from './features/shell/SetupScreen';
import { SkySearchPanel } from './features/sky-search/SkySearchPanel';
import { Sidebar } from './features/shell/Sidebar';
import { Hyperspace } from './features/transition/Hyperspace';
import { useUpdateTransition } from './features/transition/useUpdateTransition';
import { useViewTransition } from './features/transition/useViewTransition';
import { useEphemeris, type EphemerisState } from './hooks/useEphemeris';
import { useI18n } from './i18n/context';
import { prefersReducedMotion } from './preferences/preferences';
import { usePreferences } from './preferences/context';
import { Box } from './ui/Box';

// Three.js is large; load the scene separately from the rest of the app.
const SkyScene = lazy(() => import('./features/scene/SkyScene'));

function DataStatus({ ephemeris }: { ephemeris: EphemerisState }) {
  const { messages } = useI18n();
  const { status } = messages;
  if (ephemeris.loading) {
    return (
      <span className="status status--accent">
        [{status.loading}]<span className="blink">_</span>
      </span>
    );
  }
  if (ephemeris.error) return <span className="status status--error">[{status.error}]</span>;
  if (ephemeris.stale) {
    return (
      <span className="status status--warning" title={status.staleDetail}>
        [{status.stale}]
      </span>
    );
  }
  const sample = ephemeris.data.provenance === 'saved-sample';
  return (
    <span className={`status ${sample ? 'status--warning' : 'status--ok'}`} title={sample ? status.sampleDetail : status.liveDetail}>
      [{sample ? status.sample : status.live}]
    </span>
  );
}

export function App() {
  const { messages } = useI18n();
  const { preferences, configured } = usePreferences();
  const ephemeris = useEphemeris();
  const fullEffects = configured && preferences.effects === 'on';
  const streaks = fullEffects && !prefersReducedMotion();
  const transition = useUpdateTransition(ephemeris.loading, streaks);
  const busy = transition.active || ephemeris.loading;
  // A complete live result for the current selection is on screen (not the saved sample, not a partial result).
  const upToDate =
    !ephemeris.stale &&
    !ephemeris.error &&
    ephemeris.data.provenance === 'live' &&
    !ephemeris.data.warnings.includes('PARTIAL_RESULT');
  const view = useViewMode(ephemeris.data.site.id);
  const apollo = view.mode === 'first-person' && ephemeris.data.site.id === APOLLO_11_SITE_ID;
  const viewSwitch = useViewTransition({ mode: view.mode, setMode: view.setMode, streaks, busy });
  const warp = viewSwitch.warp;
  // "Compass" switch: horizon line (first person) and grid (third person), one for both views.
  const [showCompass, setShowCompass] = useState(false);
  // Full screen for the local horizon box, in both views.
  const sceneBoxRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(sceneBoxRef);
  // Where `ConfigPanel` renders its update button (see `.update-bar` in styles.css).
  const [updateSlot, setUpdateSlot] = useState<HTMLDivElement | null>(null);

  function handleUpdate() {
    viewSwitch.resetWarp();
    transition.start();
    ephemeris.update();
  }

  /** An inverse search match or an Apollo 11 moment: select its instant and show it on the horizon view. */
  function handleShowMatch(utc: string) {
    viewSwitch.resetWarp();
    transition.start();
    ephemeris.showUtc(utc);
  }

  return (
    <div className="app">
      <Backdrop mode={fullEffects ? 'full' : 'lite'} />
      <CrtCurvature enabled={fullEffects} />

      <div className="app__frame" inert={!configured}>
        <Sidebar />

        <main className="workspace">
          <h1 className="visually-hidden">{messages.app.title}</h1>

          <div className="column column--view">
            <Box
              title={messages.scene.heading}
              titleAs="h3"
              className={apollo ? 'scene-box scene-box--apollo' : 'scene-box'}
              ref={sceneBoxRef}
              help={messages.scene.info[view.mode]}
              actions={
                <>
                  <CompassToggle shown={showCompass} onChange={setShowCompass} />
                  <ViewToggle mode={viewSwitch.selected} firstPersonAvailable={view.firstPersonAvailable} onChange={viewSwitch.request} />
                  <FullscreenToggle active={fullscreen.active} onToggle={fullscreen.toggle} />
                </>
              }
            >
              <div className="scene-stage" data-jumping={busy || viewSwitch.active} data-warp={warp.kind}>
                <Suspense fallback={<p className="scene__note">{messages.scene.loading}</p>}>
                  <SkyScene data={ephemeris.data} mode={view.mode} showHorizon={showCompass} animateReenactment={streaks} />
                </Suspense>
                {streaks && <Hyperspace active={busy || viewSwitch.active} reverse={warp.reverse} tempo={warp.tempo} />}
              </div>
            </Box>
            <ResultsPanel
              data={ephemeris.data}
              error={ephemeris.error}
              busy={busy}
              status={<DataStatus ephemeris={ephemeris} />}
            />
          </div>
          <div className="update-bar" ref={setUpdateSlot} />
          <div className="column column--control">
            <ConfigPanel
              selection={ephemeris.selection}
              loading={busy}
              upToDate={upToDate}
              onSiteChange={ephemeris.setSiteId}
              onCoordinatesChange={ephemeris.setCoordinates}
              onUtcChange={ephemeris.setUtc}
              onUpdate={handleUpdate}
              onShowUtc={handleShowMatch}
              updateTarget={updateSlot}
            />
            <SkySearchPanel selection={ephemeris.selection} onShow={handleShowMatch} />
          </div>
        </main>
      </div>

      {!configured && <SetupScreen />}
    </div>
  );
}
