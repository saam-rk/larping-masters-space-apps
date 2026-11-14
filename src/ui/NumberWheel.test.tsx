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
    animated: false, invalid: false,
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

  it('opens the exact entry on a click or Enter/Space without changing the value', () => {
    const onOpen = vi.fn();
    const { control, value, onChange } = mountWheel({ onOpen });
    act(() => control.click());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(key(control, 'Enter').defaultPrevented).toBe(true);
    key(control, ' ');
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(value()).toBe(30);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the neighboring rows as decoration, blank past a non-cyclic boundary', () => {
    const { control } = mountWheel({ label: 'Year', value: 2000, min: 2000, max: 2099, wrap: false });
    const rows = () => [...control.querySelectorAll('.number-wheel__row')].map((row) => row.textContent);
    expect(control.querySelector('button')).toBeNull();
    expect(rows()).toEqual(['\u00a0', '2000', '2001']);
    key(control, 'End');
    expect(rows()).toEqual(['2098', '2099', '\u00a0']);
  });

  it('steps during a vertical drag, releases capture and suppresses the trailing click', () => {
    const onOpen = vi.fn();
    const { control, value, onChange, setPointerCapture, releasePointerCapture } = mountWheel({ onOpen });
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
    expect(onOpen).not.toHaveBeenCalled();
    act(() => control.click()); // The click that ends the drag does not open the entry.
    expect(onOpen).not.toHaveBeenCalled();
    expect(value()).toBe(31);
    expect(onChange).toHaveBeenCalledTimes(3);
    act(() => control.click()); // A later deliberate click does.
    expect(onOpen).toHaveBeenCalledTimes(1);
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

  it('cancels an active roll when effects are disabled and does not resume it when re-enabled', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    const cancel = vi.fn((id: number) => { frames.delete(id); });
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const render = (value: number, rollId: number, animated: boolean) => act(() => root.render(
      <NumberWheel label="Day" value={value} min={1} max={31} animated={animated} invalid={false}
        describedBy="hint" rollId={rollId} rollFrom={12} onChange={vi.fn()} />,
    ));
    render(12, 0, true);
    render(4, 1, true);
    expect(container.querySelector('.number-wheel__reel--rolling')).not.toBeNull();
    expect(frames.size).toBe(1);
    render(4, 1, false);
    expect(container.querySelector('.number-wheel__reel--rolling')).toBeNull();
    expect(container.querySelector('.number-wheel__selected')?.textContent).toBe('04');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    render(4, 1, true);
    expect(container.querySelector('.number-wheel__reel--rolling')).toBeNull();
    expect(container.querySelector('.number-wheel__selected')?.textContent).toBe('04');
    expect(frames.size).toBe(0);
  });

  it('rolls unit by unit from the previous value to a value set from outside, then settles', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const render = (value: number, rollId: number, animated = true) => act(() => root.render(
      <NumberWheel label="Day" value={value} min={1} max={31} animated={animated} invalid={false}
        describedBy="hint" rollId={rollId} rollFrom={12} onChange={vi.fn()} />,
    ));
    const frame = (now: number) => act(() => frames.shift()!(now));
    const shown = () => [...container.querySelectorAll('.number-wheel__row')].map((row) => row.textContent);
    render(12, 0);
    render(4, 1);
    const control = container.querySelector('[role="spinbutton"]')!;
    expect(control.getAttribute('aria-valuenow')).toBe('4'); // The real value is exposed at once.
    expect(shown()).toEqual(['11', '12', '13', '14']); // Still on 12: the roll counts down from here.
    frame(0);
    frame(150);
    const middle = shown();
    expect(Number(middle[1])).toBeLessThan(12);
    expect(Number(middle[1])).toBeGreaterThanOrEqual(4);
    frame(5000);
    expect(shown()).toEqual(['03', '04', '05']);
    expect(container.querySelector('.number-wheel__reel')!.getAttribute('data-animated')).toBe('false');
    expect(frames).toHaveLength(0);
    // Without effects the value changes at once.
    render(20, 2, false);
    expect(shown()).toEqual(['19', '20', '21']);
  });
});
