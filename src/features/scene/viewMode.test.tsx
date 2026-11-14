// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObserverSiteId } from '../../../shared/sites';
import { MESSAGES } from '../../i18n/messages';
import { ViewToggle } from './ViewToggle';
import { useViewMode } from './viewMode';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function Harness({ siteId }: { siteId: ObserverSiteId }) {
  const view = useViewMode(siteId);
  return <ViewToggle mode={view.mode} firstPersonAvailable={view.firstPersonAvailable} onChange={view.setMode} />;
}

function render(siteId: ObserverSiteId) {
  act(() => root.render(<Harness siteId={siteId} />));
}

function option(index: number): HTMLButtonElement {
  return container.querySelectorAll<HTMLButtonElement>('button')[index]!;
}

function expectMode(firstPerson: boolean) {
  expect(option(0).getAttribute('aria-pressed')).toBe(String(firstPerson));
  expect(option(1).getAttribute('aria-pressed')).toBe(String(!firstPerson));
}

describe('view selection and terrain availability', () => {
  it.each<ObserverSiteId>(['nobile-rim-1', 'nobile-rim-2'])('starts in first person at %s', (siteId) => {
    render(siteId);
    expectMode(true);
    expect(option(0).getAttribute('aria-disabled')).toBe('false');
  });

  it('preserves a manual choice for the same site', () => {
    render('nobile-rim-2');
    expectMode(true);
    expect(option(0).getAttribute('aria-disabled')).toBe('false');
    act(() => option(1).click());
    expectMode(false);
    render('nobile-rim-2'); // A new result for the same site must not reset the choice.
    expectMode(false);
    act(() => option(0).click());
    expectMode(true);
  });

  it.each<ObserverSiteId>(['shackleton-rim', 'custom'])(
    'keeps first person unavailable at %s and explains why',
    (siteId) => {
      render(siteId);
      expectMode(false);
      const firstPerson = option(0);
      expect(firstPerson.getAttribute('aria-disabled')).toBe('true');
      const explanation = document.getElementById(firstPerson.getAttribute('aria-describedby')!);
      expect(explanation?.textContent).toBe(MESSAGES.en.scene.views.firstPersonUnavailable);
      act(() => firstPerson.click());
      expectMode(false);
    },
  );

  it('falls back for sites without terrain and resets to first person when returning to Nobile Rim 2', () => {
    render('nobile-rim-2');
    act(() => option(1).click());
    render('shackleton-rim');
    expectMode(false);
    render('custom');
    expectMode(false);
    render('nobile-rim-2');
    expectMode(true);
    act(() => option(1).click());
    render('nobile-rim-1'); // Another site with terrain also starts in first person.
    expectMode(true);
  });
});
