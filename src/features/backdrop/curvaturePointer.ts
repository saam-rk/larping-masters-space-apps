/**
 * Pointer remapping for the curved-glass filter (see `CrtCurvature.tsx`).
 *
 * The filter only moves pixels: the browser still hit-tests the undistorted
 * layout, so near the edges a control is drawn up to `maxShift()` px away from
 * where it reacts. While the filter is on, this module finds the element that
 * is drawn under the pointer (the filter takes the pixel at S from
 * `S + barrelShift(S)`, so that is the element at that layout point) and
 * routes the interaction to it:
 *
 * - hover: `data-hover` is set on the drawn element and its ancestors, and the
 *   CSS `:hover` rules are mirrored on `[data-hover]` (and switched off for
 *   the real `:hover` while the filter is on, see `styles.css`);
 * - mouse down / click: when the control under the real pointer is not the
 *   drawn one, the native action is cancelled and the drawn control is
 *   activated instead (`click()`, or focus plus the picker for fields);
 * - cursor: the drawn element's cursor is applied to the whole frame;
 * - range sliders: a press on a drawn slider is taken over and the value
 *   follows the drawn pointer position until release (a native drag would
 *   follow the layout position, and near the edges the press may not even hit
 *   the slider). The value is set like typing would and fires `input` and
 *   `change`, so React `onChange` handlers run.
 *
 * Limits: native tooltips (`title`), text selection by dragging and the
 * caret position inside a field still follow the real pointer position.
 * Dialogs open in the top layer and are not distorted, so they are left alone.
 */

import { barrelShift } from './curvature';

const INTERACTIVE = 'a[href], button, input, select, textarea, label, summary, [role="button"], [role="spinbutton"]';

/** Pointer travel between press and click beyond which the click ends a drag, px. */
const DRAG_SLOP_PX = 6;

/** Input types that open a picker instead of taking typed text on click. */
const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color']);

function frameElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app__frame');
}

/** The element drawn under the pointer, or null in the dark margins and outside the page. */
function drawnElementAt(clientX: number, clientY: number, frame: HTMLElement): Element | null {
  const { x, y } = drawnPoint(clientX, clientY, frame);
  if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return null;
  return document.elementFromPoint(x, y);
}

/** The control an element belongs to; a label stands for the control it forwards to. */
function controlOf(element: Element | null): Element | null {
  const interactive = element?.closest(INTERACTIVE) ?? null;
  if (interactive instanceof HTMLLabelElement) return interactive.control ?? interactive;
  return interactive;
}

function isTextField(element: Element): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return true;
  return element instanceof HTMLInputElement && !PICKER_TYPES.has(element.type) && !['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'range'].includes(element.type);
}

function activate(control: Element): void {
  if (control instanceof HTMLSelectElement || (control instanceof HTMLInputElement && PICKER_TYPES.has(control.type))) {
    control.focus();
    try {
      control.showPicker();
    } catch {
      // Not allowed without a user gesture or unsupported: focusing is enough.
    }
  } else if (isTextField(control)) {
    control.focus();
  } else if (control instanceof HTMLElement) {
    control.click();
  }
}

/** Layout of a range slider along its axis, in client px. */
export interface RangeTrack {
  /** Start and length of the content box along the slider axis. */
  readonly start: number;
  readonly length: number;
  /** Thumb length along the axis (the thumb center travels `length - thumb`). */
  readonly thumb: number;
  /** True when the minimum is at the end of the axis (bottom or right). */
  readonly reversed: boolean;
  readonly min: number;
  readonly max: number;
  /** Step size, or null for `step="any"`. */
  readonly step: number | null;
}

/** Slider value under `position` (client px along the axis), clamped and snapped to the step. */
export function rangeValueAt(track: RangeTrack, position: number): number {
  const travel = Math.max(track.length - track.thumb, 1);
  const raw = Math.min(Math.max((position - track.start - track.thumb / 2) / travel, 0), 1);
  const fraction = track.reversed ? 1 - raw : raw;
  let value = track.min + fraction * (track.max - track.min);
  if (track.step !== null && track.step > 0) {
    value = track.min + Math.round((value - track.min) / track.step) * track.step;
    // Remove floating-point noise from the step multiplication.
    value = Number(value.toFixed(10));
  }
  return Math.min(Math.max(value, track.min), track.max);
}

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** A CSS length in px, or rem/em against the root/element font size; 0 when missing or in another unit. */
function lengthPx(value: string, element: Element): number {
  const match = /^\s*(-?[\d.]+)(px|rem|em)\s*$/.exec(value);
  if (!match) return 0;
  const amount = Number(match[1]);
  if (match[2] === 'px') return amount;
  const base = match[2] === 'rem' ? document.documentElement : element;
  return amount * px(getComputedStyle(base).fontSize);
}

/**
 * Measures a slider: orientation from its writing mode, ends from `direction`.
 * The thumb length comes from the `--range-thumb-length` custom property:
 * browsers do not report the computed size of the thumb pseudo-element
 * (Chromium returns the input's own size), and without it the thumb counts as
 * a point.
 */
function measureRange(input: HTMLInputElement): { vertical: boolean; track: RangeTrack } {
  const style = getComputedStyle(input);
  const vertical = style.writingMode.startsWith('vertical') || style.writingMode.startsWith('sideways');
  const rect = input.getBoundingClientRect();
  const before = vertical ? px(style.borderTopWidth) + px(style.paddingTop) : px(style.borderLeftWidth) + px(style.paddingLeft);
  const after = vertical
    ? px(style.borderBottomWidth) + px(style.paddingBottom)
    : px(style.borderRightWidth) + px(style.paddingRight);
  const thumb = lengthPx(style.getPropertyValue('--range-thumb-length'), input);
  const min = input.min === '' ? 0 : Number(input.min);
  const max = input.max === '' ? 100 : Number(input.max);
  const step = input.step === 'any' ? null : input.step === '' ? 1 : Number(input.step);
  return {
    vertical,
    track: {
      start: (vertical ? rect.top : rect.left) + before,
      length: (vertical ? rect.height : rect.width) - before - after,
      thumb,
      // Vertical sliders run top to bottom unless `direction: rtl`; horizontal ones left to right unless rtl.
      reversed: style.direction === 'rtl',
      min,
      max,
      step,
    },
  };
}

/** Sets a slider value the way user input would, so React sees the change. */
function setRangeValue(input: HTMLInputElement, value: number): void {
  const next = String(value);
  if (input.value === next) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, next);
  else input.value = next;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Layout point drawn at a client point: the pixel there is taken from `client + barrelShift`. */
function drawnPoint(clientX: number, clientY: number, frame: HTMLElement): { x: number; y: number } {
  const rect = frame.getBoundingClientRect();
  const dx = clientX - rect.left - window.innerWidth / 2;
  const dy = clientY - rect.top - window.innerHeight / 2;
  const [shiftX, shiftY] = barrelShift(dx, dy, window.innerWidth, window.innerHeight);
  return { x: clientX + shiftX, y: clientY + shiftY };
}

/**
 * Layout point drawn under a client point: the point itself unless the
 * curved-glass filter is on. Lets a control that reacts to where it was
 * pressed (e.g. the row of a number wheel) use the position the user sees.
 */
export function drawnPointerPosition(clientX: number, clientY: number): { x: number; y: number } {
  const frame = frameElement();
  if (document.documentElement.dataset.curve !== 'on' || !frame) return { x: clientX, y: clientY };
  return drawnPoint(clientX, clientY, frame);
}

/** True when the page is not being drawn through the filter at this event. */
function skip(target: EventTarget | null): boolean {
  if (document.documentElement.dataset.curve !== 'on') return true;
  if (!(target instanceof Element)) return true;
  // The frame is inert behind a modal dialog, and dialogs are not distorted.
  if (document.querySelector('dialog[open]')) return true;
  return !target.closest('.app__frame');
}

/**
 * Starts the remapping. Returns a function that stops it and removes every
 * attribute it set.
 */
export function installCurvaturePointer(): () => void {
  const root = document.documentElement;
  let hovered: Element[] = [];
  let lastDrawn: Element | null = null;
  let pending: { x: number; y: number } | null = null;
  let frameId = 0;
  let busy = false;

  const clearHover = () => {
    for (const element of hovered) element.removeAttribute('data-hover');
    hovered = [];
    lastDrawn = null;
    root.removeAttribute('data-curve-cursor');
  };

  const updateHover = () => {
    frameId = 0;
    const frame = frameElement();
    if (!pending || !frame || root.dataset.curve !== 'on' || document.querySelector('dialog[open]')) {
      clearHover();
      return;
    }
    const drawn = drawnElementAt(pending.x, pending.y, frame);
    if (drawn === lastDrawn) return;
    lastDrawn = drawn;

    const chain: Element[] = [];
    for (let element = drawn; element && element !== root; element = element.parentElement) chain.push(element);
    for (const element of hovered) if (!chain.includes(element)) element.removeAttribute('data-hover');
    for (const element of chain) if (!hovered.includes(element)) element.setAttribute('data-hover', '');
    hovered = chain;

    // Read the cursor the drawn element asks for with the override switched off.
    root.removeAttribute('data-curve-cursor');
    let cursor = drawn ? getComputedStyle(drawn).cursor : 'default';
    if (cursor === 'auto') cursor = drawn && isTextField(drawn) ? 'text' : 'default';
    root.style.setProperty('--curve-cursor', cursor);
    root.setAttribute('data-curve-cursor', '');
  };

  const onPointerMove = (event: PointerEvent) => {
    if (skip(event.target)) return;
    pending = { x: event.clientX, y: event.clientY };
    if (frameId === 0) frameId = requestAnimationFrame(updateHover);
  };

  const onPointerLeave = () => {
    pending = null;
    clearHover();
  };

  /** Where the last primary press started, to tell a click from the end of a drag. */
  let press: { x: number; y: number } | null = null;

  const onPress = (event: PointerEvent) => {
    press = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  };

  /** Control drawn under the pointer and control under it for the browser; null when no remapping is needed. */
  const resolve = (event: MouseEvent): { real: Element | null; drawn: Element | null } | null => {
    // Keyboard and assistive-technology clicks activate the focused control;
    // their zero coordinates are not a pointer position to remap.
    if (busy || !event.isTrusted || event.detail === 0 || skip(event.target)) return null;
    // The click that ends a drag (e.g. turning a number wheel) belongs to the
    // dragged control: it must not activate whatever is drawn where it ended.
    if (event.type === 'click' && press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_SLOP_PX) {
      return null;
    }
    const frame = frameElement();
    if (!frame) return null;
    const real = controlOf(event.target as Element);
    const drawn = controlOf(drawnElementAt(event.clientX, event.clientY, frame));
    return real === drawn ? null : { real, drawn };
  };

  /** Slider being dragged through the filter, with the pointer that drags it. */
  let slide: { input: HTMLInputElement; pointerId: number } | null = null;

  const slideTo = (clientX: number, clientY: number) => {
    const frame = frameElement();
    if (!slide || !frame) return;
    const point = drawnPoint(clientX, clientY, frame);
    const { vertical, track } = measureRange(slide.input);
    setRangeValue(slide.input, rangeValueAt(track, vertical ? point.y : point.x));
  };

  const onPointerDown = (event: PointerEvent) => {
    if (slide || event.button !== 0 || !event.isTrusted || skip(event.target)) return;
    const frame = frameElement();
    if (!frame) return;
    const drawn = controlOf(drawnElementAt(event.clientX, event.clientY, frame));
    if (!(drawn instanceof HTMLInputElement) || drawn.type !== 'range' || drawn.disabled) return;
    // Take the press over: no native drag on the layout position, no drag of the 3D view below.
    event.preventDefault();
    event.stopImmediatePropagation();
    slide = { input: drawn, pointerId: event.pointerId };
    drawn.focus({ preventScroll: true });
    slideTo(event.clientX, event.clientY);
  };

  const onSlideMove = (event: PointerEvent) => {
    if (!slide || event.pointerId !== slide.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    slideTo(event.clientX, event.clientY);
  };

  const onSlideEnd = (event: PointerEvent) => {
    if (!slide || event.pointerId !== slide.pointerId) return;
    event.stopImmediatePropagation();
    slide = null;
  };

  const onMouseDown = (event: MouseEvent) => {
    // A press on the wrong control must not focus it or open its list.
    const wrong = resolve(event);
    if (wrong?.real) event.preventDefault();
  };

  const onClick = (event: MouseEvent) => {
    const wrong = resolve(event);
    if (!wrong) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!wrong.drawn) return;
    busy = true;
    try {
      activate(wrong.drawn);
    } finally {
      busy = false;
    }
  };

  const onBlur = () => {
    slide = null;
    onPointerLeave();
  };

  window.addEventListener('pointerdown', onPress, true);
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onSlideMove, true);
  window.addEventListener('pointerup', onSlideEnd, true);
  window.addEventListener('pointercancel', onSlideEnd, true);
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('click', onClick, true);
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('pointerdown', onPress, true);
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointermove', onSlideMove, true);
    window.removeEventListener('pointerup', onSlideEnd, true);
    window.removeEventListener('pointercancel', onSlideEnd, true);
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('mousedown', onMouseDown, true);
    window.removeEventListener('click', onClick, true);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onBlur);
    if (frameId !== 0) cancelAnimationFrame(frameId);
    clearHover();
  };
}
