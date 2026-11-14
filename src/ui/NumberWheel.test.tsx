// @vitest-environment jsdom

import { act, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NumberWheel } from './NumberWheel';

type WheelProps = ComponentProps<typeof NumberWheel>;

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Keep the value controlled, as ConfigPanel does, so each event sees the latest value. */
function mountWheel(overrides: Partial<WheelProps> = {}) {
  const onChange = vi.fn();
  const props: WheelProps = {
    label: 'Minute', value: 30, min: 0, max: 59,
    animated: false, scrambling: false, invalid: false,
    describedBy: 'time-hint', ...overrides,
    onChange,
  };
  function Harness() {
    const [value, setValue] = useState(props.value);
    return (
      <>
        <p id="time-hint">Choose a time before updating the view.</p>
        <NumberWheel {...props} value={value} onChange={(next) => { onChange(next); setValue(next); }} />
      </>
    );
  }
  act(() => root.render(<Harness />));
  const control = container.querySelector<HTMLDivElement>('[role="spinbutton"]')!;
  const captured = new Set<number>();
  // jsdom has no pointer-capture layout implementation; keep its state observable.
  const setPointerCapture = vi.fn((id: number) => { captured.add(id); });
  const releasePointerCapture = vi.fn((id: number) => { captured.delete(id); });
  Object.assign(control, {
    setPointerCapture,
    releasePointerCapture,
    hasPointerCapture: (id: number) => captured.has(id),
  });
  const value = () => Number(control.getAttribute('aria-valuenow'));
  return { control, onChange, value, setPointerCapture, releasePointerCapture };
}

function dispatch(target: HTMLElement, event: Event) {
  act(() => { target.dispatchEvent(event); });
  return event;
}

function key(target: HTMLElement, value: string, options: KeyboardEventInit = {}) {
  return dispatch(target, new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...options }));
}

function turn(target: HTMLElement, deltaY: number, timeStamp: number, options: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...options });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return dispatch(target, event);
}

function pointer(target: HTMLElement, type: string, clientY: number, button = 0) {
  // React reads these pointer fields from the native event; no layout engine is needed.
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return dispatch(target, event);
}

describe('NumberWheel component interactions', () => {
  it('exposes a labeled, focusable spinbutton with its value, limits and validation hint', () => {
    const { control } = mountWheel({ invalid: true });
    const label = document.getElementById(control.getAttribute('aria-labelledby')!);
    expect(label?.textContent).toBe('Minute');
    expect(control.tabIndex).toBe(0);
    expect(control.getAttribute('aria-valuenow')).toBe('30');
    expect(control.getAttribute('aria-valuemin')).toBe('0');
    expect(control.getAttribute('aria-valuemax')).toBe('59');
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.getAttribute('aria-describedby')).toBe('time-hint');
  });

  it('handles arrows, page steps and Home/End, wrapping cyclic fields', () => {
    const { control, value, onChange } = mountWheel({ value: 59 });
    expect(key(control, 'ArrowUp').defaultPrevented).toBe(true);
    expect(value()).toBe(0);
    key(control, 'ArrowDown');
    expect(value()).toBe(59);
    key(control, 'PageUp');
    expect(value()).toBe(9);
    key(control, 'PageDown');
    expect(value()).toBe(59);
    key(control, 'Home');
    expect(value()).toBe(0);
    key(control, 'End');
    expect(value()).toBe(59);
    expect(onChange.mock.calls.map(([next]) => next)).toEqual([0, 59, 9, 59, 0, 59]);
  });

  it('clamps non-cyclic year steps at both supported boundaries', () => {
    const { control, value } = mountWheel({ label: 'Year', value: 2099, min: 2000, max: 2099, wrap: false });
    key(control, 'ArrowUp');
    expect(value()).toBe(2099);
    key(control, 'PageUp');
    expect(value()).toBe(2099);
    key(control, 'Home');
    key(control, 'ArrowDown');
    expect(value()).toBe(2000);
    key(control, 'PageDown');
    expect(value()).toBe(2000);
  });

  it('accepts a typed year without emitting incomplete or out-of-range values', () => {
    const { control, value, onChange } = mountWheel({ label: 'Year', value: 2026, min: 2000, max: 2099, wrap: false });
    for (const digit of '2028') key(control, digit);
    expect(value()).toBe(2028);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(2028);
    key(control, 'ArrowUp'); // A navigation step starts a fresh digit sequence.
    onChange.mockClear();
    for (const digit of '1999') key(control, digit);
    expect(value()).toBe(2029);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('starts a fresh numeric sequence after the typing timeout and leaves shortcuts alone', () => {
    let now = 100;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { control, value, onChange } = mountWheel();
    key(control, '2');
    expect(value()).toBe(2);
    now += 1300;
    key(control, '3');
    expect(value()).toBe(3);
    onChange.mockClear();
    expect(key(control, '4', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(key(control, '5', { metaKey: true }).defaultPrevented).toBe(false);
    expect(key(control, '6', { altKey: true }).defaultPrevented).toBe(false);
    expect(key(control, 'Tab').defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accumulates wheel deltas and throttles steps without scrolling the page', () => {
    const { control, value, onChange } = mountWheel();
    expect(turn(control, 10, 100).defaultPrevented).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    turn(control, 10, 110);
    expect(value()).toBe(31);
    turn(control, 30, 150); // Less than 90 ms after the previous step.
    expect(value()).toBe(31);
    turn(control, 1, 210);
    expect(value()).toBe(32);
    turn(control, -18, 310);
    expect(value()).toBe(31);
    expect(onChange.mock.calls.map(([next]) => next)).toEqual([31, 32, 31]);
  });

  it('normalizes line/page wheel deltas and does not intercept pinch-to-zoom or horizontal scroll', () => {
    const { control, value, onChange } = mountWheel({ value: 59 });
    turn(control, 2, 100, { deltaMode: 1 });
    expect(value()).toBe(0);
    turn(control, -1, 200, { deltaMode: 2 });
    expect(value()).toBe(59);
    onChange.mockClear();
    expect(turn(control, 100, 300, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(turn(control, 0, 400, { deltaX: 100 }).defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('steps neighboring rows on click while keeping focus on the stable spinbutton', () => {
    const { control, value } = mountWheel();
    const neighbor = (index: number) => control.querySelectorAll<HTMLButtonElement>('button')[index]!;
    expect(neighbor(0).tabIndex).toBe(-1);
    act(() => neighbor(0).click());
    expect(value()).toBe(29);
    expect(document.activeElement).toBe(control);
    act(() => neighbor(1).click());
    expect(value()).toBe(30);
    expect(document.activeElement).toBe(control);
  });

  it('disables the neighboring row at a non-cyclic boundary', () => {
    const { control, onChange } = mountWheel({ label: 'Year', value: 2000, min: 2000, max: 2099, wrap: false });
    const previous = control.querySelector<HTMLButtonElement>('button')!;
    expect(previous.disabled).toBe(true);
    act(() => previous.click());
    expect(onChange).not.toHaveBeenCalled();
    key(control, 'End');
    expect(control.querySelectorAll<HTMLButtonElement>('button')[1]!.disabled).toBe(true);
  });

  it('steps during a vertical drag, releases capture and suppresses the trailing click', () => {
    const { control, value, onChange, setPointerCapture, releasePointerCapture } = mountWheel();
    pointer(control, 'pointerdown', 100);
    expect(document.activeElement).toBe(control);
    pointer(control, 'pointermove', 80);
    expect(onChange).not.toHaveBeenCalled();
    pointer(control, 'pointermove', 75);
    expect(value()).toBe(31);
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    pointer(control, 'pointermove', 50);
    expect(value()).toBe(32);
    pointer(control, 'pointermove', 75);
    expect(value()).toBe(31);
    pointer(control, 'pointerup', 75);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    const next = control.querySelectorAll<HTMLButtonElement>('button')[1]!;
    expect(dispatch(next, new MouseEvent('click', { bubbles: true, cancelable: true })).defaultPrevented).toBe(true);
    expect(value()).toBe(31);
    expect(onChange).toHaveBeenCalledTimes(3);
    act(() => next.click()); // A later deliberate click is not suppressed.
    expect(value()).toBe(32);
  });

  it('ignores non-primary presses and stops a cancelled or abandoned gesture', () => {
    const { control, onChange } = mountWheel();
    pointer(control, 'pointerdown', 100, 2);
    pointer(control, 'pointermove', 50);
    expect(onChange).not.toHaveBeenCalled();
    pointer(control, 'pointerdown', 100);
    pointer(control, 'pointercancel', 100);
    pointer(control, 'pointermove', 50);
    expect(onChange).not.toHaveBeenCalled();
    pointer(control, 'pointerdown', 100);
    pointer(control, 'pointerout', 100);
    pointer(control, 'pointermove', 50);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the native wheel listener when unmounted', () => {
    const { control, onChange } = mountWheel();
    act(() => root.render(null));
    expect(turn(control, 30, 100).defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('NumberWheel with named options', () => {
  const zones = ['UTC', 'Local · Europe/Madrid'];

  it('shows option names and exposes the chosen one as the accessible value', () => {
    const { control } = mountWheel({ label: 'Time zone', value: 0, min: 0, max: 1, wrap: false, format: (index) => zones[index] ?? '' });
    expect(control.getAttribute('aria-valuetext')).toBe('UTC');
    expect(container.querySelector('.number-wheel__selected')?.textContent).toBe('UTC');
    expect(container.querySelector('.number-wheel')?.classList.contains('number-wheel--text')).toBe(true);
    key(control, 'ArrowUp');
    expect(control.getAttribute('aria-valuetext')).toBe('Local · Europe/Madrid');
    // No wrap: the last option stays selected.
    key(control, 'ArrowUp');
    expect(control.getAttribute('aria-valuenow')).toBe('1');
  });

  it('keeps two-digit numbers without a format', () => {
    const { control } = mountWheel({ value: 5 });
    expect(control.hasAttribute('aria-valuetext')).toBe(false);
    expect(container.querySelector('.number-wheel__selected')?.textContent).toBe('05');
  });
});
