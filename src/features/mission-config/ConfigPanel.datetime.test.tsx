// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_ID, findSite } from '../../../shared/sites';
import { MESSAGES } from '../../i18n/messages';
import { ConfigPanel } from './ConfigPanel';
import { utcToFields } from './timeZone';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

const site = findSite(DEFAULT_SITE_ID);

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

function mountPanel() {
  const onUtcChange = vi.fn();
  act(() => root.render(
    <ConfigPanel
      selection={{ siteId: site.id, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, utc: '2026-01-12T14:30:00Z' }}
      loading={false}
      upToDate={false}
      onSiteChange={vi.fn()}
      onCoordinatesChange={vi.fn()}
      onUtcChange={onUtcChange}
      onUpdate={vi.fn()}
    />,
  ));
  const labelButton = (name: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button.number-wheel__label')].find((button) => button.textContent?.startsWith(name))!;
  const wheel = (name: string) =>
    document.querySelector<HTMLElement>(`[role="spinbutton"][aria-labelledby="${labelButton(name).id}"]`)!;
  const picker = () => container.querySelector<HTMLElement>('.datetime-picker');
  const pickerTitle = () => picker()?.querySelector('.box__title')?.textContent;
  const options = () => [...container.querySelectorAll<HTMLElement>('.datetime-picker [role="option"]')];
  return { onUtcChange, labelButton, wheel, picker, pickerTitle, options };
}

describe('ConfigPanel exact date and time pickers', () => {
  it('opens one picker per part from the label above its wheel, and toggles it from there', () => {
    const { labelButton, picker, pickerTitle, options } = mountPanel();
    expect(picker()).toBeNull();
    act(() => labelButton('Day').click());
    expect(pickerTitle()).toBe('Pick the day');
    expect(options()).toHaveLength(31);
    expect(labelButton('Day').getAttribute('aria-expanded')).toBe('true');
    expect(labelButton('Day').getAttribute('aria-controls')).toBe(picker()!.id);
    act(() => labelButton('Month').click());
    expect(container.querySelectorAll('.datetime-picker')).toHaveLength(1);
    expect(pickerTitle()).toBe('Pick the month');
    expect(options().map((option) => option.getAttribute('aria-label')).slice(0, 2)).toEqual(['January', 'February']);
    act(() => labelButton('Month').click());
    expect(picker()).toBeNull();
  });

  it('applies the picked value to that part only, closes and returns focus to the wheel', () => {
    const { labelButton, wheel, picker, options, onUtcChange } = mountPanel();
    act(() => labelButton('Year').click());
    expect(options()).toHaveLength(131);
    act(() => options().find((option) => option.textContent === '2034')!.click());
    expect(picker()).toBeNull();
    expect(wheel('Year').getAttribute('aria-valuenow')).toBe('2034');
    expect(wheel('Month').getAttribute('aria-valuenow')).toBe('1');
    expect(document.activeElement).toBe(wheel('Year'));
    expect(onUtcChange).toHaveBeenLastCalledWith('2034-01-12T14:30:00Z');
  });

  it('sets the hour and minute with their wheels only, without a picker', () => {
    const { labelButton, picker } = mountPanel();
    const labels = [...container.querySelectorAll('.datetime__wheels--time .number-wheel__label')];
    expect(labels.map((label) => label.textContent)).toEqual(['Hour', 'Min']);
    expect(labels.every((label) => label.tagName === 'SPAN')).toBe(true);
    expect(labelButton('Hour')).toBeUndefined();
    const hour = container.querySelector<HTMLElement>('.datetime__wheels--time [role="spinbutton"]')!;
    act(() => { hour.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })); });
    act(() => { hour.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', altKey: true })); });
    expect(picker()).toBeNull();
    expect(hour.getAttribute('aria-describedby')!.split(' ')).toHaveLength(1);
  });

  it('limits the day picker to the days of the selected month', () => {
    const { labelButton, options } = mountPanel();
    act(() => labelButton('Month').click());
    act(() => options()[1]!.click());
    act(() => labelButton('Day').click());
    expect(options()).toHaveLength(28);
  });

  it('keeps exact date pickers compatible with named time zone wheels', () => {
    const { labelButton, wheel, picker, onUtcChange } = mountPanel();
    const zone = container.querySelector<HTMLElement>('.datetime__wheels--zone [role="spinbutton"]')!;
    expect(zone.getAttribute('aria-valuetext')).toBe(MESSAGES.en.config.zoneUtc);
    act(() => labelButton('Day').click());
    expect(picker()).not.toBeNull();
    act(() => { zone.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' })); });
    expect(picker()).toBeNull();
    expect(zone.getAttribute('aria-valuenow')).toBe('1');
    expect(zone.getAttribute('aria-valuetext')).toContain('Local');
    const expected = utcToFields('2026-01-12T14:30:00Z', 'local');
    expect(wheel('Day').getAttribute('aria-valuenow')).toBe(String(Number(expected.date.slice(-2))));
    expect(container.querySelector('.datetime__wheels--time [role="spinbutton"]')?.getAttribute('aria-valuenow'))
      .toBe(String(Number(expected.time.slice(0, 2))));
    expect(onUtcChange).not.toHaveBeenCalled();
    act(() => { zone.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })); });
    expect(zone.getAttribute('aria-valuetext')).toBe(MESSAGES.en.config.zoneUtc);
    expect(wheel('Day').getAttribute('aria-valuenow')).toBe('12');
    expect(onUtcChange).not.toHaveBeenCalled();
  });

  it('does not open a picker when the wheel itself is pressed', () => {
    const { wheel, picker } = mountPanel();
    act(() => wheel('Day').click());
    expect(picker()).toBeNull();
  });
});

describe('ConfigPanel and instants chosen elsewhere', () => {
  it('rolls the wheels to an instant selected outside the panel (inverse search match)', () => {
    const render = (utc: string) =>
      act(() => root.render(
        <ConfigPanel
          selection={{ siteId: site.id, latitudeDeg: site.latitudeDeg, longitudeEastDeg: site.longitudeEastDeg, utc }}
          loading={false}
          upToDate={false}
          onSiteChange={vi.fn()}
          onCoordinatesChange={vi.fn()}
          onUtcChange={vi.fn()}
          onUpdate={vi.fn()}
        />,
      ));
    const values = () => [...container.querySelectorAll('[role="spinbutton"]')].map((wheel) => wheel.getAttribute('aria-valuenow'));
    render('2026-01-12T14:30:00Z');
    expect(values()).toEqual(['12', '1', '2026', '14', '30', '0']);
    render('2026-11-16T02:19:35Z');
    expect(values()).toEqual(['16', '11', '2026', '2', '19', '0']);
  });
});
