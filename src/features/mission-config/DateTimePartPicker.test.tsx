// @vitest-environment jsdom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../i18n/messages';
import { DateTimePartPicker } from './DateTimePartPicker';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

type PickerProps = ComponentProps<typeof DateTimePartPicker>;

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

function mountPicker(overrides: Partial<PickerProps> = {}) {
  const onSelect = vi.fn<PickerProps['onSelect']>();
  const onClose = vi.fn<PickerProps['onClose']>();
  act(() => root.render(
    <>
      <button type="button" aria-controls="picker">Day</button>
      <DateTimePartPicker
        id="picker"
        title="Pick the day"
        value={12}
        min={1}
        max={31}
        columns={7}
        onSelect={onSelect}
        onClose={onClose}
        {...overrides}
      />
    </>,
  ));
  const list = container.querySelector<HTMLElement>('[role="listbox"]')!;
  const options = () => [...container.querySelectorAll<HTMLElement>('[role="option"]')];
  const active = () => document.getElementById(list.getAttribute('aria-activedescendant')!)?.textContent;
  return { list, options, active, onSelect, onClose };
}

function key(target: Element, value: string) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value });
  act(() => { target.dispatchEvent(event); });
  return event;
}

describe('DateTimePartPicker', () => {
  it('lists every value of one part in a labeled listbox, with the current one selected and focused', () => {
    const { list, options, active } = mountPicker();
    expect(document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe('Pick the day');
    expect(options().map((option) => option.textContent)).toEqual(
      Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')),
    );
    expect(options().filter((option) => option.getAttribute('aria-selected') === 'true').map((option) => option.textContent)).toEqual(['12']);
    expect(document.activeElement).toBe(list);
    expect(active()).toBe('12');
    expect(list.style.gridTemplateColumns.startsWith('repeat(7,')).toBe(true);
  });

  it('moves the highlight across the grid with the keyboard and picks it with Enter without submitting a form', () => {
    const { list, active, onSelect } = mountPicker();
    key(list, 'ArrowRight');
    expect(active()).toBe('13');
    key(list, 'ArrowDown');
    expect(active()).toBe('20');
    key(list, 'ArrowUp');
    key(list, 'ArrowUp');
    key(list, 'ArrowLeft');
    expect(active()).toBe('05');
    key(list, 'End');
    key(list, 'ArrowDown'); // Stays on the last value.
    expect(active()).toBe('31');
    key(list, 'Home');
    expect(active()).toBe('01');
    for (const digit of '24') key(list, digit);
    expect(active()).toBe('24');
    expect(onSelect).not.toHaveBeenCalled();
    expect(key(list, 'Enter').defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(24);
  });

  it('picks a value with a click', () => {
    const { options, onSelect } = mountPicker();
    act(() => options()[2]!.click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('renders custom option content with an accessible name', () => {
    const { options } = mountPicker({
      title: 'Pick the month', value: 2, min: 1, max: 12, columns: 4,
      format: (month) => `M${month}`, describe: (month) => `Month ${month}`,
    });
    expect(options()).toHaveLength(12);
    expect(options()[1]!.textContent).toBe('M2');
    expect(options()[1]!.getAttribute('aria-label')).toBe('Month 2');
  });

  it('closes without picking on Escape, the close button or a press outside, but not on its own trigger', () => {
    const { list, onClose, onSelect } = mountPicker();
    key(list, 'Escape');
    expect(onClose).toHaveBeenLastCalledWith(true);
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click());
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => { list.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    act(() => { container.querySelector('[aria-controls="picker"]')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => { document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    expect(onClose).toHaveBeenLastCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes when the focus moves to another control, but not to its own trigger', () => {
    const { list, onClose } = mountPicker();
    act(() => container.querySelector<HTMLButtonElement>('[aria-controls="picker"]')!.focus());
    expect(document.activeElement).not.toBe(list);
    expect(onClose).not.toHaveBeenCalled();
    const other = document.createElement('button');
    container.append(other);
    act(() => list.focus());
    act(() => other.focus());
    expect(onClose).toHaveBeenCalledExactlyOnceWith(false);
  });
});
