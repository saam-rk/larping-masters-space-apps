/**
 * Dashboard layout (terminal style): settings rail, control column (site and
 * time), and the view column (3D horizon above, text results below). The
 * scene and results both read the same `useEphemeris` state.
 *
 * Decorative layers (stars, schematics, CRT overlay) live in `Backdrop` and
 * follow the effects level from the display preferences.
 */

import { lazy, Suspense } from 'react';
import { Backdrop } from './features/backdrop/Backdrop';
import { useWarp } from './features/backdrop/useWarp';
import { ConfigPanel } from './features/mission-config/ConfigPanel';
import { ResultsPanel } from './features/results/ResultsPanel';
import { SetupScreen } from './features/shell/SetupScreen';
import { Sidebar } from './features/shell/Sidebar';
import { UtcClock } from './features/shell/UtcClock';
import { useEphemeris, type EphemerisState } from './hooks/useEphemeris';
import { useI18n } from './i18n/context';
import { usePreferences } from './preferences/context';
import { AsciiHeading } from './ui/AsciiHeading';
import { Box } from './ui/Box';

// Three.js is large; load the scene separately from the rest of the app.
const SkyScene = lazy(() => import('./features/scene/SkyScene'));

function DataStatus({ ephemeris }: { ephemeris: EphemerisState }) {
  const { messages } = useI18n();
  const { status } = messages;
  if (ephemeris.loading) {
    return <span className="status status--accent">[{status.loading}]<span className="blink">_</span></span>;
  }
  if (ephemeris.error) return <span className="status status--error">[{status.error}]</span>;
  if (ephemeris.stale) return <span className="status status--warning">[{status.stale}]</span>;
  const sample = ephemeris.data.provenance === 'saved-sample';
  return (
    <span className={`status ${sample ? 'status--warning' : 'status--ok'}`}>
      [{sample ? status.sample : status.live}] <span className="status__detail">{sample ? status.sampleDetail : status.liveDetail}</span>
    </span>
  );
}

export function App() {
  const { messages } = useI18n();
  const { preferences, configured } = usePreferences();
  const ephemeris = useEphemeris();
  const effects = configured ? preferences.effects : 'off';
  const warp = useWarp(ephemeris.loading, effects);

  function handleUpdate() {
    warp.start();
    ephemeris.update();
  }

  return (
    <div className="app" data-warping={warp.warping}>
      <Backdrop level={effects} warping={warp.warping} />

      <div className="app__frame" inert={!configured}>
        <Sidebar />

        <div className="shell">
          <header className="topbar">
            <div className="topbar__id">
              <h1 className="topbar__title">
                <span className="topbar__chip" aria-hidden="true">
                  ▇
                </span>
                {messages.app.title}
              </h1>
              <p className="topbar__line">
                <span className="topbar__chip topbar__chip--dim" aria-hidden="true">
                  ▒
                </span>
                {messages.app.system}
              </p>
            </div>
            <UtcClock />
          </header>

          <main className="workspace">
            <div className="column column--control">
              <AsciiHeading text={messages.banner.config} aside={<span className="status">{messages.banner.configAside}</span>} />
              <ConfigPanel
                selection={ephemeris.selection}
                loading={ephemeris.loading}
                onSiteChange={ephemeris.setSiteId}
                onUtcChange={ephemeris.setUtc}
                onUpdate={handleUpdate}
              />
            </div>

            <div className="column column--view">
              <AsciiHeading text={messages.banner.horizon} aside={<DataStatus ephemeris={ephemeris} />} />
              <Box title={messages.scene.heading} titleAs="h3" className="scene-box warp-fade">
                <Suspense fallback={<p className="scene__note">{messages.scene.loading}</p>}>
                  <SkyScene data={ephemeris.data} />
                </Suspense>
              </Box>
              <ResultsPanel data={ephemeris.data} error={ephemeris.error} stale={ephemeris.stale} />
            </div>
          </main>
        </div>
      </div>

      {!configured && <SetupScreen />}
    </div>
  );
}
