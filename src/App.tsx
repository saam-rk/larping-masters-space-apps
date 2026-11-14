/**
 * Dashboard layout: selection panel, 3D horizon view and text results.
 * All three read the same `useEphemeris` state.
 */

import { lazy, Suspense } from 'react';
import { ConfigPanel } from './features/mission-config/ConfigPanel';
import { ResultsPanel } from './features/results/ResultsPanel';
import { useEphemeris } from './hooks/useEphemeris';
import { useI18n } from './i18n/context';
import { LOCALES, type Locale } from './i18n/messages';

// Three.js is large; load the scene separately from the rest of the app.
const SkyScene = lazy(() => import('./features/scene/SkyScene'));

export function App() {
  const { locale, messages, setLocale } = useI18n();
  const ephemeris = useEphemeris();

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">{messages.app.title}</h1>
          <p className="app__tagline">{messages.app.tagline}</p>
        </div>
        <label className="language">
          <span>{messages.app.language}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            {LOCALES.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="app__main">
        <ConfigPanel
          selection={ephemeris.selection}
          loading={ephemeris.loading}
          onSiteChange={ephemeris.setSiteId}
          onUtcChange={ephemeris.setUtc}
          onUpdate={ephemeris.update}
        />

        <section className="panel scene-panel">
          <h2 className="panel__title">{messages.scene.heading}</h2>
          <Suspense fallback={<p className="scene__note">{messages.scene.loading}</p>}>
            <SkyScene data={ephemeris.data} />
          </Suspense>
        </section>

        <ResultsPanel data={ephemeris.data} error={ephemeris.error} stale={ephemeris.stale} />
      </main>
    </div>
  );
}
