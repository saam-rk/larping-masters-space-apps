/**
 * Single-screen dashboard (no page scroll): settings rail, control column
 * (site and time), and the view column (3D horizon above, data below). The
 * scene and results both read the same `useEphemeris` state.
 *
 * Decorative layers (stars, schematics, CRT overlay) live in `Backdrop` and
 * follow the effects switch from the display preferences.
 */

import { lazy, Suspense } from 'react';
import { Backdrop } from './features/backdrop/Backdrop';
import { useWarp } from './features/backdrop/useWarp';
import { ConfigPanel } from './features/mission-config/ConfigPanel';
import { ResultsPanel } from './features/results/ResultsPanel';
import { SetupScreen } from './features/shell/SetupScreen';
import { Sidebar } from './features/shell/Sidebar';
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
  const effectsOn = configured && preferences.effects === 'on';
  const warp = useWarp(ephemeris.loading, effectsOn);

  function handleUpdate() {
    warp.start();
    ephemeris.update();
  }

  return (
    <div className="app" data-warping={warp.warping}>
      <Backdrop enabled={effectsOn} warping={warp.warping} />

      <div className="app__frame" inert={!configured}>
        <Sidebar />

        <main className="workspace">
          <h1 className="visually-hidden">{messages.app.title}</h1>

          <div className="column column--control">
            <AsciiHeading text={messages.banner.config} />
            <ConfigPanel
              selection={ephemeris.selection}
              loading={ephemeris.loading}
              stale={ephemeris.stale}
              onSiteChange={ephemeris.setSiteId}
              onUtcChange={ephemeris.setUtc}
              onUpdate={handleUpdate}
            />
          </div>

          <div className="column column--view">
            <AsciiHeading text={messages.banner.horizon} />
            <Box title={messages.scene.heading} titleAs="h3" className="scene-box warp-fade" help={messages.scene.info}>
              <Suspense fallback={<p className="scene__note">{messages.scene.loading}</p>}>
                <SkyScene data={ephemeris.data} />
              </Suspense>
            </Box>
            <ResultsPanel data={ephemeris.data} error={ephemeris.error} status={<DataStatus ephemeris={ephemeris} />} />
          </div>
        </main>
      </div>

      {!configured && <SetupScreen />}
    </div>
  );
}
