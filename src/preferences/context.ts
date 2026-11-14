import { createContext, useContext } from 'react';
import { DEFAULT_PREFERENCES, type Preferences } from './preferences';

export interface PreferencesValue {
  readonly preferences: Preferences;
  /** False until the visitor confirms the first-visit setup screen (or a cookie exists). */
  readonly configured: boolean;
  /** Merges and persists the change. */
  readonly update: (change: Partial<Preferences>) => void;
  /** Saves the setup-screen choice and marks the app as configured. */
  readonly confirm: (preferences: Preferences) => void;
  /** Shows the setup screen again. */
  readonly reopenSetup: () => void;
}

export const PreferencesContext = createContext<PreferencesValue>({
  preferences: DEFAULT_PREFERENCES,
  configured: true,
  update: () => undefined,
  confirm: () => undefined,
  reopenSetup: () => undefined,
});

export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
