// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../i18n/messages';
import { PreferencesProvider } from '../../preferences/PreferencesProvider';
import { COOKIE_NAME, parsePreferencesCookie } from '../../preferences/preferences';
import { AdvancedSection } from './AdvancedSection';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

const text = MESSAGES.en.advanced;
let container: HTMLDivElement;
let root: Root;

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
}

function render() {
  act(() =>
    root.render(
      <PreferencesProvider>
        <AdvancedSection>
          <input aria-label="tool field" defaultValue="" />
        </AdvancedSection>
      </PreferencesProvider>,
    ),
  );
}

function toggle(): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('.advanced__toggle');
  if (!button) throw new Error('toggle not found');
  return button;
}

function tools(): HTMLElement {
  const group = container.querySelector<HTMLElement>('.advanced__tools');
  if (!group) throw new Error('tools not found');
  return group;
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

describe('AdvancedSection', () => {
  it('starts closed, naming the tools inside, with the tools mounted but hidden', () => {
    render();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toContain(text.show);
    expect(toggle().getAttribute('aria-controls')).toBe(tools().id);
    expect(tools().hidden).toBe(true);
    expect(container.querySelector('input')).not.toBeNull();
    const names = [...container.querySelectorAll('.advanced__names li')].map((item) => item.textContent);
    expect(names).toEqual([MESSAGES.en.skySearch.heading, MESSAGES.en.mission.heading, MESSAGES.en.compare.heading]);
  });

  it('opens and closes, keeping what was entered in the tools, and remembers the choice', () => {
    render();
    act(() => toggle().click());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().textContent).toContain(text.hide);
    expect(tools().hidden).toBe(false);
    expect(container.querySelector('.advanced__summary')).toBeNull();
    expect(parsePreferencesCookie(document.cookie)?.advanced).toBe(true);

    const field = container.querySelector('input')!;
    field.value = 'kept';
    act(() => toggle().click());
    expect(tools().hidden).toBe(true);
    expect(container.querySelector('input')).toBe(field);
    expect(field.value).toBe('kept');
    expect(parsePreferencesCookie(document.cookie)?.advanced).toBe(false);
  });

  it('opens from a saved preference', () => {
    act(() => root.render(<PreferencesProvider><AdvancedSection><span /></AdvancedSection></PreferencesProvider>));
    act(() => toggle().click());
    act(() => root.unmount());
    root = createRoot(container);
    render();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(tools().hidden).toBe(false);
  });
});
