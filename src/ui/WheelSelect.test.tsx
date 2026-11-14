// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WheelSelect } from './WheelSelect';

const OPTIONS = ['Sample A', 'Sample B', 'Sample C'];

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

function mount() {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState<number | null>(null);
    return (
      <WheelSelect
        label="More points"
        placeholder="Choose…"
        options={OPTIONS}
        value={value}
        onChange={(index) => {
          onChange(index);
          setValue(index);
        }}
      />
    );
  }
  act(() => root.render(<Harness />));
  const trigger = container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
  const list = container.querySelector<HTMLUListElement>('[role="listbox"]')!;
  return { trigger, list, onChange };
}

function key(target: HTMLElement, value: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value }));
  });
}

describe('WheelSelect', () => {
  it('starts closed with the placeholder', () => {
    const { trigger, list } = mount();
    expect(trigger.textContent).toContain('Choose…');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(list.hidden).toBe(true);
  });

  it('opens on click and chooses an option', () => {
    const { trigger, list, onChange } = mount();
    act(() => trigger.click());
    expect(list.hidden).toBe(false);
    act(() => list.querySelectorAll<HTMLLIElement>('[role="option"]')[2]!.click());
    expect(onChange).toHaveBeenCalledWith(2);
    expect(trigger.textContent).toContain('Sample C');
    expect(list.hidden).toBe(true);
    expect(list.querySelectorAll('[role="option"]')[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('works from the keyboard', () => {
    const { trigger, list, onChange } = mount();
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(list.querySelectorAll('[role="option"]')[1]!.id);
    key(trigger, 'End');
    key(trigger, 'Enter');
    expect(onChange).toHaveBeenLastCalledWith(2);
    key(trigger, 'Enter');
    key(trigger, 'Home');
    key(trigger, 'Escape');
    expect(list.hidden).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('closes when the pointer goes down outside', () => {
    const { trigger, list } = mount();
    act(() => trigger.click());
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(list.hidden).toBe(true);
  });
});
