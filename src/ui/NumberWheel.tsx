/**
 * A number wheel: a drum of numbers turned with the mouse wheel, a vertical
 * swipe, a press on the row above or below, or the keyboard.
 *
 * The reel moves continuously (see `wheelMotion.ts`): it follows the finger
 * while dragging, coasts and slows down after a swipe, glides from one row to
 * the next on a wheel notch, and rolls through the intermediate numbers when
 * the value is set from outside (LIVE, the exact picker). Every row is drawn
 * from its distance to the center slot, so only the centered number is large
 * and lit, also in the middle of a roll.
 *
 * The value is reported (`onChange`) as soon as the row the reel will stop on
 * is known, not on every row it passes. The label above the reel is a button
 * that opens the exact picker for this part; pressing the reel never does.
 */

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { drawnPointerPosition } from '../features/backdrop/curvaturePointer';
import {
  atRest,
  flingAt,
  nearestPosition,
  planFling,
  resistOverscroll,
  ROLL_OMEGA,
  rowAppearance,
  sampleVelocity,
  springStep,
  SPRING_OMEGA,
  wrapValue,
  type Fling,
  type Motion,
} from './wheelMotion';

interface NumberWheelProps {
  /** Id of the focusable reel, e.g. to return focus to it. */
  readonly id?: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly wrap?: boolean;
  readonly animated: boolean;
  readonly invalid: boolean;
  readonly describedBy: string;
  /** Whether this wheel's exact picker is open, and its id. */
  readonly open?: boolean;
  readonly popupId?: string;
  /** The label button (or Enter/Space/Alt+↓ on the reel) asks for the exact picker. */
  readonly onOpen?: () => void;
  readonly onChange: (value: number) => void;
}

interface ReelConfig {
  readonly min: number;
  readonly max: number;
  readonly wrap: boolean;
  readonly animated: boolean;
  readonly onChange: (value: number) => void;
}

type Mode =
  | { readonly kind: 'idle' }
  /** The reel follows a finger or a trackpad directly; no frame loop. */
  | { readonly kind: 'held' }
  | { readonly kind: 'spring'; readonly target: number; readonly omega: number }
  | { readonly kind: 'fling'; readonly fling: Fling; readonly start: number };

/** Row height when the layout cannot be measured, px. */
const FALLBACK_ROW_PX = 21;
/** Pointer travel before a press becomes a drag, px. */
const DRAG_THRESHOLD_PX = 4;
/** Trackpad scroll that turns the reel by one row, px. */
const SCROLL_PX_PER_ROW = 36;
/** Trackpad pause after which the reel settles on a row, ms. */
const SCROLL_SETTLE_MS = 110;
/** A drag that stood still this long before release does not fling, ms. */
const FLING_STALE_MS = 70;

/**
 * Drives the reel position outside React's render cycle. The component
 * renders whatever position it reports through `onFrame`.
 */
class Reel {
  private config: ReelConfig;
  private motion: Motion;
  private mode: Mode = { kind: 'idle' };
  private frame = 0;
  private lastFrame = 0;
  private scrollTimer = 0;
  private scrollSamples: { t: number; p: number }[] = [];
  /** Last value reported or received: a new `value` prop that differs came from outside. */
  private committed: number;

  constructor(
    value: number,
    config: ReelConfig,
    private readonly onFrame: (position: number) => void,
    private readonly onRest: (max: number) => void,
  ) {
    this.config = config;
    this.motion = { position: value, velocity: 0 };
    this.committed = value;
  }

  /** New props. A shorter month relabels the reel at once unless the value is about to roll. */
  configure(config: ReelConfig, value: number) {
    const shrunk = config.max !== this.config.max;
    this.config = config;
    if (shrunk && this.mode.kind === 'idle' && value === this.committed) this.onRest(config.max);
  }

  get position() {
    return this.motion.position;
  }

  get moving() {
    return this.mode.kind !== 'idle';
  }

  /** The `value` prop changed: roll there unless the change is the one this reel reported. */
  sync(value: number) {
    if (value === this.committed) return;
    this.committed = value;
    const { min, max, wrap, animated } = this.config;
    if (!animated) {
      this.jump(value);
      return;
    }
    this.springTo(nearestPosition(value, this.motion.position, min, max, wrap), ROLL_OMEGA);
  }

  /** Turns `amount` rows from where the reel is heading (so quick presses add up). */
  stepBy(amount: number) {
    const base = this.mode.kind === 'spring' ? this.mode.target : Math.round(this.motion.position);
    this.moveTo(base + amount);
  }

  /** Goes to `value` the shortest way round. */
  goTo(value: number) {
    const { min, max, wrap } = this.config;
    this.moveTo(nearestPosition(value, this.motion.position, min, max, wrap));
  }

  /** Stops the reel under the finger; returns whether it was moving. */
  grab(): boolean {
    const moving = this.moving;
    this.cancelFrame();
    this.cancelScroll();
    this.mode = { kind: 'held' };
    this.motion = { position: this.motion.position, velocity: 0 };
    return moving;
  }

  /** Moves a held reel to `position` (before overscroll resistance). */
  hold(position: number) {
    const { min, max, wrap } = this.config;
    this.show({ position: wrap ? position : resistOverscroll(position, min, max), velocity: 0 });
  }

  /** Lets go of a held reel moving at `velocity` rows/s: it coasts, or snaps to the nearest row. */
  release(velocity: number) {
    const { min, max, wrap, animated } = this.config;
    const { position } = this.motion;
    const bounds = wrap ? null : { min, max };
    if (!animated) {
      this.moveTo(this.clamp(Math.round(position)));
      return;
    }
    const outside = bounds !== null && (position < min || position > max);
    const fling = outside ? null : planFling(position, velocity, bounds);
    if (fling) {
      this.commit(fling.from + fling.distance);
      this.mode = { kind: 'fling', fling, start: performance.now() };
      this.run();
      return;
    }
    // Keep the release speed so the snap continues the hand's motion.
    this.motion = { position, velocity: outside ? 0 : velocity };
    this.moveTo(this.clamp(Math.round(position)));
  }

  /** A trackpad turns the reel directly; it settles on a row once the scrolling pauses. */
  scrollBy(rows: number, time: number) {
    if (this.mode.kind !== 'held') this.grab();
    const samples = this.scrollSamples;
    samples.push({ t: time, p: this.motion.position + rows });
    if (samples.length > 8) samples.shift();
    this.hold(this.motion.position + rows);
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = window.setTimeout(() => {
      const velocity = sampleVelocity(this.scrollSamples);
      this.scrollSamples = [];
      this.scrollTimer = 0;
      this.release(Math.max(-8, Math.min(8, velocity)) * 0.3);
    }, SCROLL_SETTLE_MS);
  }

  dispose() {
    this.cancelFrame();
    this.cancelScroll();
  }

  private moveTo(target: number) {
    const stop = this.clamp(target);
    this.commit(stop);
    if (!this.config.animated) {
      this.jump(stop);
      return;
    }
    if (stop === this.motion.position && this.motion.velocity === 0) {
      this.settle(stop);
      return;
    }
    this.springTo(stop, SPRING_OMEGA);
  }

  private springTo(target: number, omega: number) {
    this.mode = { kind: 'spring', target, omega };
    this.run();
  }

  private clamp(position: number) {
    const { min, max, wrap } = this.config;
    return wrap ? position : Math.max(min, Math.min(max, position));
  }

  private commit(position: number) {
    const { min, max, wrap, onChange } = this.config;
    const value = wrap ? wrapValue(position, min, max) : position;
    if (value === this.committed) return;
    this.committed = value;
    onChange(value);
  }

  private jump(position: number) {
    this.cancelFrame();
    this.settle(position);
  }

  private settle(position: number) {
    const { min, max, wrap } = this.config;
    this.mode = { kind: 'idle' };
    this.show({ position: wrap ? wrapValue(position, min, max) : position, velocity: 0 });
    this.onRest(max);
  }

  private show(motion: Motion) {
    this.motion = motion;
    this.onFrame(motion.position);
  }

  private run() {
    if (this.frame !== 0) return;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private cancelFrame() {
    if (this.frame !== 0) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private cancelScroll() {
    window.clearTimeout(this.scrollTimer);
    this.scrollTimer = 0;
    this.scrollSamples = [];
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const mode = this.mode;
    if (mode.kind === 'spring') {
      const next = springStep(this.motion, mode.target, dt, mode.omega);
      if (atRest(next, mode.target)) {
        this.settle(mode.target);
        return;
      }
      this.show(next);
    } else if (mode.kind === 'fling') {
      const next = flingAt(mode.fling, Math.max(0, now - mode.start) / 1000);
      if (next.done) {
        this.settle(next.position);
        return;
      }
      this.show(next);
    } else {
      return;
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

interface Gesture {
  readonly pointerId: number;
  readonly startY: number;
  readonly startPosition: number;
  /** Where the press landed, as drawn (through the curved glass). */
  readonly pressY: number;
  readonly wasMoving: boolean;
  dragging: boolean;
  samples: { t: number; p: number }[];
}

export function NumberWheel({
  id, label, value, min, max, wrap = true, animated, invalid, describedBy,
  open = false, popupId, onOpen, onChange,
}: NumberWheelProps) {
  const labelId = useId();
  const control = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const digits = useRef({ text: '', at: 0 });
  const [position, setPosition] = useState(value);
  /** Largest value labels may show: a day can exceed the new month's length until the reel has rolled back. */
  const [labelMax, setLabelMax] = useState(max);
  const [reel] = useState(() => new Reel(value, { min, max, wrap, animated, onChange }, setPosition, setLabelMax));

  // Without effects there is no roll: the reel shows a new value at once.
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    if (!animated) setPosition(value);
  }
  if (max > labelMax || (!animated && max !== labelMax)) setLabelMax(max);

  useEffect(() => {
    reel.configure({ min, max, wrap, animated, onChange }, value);
  });

  useEffect(() => {
    reel.sync(value);
  }, [reel, value]);

  useEffect(() => () => reel.dispose(), [reel]);

  // React wheel handlers are passive. A native listener prevents scrolling the
  // workspace while the user deliberately turns a wheel, including on trackpads.
  useEffect(() => {
    const element = control.current;
    if (!element) return;
    const turn = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      // A mouse wheel moves in notches (lines/pages, or large pixel jumps): one row per notch.
      if (event.deltaMode !== 0 || Math.abs(event.deltaY) >= 50) {
        reel.stepBy(Math.sign(event.deltaY));
      } else {
        reel.scrollBy(event.deltaY / SCROLL_PX_PER_ROW, event.timeStamp);
      }
    };
    element.addEventListener('wheel', turn, { passive: false });
    return () => element.removeEventListener('wheel', turn);
  }, [reel]);

  function rowHeight() {
    return (control.current?.clientHeight ?? 0) / 3 || FALLBACK_ROW_PX;
  }

  function handleKey(event: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    const amount = steps[event.key];
    if (event.altKey && event.key === 'ArrowDown' && onOpen) {
      event.preventDefault();
      onOpen();
    } else if (amount !== undefined) {
      event.preventDefault();
      digits.current.text = '';
      reel.stepBy(amount);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      reel.goTo(event.key === 'Home' ? min : max);
    } else if ((event.key === 'Enter' || event.key === ' ') && onOpen) {
      event.preventDefault();
      onOpen();
    } else if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = performance.now();
      const previousDigits = now - digits.current.at < 1200 ? digits.current.text : '';
      const text = `${previousDigits}${event.key}`.slice(-String(max).length);
      digits.current = { text, at: now };
      const number = Number(text);
      if (number >= min && number <= max) reel.goTo(number);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const drawn = drawnPointerPosition(event.clientX, event.clientY);
    // Through the curved glass the press may land on a neighboring control as drawn: leave it to that one.
    if (rect.height > 0 && (drawn.y < rect.top || drawn.y > rect.bottom || drawn.x < rect.left || drawn.x > rect.right)) return;
    // Keep focus on the spinbutton (and avoid selecting digits) while dragging.
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const wasMoving = reel.grab();
    gesture.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: reel.position,
      pressY: rect.height > 0 ? drawn.y - (rect.top + rect.height / 2) : 0,
      wasMoving,
      dragging: false,
      samples: [],
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = drag.startY - event.clientY;
    if (!drag.dragging) {
      if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
      drag.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const next = drag.startPosition + distance / rowHeight();
    drag.samples.push({ t: event.timeStamp, p: next });
    if (drag.samples.length > 8) drag.samples.shift();
    reel.hold(next);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.dragging) {
      const last = drag.samples[drag.samples.length - 1];
      const stale = !last || event.timeStamp - last.t > FLING_STALE_MS;
      reel.release(stale ? 0 : sampleVelocity(drag.samples));
      return;
    }
    // A press on the row above or below turns the reel to it; on a moving reel it only stops it.
    const rows = drag.pressY / rowHeight();
    if (!drag.wasMoving && Math.abs(rows) >= 0.5) reel.stepBy(Math.sign(rows));
    else reel.release(0);
  }

  function cancelGesture() {
    const drag = gesture.current;
    if (!drag) return;
    gesture.current = null;
    reel.release(0);
  }

  const labelMaxShown = Math.max(max, labelMax);
  const rows: { key: number; text: string; style: CSSProperties }[] = [];
  for (let row = Math.floor(position) - 2; row <= Math.ceil(position) + 2; row += 1) {
    const offset = row - position;
    if (Math.abs(offset) > 2) continue;
    let text = '\u00a0';
    if (wrap) text = pad(wrapValue(row, min, labelMaxShown));
    else if (row >= min && row <= labelMaxShown) text = pad(row);
    const look = rowAppearance(offset);
    const scale = 0.68 + 0.32 * look.focus;
    rows.push({
      key: row,
      text,
      style: {
        transform: `translateY(calc(${look.y.toFixed(4)} * var(--wheel-row))) scale(${scale.toFixed(4)}, ${(scale * look.scaleY).toFixed(4)})`,
        opacity: look.opacity,
        '--focus': look.focus.toFixed(3),
      } as CSSProperties,
    });
  }

  return (
    <div className="number-wheel">
      {onOpen ? (
        <button
          type="button"
          id={labelId}
          className="number-wheel__label number-wheel__label--button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? popupId : undefined}
          onClick={onOpen}
        >
          {label}
          <span className="number-wheel__caret" aria-hidden="true">▾</span>
        </button>
      ) : (
        <span className="number-wheel__label" id={labelId}>{label}</span>
      )}
      <div
        ref={control}
        id={id}
        className="number-wheel__control"
        role="spinbutton"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuenow={value}
        aria-valuetext={pad(value)}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        data-open={open}
        onKeyDown={handleKey}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={(event) => {
          if (gesture.current?.dragging && gesture.current.pointerId === event.pointerId) cancelGesture();
        }}
        onPointerLeave={(event) => {
          // Before a drag starts there is no capture: a press that slides off is abandoned.
          if (gesture.current && !gesture.current.dragging && gesture.current.pointerId === event.pointerId) cancelGesture();
        }}
      >
        <div className="number-wheel__reel" aria-hidden="true">
          {rows.map((row) => (
            <span key={row.key} className="number-wheel__row" style={row.style}>
              {row.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
