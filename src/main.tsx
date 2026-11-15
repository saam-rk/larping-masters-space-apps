import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
// Self-hosted fonts (SIL Open Font License), Latin subset only.
import '@fontsource/vt323/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/caveat/latin-400.css';
import { App } from './App';
import { I18nProvider } from './i18n/I18nProvider';
import { PreferencesProvider } from './preferences/PreferencesProvider';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <PreferencesProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </PreferencesProvider>
    <Analytics />
  </StrictMode>,
);
