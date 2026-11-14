import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePreferences } from '../preferences/context';
import { I18nContext } from './context';
import { MESSAGES, type Locale } from './messages';

/** Locale lives in the display preferences (cookie), alongside effects and font. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { preferences, update } = usePreferences();
  const { locale } = preferences;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => update({ locale: next }), [update]);
  const value = useMemo(() => ({ locale, messages: MESSAGES[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
