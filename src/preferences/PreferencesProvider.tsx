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

  // `data-fx` drives the CSS: `on` = full (animated) effects, `off` = low
  // performance (same look, static). Pause effects while the settings window is open.
  useEffect(() => {
    document.documentElement.dataset.fx = configured ? preferences.effects : 'off';
  }, [preferences.effects, configured]);

  // `data-font` drives the typeface: low performance uses the high-visibility
  // font. Unlike `data-fx` it ignores `configured`, so reopening the setup
  // screen does not flip the font of the (inert) interface behind it.
  useEffect(() => {
    document.documentElement.dataset.font = preferences.effects === 'off' ? 'legible' : 'retro';
  }, [preferences.effects]);

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
