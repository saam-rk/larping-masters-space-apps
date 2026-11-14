// @vitest-environment jsdom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../i18n/messages';
import { DateTimeEntry } from './DateTimeEntry';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

type EntryProps = ComponentProps<typeof DateTimeEntry>;

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

function mountEntry(overrides: Partial<EntryProps> = {}) {
  const onApply = vi.fn<EntryProps['onApply']>(() => null);
  const onClose = vi.fn<EntryProps['onClose']>();
  act(() => root.render(
    <DateTimeEntry
      id="entry"
      fields={{ date: '2026-01-12', time: '14:30' }}
      focusPart="day"
      zoneName="UTC"
      onApply={onApply}
      onClose={onClose}
      {...overrides}
    />,
  ));
  const input = (label: string) => container.querySelector<HTMLInputElement>(`input[id="${
    [...container.querySelectorAll('label')].find((element) => element.textContent === label)!.htmlFor
  }"]`)!;
  return { onApply, onClose, input };
}

/** Types into a controlled input the way the browser does, so React sees the change. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function key(target: HTMLElement, value: string) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value });
  act(() => { target.dispatchEvent(event); });
  return event;
}

describe('DateTimeEntry', () => {
  it('shows the current fields in a labeled dialog and selects the requested part', () => {
    const { input } = mountEntry({ focusPart: 'year' });
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Exact date and time');
    expect(['Day', 'Month', 'Year', 'Hour', 'Min'].map((label) => input(label).value)).toEqual(['12', '01', '2026', '14', '30']);
    expect(document.activeElement).toBe(input('Year'));
    expect(container.textContent).toContain('Time zone: UTC.');
  });

  it('keeps digits only, moves on when a part is full and applies with Enter without submitting a form', () => {
    const { input, onApply } = mountEntry();
    type(input('Day'), '4');
    expect(document.activeElement).toBe(input('Day'));
    type(input('Day'), '04');
    expect(document.activeElement).toBe(input('Month'));
    type(input('Month'), '5x');
    expect(input('Month').value).toBe('5');
    type(input('Year'), '20345');
    expect(input('Year').value).toBe('2034');
    expect(key(input('Year'), 'Enter').defaultPrevented).toBe(true);
    expect(onApply).toHaveBeenCalledExactlyOnceWith({ date: '2034-05-04', time: '14:30' });
  });

  it.each(['Cancel', 'Close', 'Apply'])('preserves native Enter activation on %s', (name) => {
    const { input, onApply, onClose } = mountEntry();
    type(input('Day'), '04');
    const button = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((element) => (element.getAttribute('aria-label') ?? element.textContent) === name)!;
    act(() => button.focus());
    const event = key(button, 'Enter');
    expect(event.defaultPrevented).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // jsdom does not synthesize a button click from its keyboard default action.
    if (!event.defaultPrevented) act(() => button.click());
    if (name === 'Apply') {
      expect(onApply).toHaveBeenCalledExactlyOnceWith({ date: '2026-01-04', time: '14:30' });
      expect(onClose).not.toHaveBeenCalled();
    } else {
      expect(onClose).toHaveBeenCalledExactlyOnceWith(true);
      expect(onApply).not.toHaveBeenCalled();
    }
  });

  it('shows why the values were rejected and keeps the dialog open', () => {
    const { input, onApply } = mountEntry();
    onApply.mockReturnValueOnce('Enter a valid date and time between 2000 and 2099.');
    type(input('Day'), '31');
    type(input('Month'), '02');
    act(() => container.querySelector<HTMLButtonElement>('.datetime-entry__apply')!.click());
    expect(container.querySelector('.hint--error')?.textContent).toBe('Enter a valid date and time between 2000 and 2099.');
    expect(input('Day').getAttribute('aria-invalid')).toBe('true');
    type(input('Year'), '26');
    act(() => container.querySelector<HTMLButtonElement>('.datetime-entry__apply')!.click());
    expect(onApply).toHaveBeenCalledTimes(1); // A two-digit year is rejected before reaching the parent.
    expect(container.querySelector('.hint--error')).not.toBeNull();
  });

  it('closes without applying on Escape, Cancel, the close button or a press outside', () => {
    const { input, onApply, onClose } = mountEntry();
    key(input('Day'), 'Escape');
    expect(onClose).toHaveBeenLastCalledWith(true);
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('button')];
    act(() => buttons.find((button) => button.textContent === 'Cancel')!.click());
    act(() => buttons.find((button) => button.getAttribute('aria-label') === 'Close')!.click());
    expect(onClose).toHaveBeenCalledTimes(3);
    act(() => { input('Hour').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    expect(onClose).toHaveBeenCalledTimes(3);
    act(() => { document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); });
    expect(onClose).toHaveBeenLastCalledWith(false);
    expect(onApply).not.toHaveBeenCalled();
  });
});
