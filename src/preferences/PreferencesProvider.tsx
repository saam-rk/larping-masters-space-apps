import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PreferencesContext } from './context';
import {
  readDeviceHints,
  readPreferencesCookie,
  recommendPreferences,
  writePreferencesCookie,
  type Preferences,
} from './preferences';

interface InitialState {
  readonly preferences: Preferences;
  readonly configured: boolean;
}

function readInitialState(): InitialState {
  const stored = readPreferencesCookie();
  if (stored) return { preferences: stored, configured: true };
  return { preferences: recommendPreferences(readDeviceHints()), configured: false };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InitialState>(readInitialState);
  const { preferences, configured } = state;

  // Root attributes drive the CSS:
  // - data-look: `retro` (terminal font, block headings) or `clear` (high visibility).
  // - data-fx: decorative layers; kept `off` until the setup screen is confirmed.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.look = preferences.effects === 'on' ? 'retro' : 'clear';
    root.dataset.fx = configured ? preferences.effects : 'off';
  }, [preferences.effects, configured]);

  const update = useCallback((change: Partial<Preferences>) => {
    setState((current) => {
      const next = { ...current.preferences, ...change };
      if (current.configured) writePreferencesCookie(next);
      return { ...current, preferences: next };
    });
  }, []);

  const confirm = useCallback((chosen: Preferences) => {
    writePreferencesCookie(chosen);
    setState({ preferences: chosen, configured: true });
  }, []);

  const reopenSetup = useCallback(() => setState((current) => ({ ...current, configured: false })), []);

  const value = useMemo(
    () => ({ preferences, configured, update, confirm, reopenSetup }),
    [preferences, configured, update, confirm, reopenSetup],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
