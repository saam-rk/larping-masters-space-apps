// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from './PreferencesProvider';
import { PreferencesContext } from './context';
import { COOKIE_NAME, DEFAULT_PREFERENCES, serializePreferences } from './preferences';

let container: HTMLDivElement;
let root: Root;

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
}

function render() {
  act(() =>
    root.render(
      <PreferencesProvider>
        <PreferencesContext.Consumer>
          {({ configured, confirm, preferences }) => (
            <div>
              <span data-testid="configured">{String(configured)}</span>
              <button onClick={() => confirm(preferences)}>confirm</button>
            </div>
          )}
        </PreferencesContext.Consumer>
      </PreferencesProvider>,
    ),
  );
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  clearCookie();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  clearCookie();
  vi.unstubAllGlobals();
});

describe('PreferencesProvider first visit', () => {
  it('starts unconfigured when no preferences cookie exists, then confirms and persists the choice', () => {
    render();
    expect(container.querySelector('[data-testid="configured"]')?.textContent).toBe('false');

    act(() => container.querySelector('button')?.click());

    expect(container.querySelector('[data-testid="configured"]')?.textContent).toBe('true');
    expect(document.cookie).toContain(`${COOKIE_NAME}=`);
  });

  it('starts configured when a preferences cookie already exists', () => {
    document.cookie = `${COOKIE_NAME}=${serializePreferences(DEFAULT_PREFERENCES)}; Path=/; SameSite=Lax`;

    render();

    expect(container.querySelector('[data-testid="configured"]')?.textContent).toBe('true');
  });
});
