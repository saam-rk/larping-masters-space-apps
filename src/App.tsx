/**
 * Single-screen dashboard (no page scroll): control column
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

import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import type { EphemerisResponse } from '../shared/ephemeris';
import { HorizonPlayback, type CameraFollow } from './features/scene/HorizonPlayback';
import { APOLLO_11_SITE_ID } from '../shared/sites';
import { Backdrop } from './features/backdrop/Backdrop';
import { CrtCurvature } from './features/backdrop/CrtCurvature';
import { ConfigPanel } from './features/mission-config/ConfigPanel';
import { ResultsPanel } from './features/results/ResultsPanel';
import { CompassToggle } from './features/scene/CompassToggle';
import { FullscreenToggle } from './features/scene/FullscreenToggle';
import { GuideToggle } from './features/scene/GuideToggle';
import { IntervalButton } from './features/scene/IntervalButton';
import { useFullscreen } from './features/scene/useFullscreen';
import { useViewMode } from './features/scene/viewMode';
import { ViewToggle } from './features/scene/ViewToggle';
import { SetupScreen } from './features/shell/SetupScreen';
import { SkySearchPanel } from './features/sky-search/SkySearchPanel';
import { HeaderLogo, OptionsButton } from './features/shell/HeaderControls';
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
  // Match the player's remount key: equivalent selections must retain the same session.
  const selectionKey = [ephemeris.selection.siteId, ephemeris.selection.latitudeDeg,
    ephemeris.selection.longitudeEastDeg, ephemeris.selection.utc].join('|');
  const [preview, setPreview] = useState<{ selection: string; frame: EphemerisResponse } | null>(null);
  const [playbackSession, setPlaybackSession] = useState<string | null>(null);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [follow, setFollow] = useState<CameraFollow>(null);
  // Every frame of the loaded playback sequence, for the course lines.
  const [sequence, setSequence] = useState<{ selection: string; frames: readonly EphemerisResponse[] } | null>(null);
  const [followedSelection, setFollowedSelection] = useState(selectionKey);
  if (followedSelection !== selectionKey) {
    setFollowedSelection(selectionKey);
    setPreview(null);
    setPlaybackSession(null);
    setFollow(null);
    setSequence(null);
  }
  const playbackActive = playbackSession === selectionKey;
  const previewFrame = preview?.selection === selectionKey ? preview.frame : null;
  const displayedData = previewFrame ?? ephemeris.data;
  const onPlaybackFrame = useCallback((frame: EphemerisResponse | null) => {
    setPreview(frame ? { selection: selectionKey, frame } : null);
  }, [selectionKey]);
  const onPlaybackSequence = useCallback((frames: readonly EphemerisResponse[] | null) => {
    setSequence(frames ? { selection: selectionKey, frames } : null);
  }, [selectionKey]);
  const onPlaybackActive = useCallback((active: boolean) => {
    setPlaybackSession(active ? selectionKey : null);
  }, [selectionKey]);
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
  const view = useViewMode(displayedData.site.id);
  const apollo = view.mode === 'first-person' && displayedData.site.id === APOLLO_11_SITE_ID;
  const viewSwitch = useViewTransition({ mode: view.mode, setMode: view.setMode, streaks, busy });
  const warp = viewSwitch.warp;
  // "Compass" switch: horizon line (first person) and grid (third person), one for both views. On by default.
  const [showCompass, setShowCompass] = useState(true);
  // "Guide" switch: straight paths toward the Sun and the Earth, in both views. On by default.
  const [showGuides, setShowGuides] = useState(true);
  // Full screen for the local horizon box, in both views.
  const sceneBoxRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(sceneBoxRef);
  // Where `ConfigPanel` renders its update button (see `.update-bar` in styles.css).
  const [updateSlot, setUpdateSlot] = useState<HTMLDivElement | null>(null);

  function resetPlayback() {
    setPreview(null);
    setPlaybackSession(null);
    setIntervalOpen(false);
    setFollow(null);
    setSequence(null);
  }

  function handleUpdate() {
    resetPlayback();
    viewSwitch.resetWarp();
    transition.start();
    ephemeris.update();
  }

  /** An inverse search match or an Apollo 11 moment: select its instant and show it on the horizon view. */
  function handleShowMatch(utc: string) {
    resetPlayback();
    viewSwitch.resetWarp();
    transition.start();
    ephemeris.showUtc(utc);
  }

  return (
    <div className="app">
      <Backdrop mode={fullEffects ? 'full' : 'lite'} />
      <CrtCurvature enabled={fullEffects} />

      <div className="app__frame" inert={!configured}>
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
                  <IntervalButton active={playbackActive} disabled={busy} onOpen={() => setIntervalOpen(true)} />
                  <GuideToggle shown={showGuides} onChange={setShowGuides} />
                  <CompassToggle shown={showCompass} onChange={setShowCompass} />
                  {/* Third-person-only points need no view switch. */}
                  {view.firstPersonAvailable && (
                    <ViewToggle mode={viewSwitch.selected} firstPersonAvailable onChange={viewSwitch.request} />
                  )}
                  <FullscreenToggle active={fullscreen.active} onToggle={fullscreen.toggle} />
                </>
              }
            >
              <div className="scene-stage" data-jumping={busy || viewSwitch.active} data-warp={warp.kind} data-player={previewFrame !== null}>
                <Suspense fallback={<p className="scene__note">{messages.scene.loading}</p>}>
                  <SkyScene
                    data={displayedData}
                    mode={view.mode}
                    showHorizon={showCompass}
                    showGuides={showGuides}
                    animateReenactment={streaks}
                    busy={busy}
                    playback={playbackActive}
                    follow={previewFrame ? follow : null}
                    course={previewFrame && sequence?.selection === selectionKey ? sequence.frames : null}
                  />
                </Suspense>
                {streaks && <Hyperspace active={busy || viewSwitch.active} reverse={warp.reverse} tempo={warp.tempo} />}
                {!busy && <HorizonPlayback
                  key={selectionKey}
                  selection={ephemeris.selection}
                  open={intervalOpen}
                  onClose={() => setIntervalOpen(false)}
                  onFrame={onPlaybackFrame}
                  onActive={onPlaybackActive}
                  onSequence={onPlaybackSequence}
                  follow={follow}
                  onFollowChange={setFollow}
                />}
              </div>
            </Box>
            <ResultsPanel
              data={displayedData}
              error={previewFrame ? null : ephemeris.error}
              busy={busy}
              status={previewFrame ? <span className="status status--accent">[{messages.playback.preview}]</span> : <DataStatus ephemeris={ephemeris} />}
            />
          </div>
          <div className="update-bar" ref={setUpdateSlot}>
            <HeaderLogo />
            <OptionsButton />
          </div>
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
