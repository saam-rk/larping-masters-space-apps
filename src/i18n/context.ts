import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, MESSAGES, type Locale, type Messages } from './messages';

export interface I18nValue {
  readonly locale: Locale;
  readonly messages: Messages;
  readonly setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  messages: MESSAGES[DEFAULT_LOCALE],
  setLocale: () => undefined,
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
