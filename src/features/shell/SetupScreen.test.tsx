// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { MESSAGES } from '../../i18n/messages';
import { PreferencesProvider } from '../../preferences/PreferencesProvider';
import { usePreferences } from '../../preferences/context';
import { COOKIE_NAME } from '../../preferences/preferences';
import { OptionsButton } from './HeaderControls';
import { SetupScreen } from './SetupScreen';

let container: HTMLDivElement;
let root: Root;

function SetupHarness() {
  const { configured } = usePreferences();
  return configured ? <OptionsButton /> : <SetupScreen />;
}

function render() {
  act(() => root.render(
    <PreferencesProvider>
      <I18nProvider>
        <SetupHarness />
      </I18nProvider>
    </PreferencesProvider>,
  ));
}

function repositoryLink() {
  const link = container.querySelector<HTMLAnchorElement>('a.setup__repository');
  expect(link).not.toBeNull();
  return link!;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  document.documentElement.removeAttribute('lang');
  delete document.documentElement.dataset.fx;
  delete document.documentElement.dataset.font;
  vi.unstubAllGlobals();
});

describe('SetupScreen repository link', () => {
  it('shows the project repository on first visit with safe new-tab attributes and a decorative mark', () => {
    render();

    const link = repositoryLink();
    expect(link.getAttribute('href')).toBe('https://github.com/saam-rk/larping-masters-space-apps');
    expect(link.target).toBe('_blank');
    expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(link.textContent).toBe(`${MESSAGES.es.setup.repository} (${MESSAGES.es.setup.repositoryNewTab})`);
    expect(link.querySelector('.setup__github-mark')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('translates the link and the new-tab notice when the language changes', () => {
    render();
    act(() => container.querySelector<HTMLButtonElement>('button[lang="en"]')!.click());

    expect(repositoryLink().textContent).toBe(`${MESSAGES.en.setup.repository} (${MESSAGES.en.setup.repositoryNewTab})`);
  });

  it('keeps the repository link available when preferences are reopened', () => {
    render();
    act(() => container.querySelector<HTMLButtonElement>('.setup__save')!.click());
    expect(container.querySelector('.setup__repository')).toBeNull();

    act(() => container.querySelector<HTMLButtonElement>('.header-options')!.click());
    expect(repositoryLink().textContent).toContain(MESSAGES.es.setup.repository);
  });
});
