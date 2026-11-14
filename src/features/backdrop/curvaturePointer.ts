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
 * - cursor: the drawn element's cursor is applied to the whole frame.
 *
 * Limits: native tooltips (`title`), text selection by dragging and the
 * caret position inside a field still follow the real pointer position.
 * Dialogs open in the top layer and are not distorted, so they are left alone.
 */

import { barrelShift } from './curvature';

const INTERACTIVE = 'a[href], button, input, select, textarea, label, summary, [role="button"]';

/** Input types that open a picker instead of taking typed text on click. */
const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color']);

function frameElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.app__frame');
}

/** The element drawn under the pointer, or null in the dark margins and outside the page. */
function drawnElementAt(clientX: number, clientY: number, frame: HTMLElement): Element | null {
  const rect = frame.getBoundingClientRect();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dx = clientX - rect.left - width / 2;
  const dy = clientY - rect.top - height / 2;
  const [shiftX, shiftY] = barrelShift(dx, dy, width, height);
  const x = clientX + shiftX;
  const y = clientY + shiftY;
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
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

  /** Control drawn under the pointer and control under it for the browser; null when no remapping is needed. */
  const resolve = (event: MouseEvent): { real: Element | null; drawn: Element | null } | null => {
    if (busy || !event.isTrusted || skip(event.target)) return null;
    const frame = frameElement();
    if (!frame) return null;
    const real = controlOf(event.target as Element);
    const drawn = controlOf(drawnElementAt(event.clientX, event.clientY, frame));
    return real === drawn ? null : { real, drawn };
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

  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('mousedown', onMouseDown, true);
  window.addEventListener('click', onClick, true);
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);

  return () => {
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('mousedown', onMouseDown, true);
    window.removeEventListener('click', onClick, true);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onPointerLeave);
    if (frameId !== 0) cancelAnimationFrame(frameId);
    clearHover();
  };
}
