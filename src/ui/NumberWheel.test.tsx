// @vitest-environment jsdom

import { act, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NumberWheel } from './NumberWheel';

type WheelProps = ComponentProps<typeof NumberWheel>;

/** Layout of the reel in these tests: three 21 px rows from y = 0 (jsdom has no layout). */
const ROW = 21;
const RECT = { top: 0, bottom: 3 * ROW, left: 0, right: 40, width: 40, height: 3 * ROW, x: 0, y: 0 };

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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Collects animation frames so a test can play them at chosen times. */
function stubFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  let now = performance.now();
  /** Plays frames 16 ms apart until the reel rests (or `limit` frames), calling `each` after every one. */
  const play = (each: () => void = () => {}, limit = 400) => {
    for (let count = 0; frames.length > 0 && count < limit; count += 1) {
      now += 16;
      const frame = frames.shift()!;
      act(() => frame(now));
      each();
    }
  };
  return { frames, play };
}

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
  vi.spyOn(control, 'getBoundingClientRect').mockReturnValue({ ...RECT, toJSON: () => RECT } as DOMRect);
  const captured = new Set<number>();
  // jsdom has no pointer-capture implementation; keep its state observable.
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

function dispatch(target: Element, event: Event) {
  act(() => { target.dispatchEvent(event); });
  return event;
}

function key(target: Element, value: string, options: KeyboardEventInit = {}) {
  return dispatch(target, new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: value, ...options }));
}

function turn(target: Element, deltaY: number, timeStamp: number, options: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...options });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return dispatch(target, event);
}

function pointer(target: Element, type: string, clientY: number, { button = 0, timeStamp }: { button?: number; timeStamp?: number } = {}) {
  // React reads these pointer fields from the native event; no layout engine is needed.
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY, button });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return dispatch(target, event);
}

/** A press and release without moving. */
function tap(target: Element, clientY: number) {
  pointer(target, 'pointerdown', clientY);
  pointer(target, 'pointerup', clientY);
}

/** The rows on the reel, with how centered each one is (1 in the slot, 0 one row away or more). */
function rows() {
  return [...container.querySelectorAll<HTMLElement>('.number-wheel__row')].map((row) => ({
    text: row.textContent,
    focus: Number(row.style.getPropertyValue('--focus')),
  }));
}

/** Text of the row in the slot (the most centered one). */
function centered() {
  return rows().reduce((best, row) => (row.focus > best.focus ? row : best)).text;
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

  it('turns one row per mouse-wheel notch without scrolling the page', () => {
    const { control, value, onChange } = mountWheel({ value: 59 });
    expect(turn(control, 100, 100).defaultPrevented).toBe(true);
    expect(value()).toBe(0);
    turn(control, 3, 200, { deltaMode: 1 });
    expect(value()).toBe(1);
    turn(control, -1, 300, { deltaMode: 2 });
    expect(value()).toBe(0);
    turn(control, -100, 400);
    expect(value()).toBe(59);
    expect(onChange.mock.calls.map(([next]) => next)).toEqual([0, 1, 0, 59]);
  });

  it('follows small trackpad scrolls and settles on a row once they pause', () => {
    vi.useFakeTimers();
    const { control, value, onChange } = mountWheel();
    for (const [index, delta] of [12, 12, 12, 12, 12, 12].entries()) turn(control, delta, 100 + index * 16);
    expect(onChange).not.toHaveBeenCalled(); // 72 px is two rows, reported once the reel stops.
    expect(centered()).toBe('32');
    act(() => vi.advanceTimersByTime(200));
    expect(value()).toBe(32);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(32);
  });

  it('does not intercept pinch-to-zoom or horizontal scroll', () => {
    const { control, onChange } = mountWheel();
    expect(turn(control, 100, 300, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(turn(control, 0, 400, { deltaX: 100 }).defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('turns to the row pressed above or below; pressing the slot changes nothing', () => {
    const { control, value, onChange } = mountWheel();
    tap(control, 5); // Top row.
    expect(value()).toBe(29);
    tap(control, 60); // Bottom row.
    tap(control, 58);
    expect(value()).toBe(31);
    tap(control, ROW * 1.5); // The slot.
    expect(value()).toBe(31);
    expect(onChange.mock.calls.map(([next]) => next)).toEqual([29, 30, 31]);
  });

  it('opens the exact picker from its label or Enter/Space/Alt+↓, never from a press on the reel', () => {
    const onOpen = vi.fn();
    const { control, value, onChange } = mountWheel({ onOpen, popupId: 'picker' });
    const label = container.querySelector<HTMLButtonElement>('button.number-wheel__label')!;
    expect(label.getAttribute('aria-haspopup')).toBe('listbox');
    expect(label.getAttribute('aria-expanded')).toBe('false');
    expect(label.hasAttribute('aria-controls')).toBe(false);
    expect(document.getElementById(control.getAttribute('aria-labelledby')!)).toBe(label);
    tap(control, ROW * 1.5);
    act(() => control.click());
    expect(onOpen).not.toHaveBeenCalled();
    act(() => label.click());
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(key(control, 'Enter').defaultPrevented).toBe(true);
    key(control, ' ');
    key(control, 'ArrowDown', { altKey: true });
    expect(onOpen).toHaveBeenCalledTimes(4);
    expect(value()).toBe(30);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks the label as expanded and pointing to the picker while it is open', () => {
    mountWheel({ onOpen: vi.fn(), open: true, popupId: 'picker' });
    const label = container.querySelector('button.number-wheel__label')!;
    expect(label.getAttribute('aria-expanded')).toBe('true');
    expect(label.getAttribute('aria-controls')).toBe('picker');
  });

  it('shows the neighboring rows as decoration, blank past a non-cyclic boundary', () => {
    const { control } = mountWheel({ label: 'Year', value: 2000, min: 2000, max: 2099, wrap: false });
    const visible = () => rows().filter((row) => row.focus > 0 || row.text !== ' ').map((row) => row.text);
    expect(control.querySelector('button')).toBeNull();
    expect(centered()).toBe('2000');
    expect(visible()).toEqual(['2000', '2001', '2002']);
    key(control, 'End');
    expect(centered()).toBe('2099');
    expect(visible()).toEqual(['2097', '2098', '2099']);
  });

  it('follows a vertical drag and reports the row it stops on when released', () => {
    const onOpen = vi.fn();
    const { control, value, onChange, setPointerCapture, releasePointerCapture } = mountWheel({ onOpen });
    pointer(control, 'pointerdown', 40);
    expect(document.activeElement).toBe(control);
    pointer(control, 'pointermove', 38);
    expect(setPointerCapture).not.toHaveBeenCalled(); // Below the drag threshold.
    pointer(control, 'pointermove', 40 - ROW * 1.8);
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(centered()).toBe('32'); // The reel follows the finger…
    expect(onChange).not.toHaveBeenCalled(); // …and reports nothing until it is let go.
    pointer(control, 'pointerup', 40 - ROW * 1.8);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
    expect(value()).toBe(32);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(32);
    act(() => control.click()); // The click that ends the drag opens nothing.
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps a touch drag when the row it landed on loses its implicit capture to the reel', () => {
    const { control, value, onChange } = mountWheel();
    // The centered row stays on the reel while it turns half a row.
    const row = [...control.querySelectorAll('.number-wheel__row')].find((element) => element.textContent === '30')!;
    pointer(row, 'pointerdown', 40);
    pointer(row, 'pointermove', 40 - ROW * 0.5);
    // A touch is captured by the row it landed on; the reel taking the capture over fires this on the row.
    pointer(row, 'lostpointercapture', 40 - ROW * 0.5);
    pointer(control, 'pointermove', 40 - ROW * 1.8);
    expect(centered()).toBe('32');
    pointer(control, 'pointerup', 40 - ROW * 1.8);
    expect(value()).toBe(32);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(32);
  });

  it('ignores non-primary presses and snaps back after a cancelled or abandoned gesture', () => {
    const { control, onChange } = mountWheel();
    pointer(control, 'pointerdown', 30, { button: 2 });
    pointer(control, 'pointermove', 0);
    pointer(control, 'pointerup', 0);
    expect(onChange).not.toHaveBeenCalled();
    pointer(control, 'pointerdown', 30);
    pointer(control, 'pointercancel', 30);
    pointer(control, 'pointermove', 0);
    expect(onChange).not.toHaveBeenCalled();
    pointer(control, 'pointerdown', 30);
    pointer(control, 'pointerout', 30);
    pointer(control, 'pointermove', 0);
    expect(onChange).not.toHaveBeenCalled();
    expect(centered()).toBe('30');
  });

  it('removes the native wheel listener when unmounted', () => {
    const { control, onChange } = mountWheel();
    act(() => root.render(null));
    expect(turn(control, 100, 100).defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rolls through the values in between when set from outside, with only the slot row lit', () => {
    const { frames, play } = stubFrames();
    const render = (value: number, animated = true) => act(() => root.render(
      <NumberWheel label="Day" value={value} min={1} max={31} animated={animated} invalid={false}
        describedBy="hint" onChange={vi.fn()} />,
    ));
    render(12);
    render(4);
    const control = container.querySelector('[role="spinbutton"]')!;
    expect(control.getAttribute('aria-valuenow')).toBe('4'); // The real value is exposed at once.
    expect(centered()).toBe('12'); // The reel starts from the previous value.
    const passed = new Set<string | null>();
    play(() => {
      passed.add(centered());
      // Only the row nearest the slot is more than half lit, never several at once.
      expect(rows().filter((row) => row.focus > 0.5).length).toBeLessThanOrEqual(1);
      expect(Math.max(...rows().map((row) => row.focus))).toBeGreaterThanOrEqual(0.5);
    });
    expect(frames).toHaveLength(0);
    expect(centered()).toBe('04');
    expect(rows().find((row) => row.text === '04')!.focus).toBe(1);
    expect([...passed]).toEqual(expect.arrayContaining(['11', '08', '05', '04']));
    for (const value of passed) expect(Number(value)).toBeGreaterThanOrEqual(4); // Straight down, no wrap.
    // Without effects the value changes at once.
    render(20, false);
    expect(centered()).toBe('20');
  });

  it('takes the shortest way round a cyclic wheel', () => {
    const { play } = stubFrames();
    const render = (value: number) => act(() => root.render(
      <NumberWheel label="Minute" value={value} min={0} max={59} animated invalid={false} describedBy="hint" onChange={vi.fn()} />,
    ));
    render(58);
    render(2);
    const passed = new Set<string | null>();
    play(() => passed.add(centered()));
    expect([...passed]).toEqual(['58', '59', '00', '01', '02']);
  });

  it('keeps coasting after a quick swipe and reports where it will stop at once', () => {
    const { frames, play } = stubFrames();
    const { control, onChange } = mountWheel({ animated: true });
    pointer(control, 'pointerdown', 60, { timeStamp: 0 });
    pointer(control, 'pointermove', 50, { timeStamp: 10 });
    pointer(control, 'pointermove', 30, { timeStamp: 20 });
    pointer(control, 'pointermove', 10, { timeStamp: 30 });
    pointer(control, 'pointerup', 10, { timeStamp: 32 });
    expect(onChange).toHaveBeenCalledTimes(1);
    const stop = onChange.mock.calls[0]![0] as number;
    expect(stop).toBeGreaterThan(36); // Well past the 2.4 rows dragged.
    expect(centered()).toBe('32');
    play();
    expect(frames).toHaveLength(0);
    expect(centered()).toBe(String(stop).padStart(2, '0'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('NumberWheel with named options', () => {
  const zones = ['UTC', 'Local · Europe/Madrid'];

  it('shows option names and exposes the chosen one as the accessible value', () => {
    const { control } = mountWheel({ label: 'Time zone', value: 0, min: 0, max: 1, wrap: false, format: (index) => zones[index] ?? '' });
    expect(control.getAttribute('aria-valuetext')).toBe('UTC');
    expect(centered()).toBe('UTC');
    expect(container.querySelector('.number-wheel')?.classList.contains('number-wheel--text')).toBe(true);
    key(control, 'ArrowUp');
    expect(control.getAttribute('aria-valuetext')).toBe('Local · Europe/Madrid');
    // No wrap: the last option stays selected.
    key(control, 'ArrowUp');
    expect(control.getAttribute('aria-valuenow')).toBe('1');
    expect(centered()).toBe(zones[1]);
    expect(rows().every((row) => row.text === '\u00a0' || zones.includes(row.text ?? ''))).toBe(true);
  });

  it('animates named options using the continuous reel without displaying numeric indexes', () => {
    const { play } = stubFrames();
    const { control, onChange } = mountWheel({
      label: 'Time zone', value: 0, min: 0, max: 1, wrap: false, animated: true,
      format: (index) => zones[index] ?? '',
    });
    key(control, 'ArrowUp');
    expect(control.getAttribute('aria-valuetext')).toBe(zones[1]);
    play(() => {
      expect(rows().every((row) => row.text === '\u00a0' || zones.includes(row.text ?? ''))).toBe(true);
    });
    expect(centered()).toBe(zones[1]);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('keeps two-digit numbers without a format', () => {
    const { control } = mountWheel({ value: 5 });
    expect(control.getAttribute('aria-valuetext')).toBe('05');
    expect(centered()).toBe('05');
  });
});
