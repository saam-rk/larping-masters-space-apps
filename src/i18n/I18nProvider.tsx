import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext } from './context';
import { DEFAULT_LOCALE, isLocale, MESSAGES, type Locale } from './messages';

const STORAGE_KEY = 'clps.locale';

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    // Storage can be unavailable (privacy mode); fall back to the default.
    return DEFAULT_LOCALE;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Not persisting the choice is acceptable.
    }
  }, [locale]);

  const value = useMemo(() => ({ locale, messages: MESSAGES[locale], setLocale }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
