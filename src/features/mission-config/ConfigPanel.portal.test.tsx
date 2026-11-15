// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { ConfigPanel } from './ConfigPanel';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

let container: HTMLDivElement;
let slot: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  slot = document.createElement('div');
  document.body.append(container, slot);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  slot.remove();
  vi.unstubAllGlobals();
});

function mount(onUpdate: () => void) {
  const selection = {
    siteId: SAVED_SAMPLE.site.id,
    latitudeDeg: SAVED_SAMPLE.site.latitudeDeg,
    longitudeEastDeg: SAVED_SAMPLE.site.longitudeEastDeg,
    utc: SAVED_SAMPLE.requestedUtc,
  };
  act(() =>
    root.render(
      <ConfigPanel
        selection={selection}
        loading={false}
        upToDate={false}
        onSiteChange={() => {}}
        onCoordinatesChange={() => {}}
        onUtcChange={() => {}}
        onUpdate={onUpdate}
        onShowUtc={vi.fn()}
        updateTarget={slot}
      />,
    ),
  );
}

describe('update button outside the form', () => {
  it('renders in the target element and still submits the site and time form', () => {
    const onUpdate = vi.fn();
    mount(onUpdate);

    const form = container.querySelector('form')!;
    expect(form.querySelector('button[type="submit"]')).toBeNull();
    const button = slot.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button).not.toBeNull();
    expect(button.form).toBe(form);

    act(() => button.click());
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('submits from the search box (Enter) through the associated button', () => {
    const onUpdate = vi.fn();
    mount(onUpdate);

    const form = container.querySelector('form')!;
    act(() => form.requestSubmit());
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
