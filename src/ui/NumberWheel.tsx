import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ROLL_MS, rollPosition, stepWheel } from '../features/mission-config/dateTimeWheel';

interface NumberWheelProps {
  /** Id of the focusable control, e.g. to return focus to it. */
  readonly id?: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly wrap?: boolean;
  readonly animated: boolean;
  readonly invalid: boolean;
  readonly describedBy: string;
  /**
   * Changing this number rolls the reel from `rollFrom` to the new `value`,
   * one unit at a time, instead of jumping (used when LIVE or an exact entry
   * sets every wheel at once). Ignored unless `animated`.
   */
  readonly rollId?: number;
  readonly rollFrom?: number;
  /** Id of the exact-entry popup this wheel opens, while it is open. */
  readonly controls?: string;
  /** A click (not a drag) or Enter/Space asks for the exact-entry popup. */
  readonly onOpen?: () => void;
  readonly onChange: (value: number) => void;
}

interface Roll {
  readonly from: number;
  readonly to: number;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Text of the row `offset` rows below `value`: blank past the end of a non-cyclic wheel. */
function rowLabel(value: number, offset: number, min: number, max: number, wrap: boolean): string {
  const target = value + offset;
  if (target >= min && target <= max) return pad(target);
  return wrap ? pad(stepWheel(value, offset, min, max, true)) : '\u00a0';
}

/**
 * Animation state of a roll. It starts when `rollId` changes (adjusting state
 * while rendering, so the first frame already shows the old value) and ends on
 * the target, or as soon as the value changes for another reason.
 */
function useRoll(value: number, rollId: number, rollFrom: number | undefined, enabled: boolean) {
  const [seenRollId, setSeenRollId] = useState(rollId);
  const [roll, setRoll] = useState<Roll | null>(null);
  const [progress, setProgress] = useState(1);

  if (rollId !== seenRollId) {
    setSeenRollId(rollId);
    const starts = enabled && rollFrom !== undefined && rollFrom !== value;
    setRoll(starts ? { from: rollFrom, to: value } : null);
    setProgress(starts ? 0 : 1);
  }

  useEffect(() => {
    if (!roll) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const next = Math.min(1, (now - start) / ROLL_MS);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [roll]);

  const active = roll !== null && roll.to === value;
  return {
    /** Fractional reel position while rolling, or null at rest. */
    position: active && progress < 1 ? rollPosition(roll.from, roll.to, progress) : null,
    /** Highest value the roll passes through (a day can exceed the new month's length). */
    rollMax: roll ? Math.max(roll.from, roll.to) : 0,
    /** The value on screen was reached by a roll: no extra step animation when it settles. */
    rolled: active,
    stop: () => setRoll(null),
  };
}

/**
 * Three visible positions, turned with the mouse wheel, a vertical swipe or the
 * keyboard. A click (or Enter/Space) opens the exact-entry popup instead.
 */
export function NumberWheel({
  id, label, value, min, max, wrap = true, animated, invalid, describedBy,
  rollId = 0, rollFrom, controls, onOpen, onChange,
}: NumberWheelProps) {
  const labelId = useId();
  const control = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ y: number; moved: boolean } | null>(null);
  const digits = useRef({ text: '', at: 0 });
  const wheel = useRef({ distance: 0, lastStep: -Infinity });
  const [direction, setDirection] = useState(0);
  const { position, rollMax, rolled, stop } = useRoll(value, rollId, rollFrom, animated);

  function change(next: number, amount: number) {
    stop();
    setDirection(Math.sign(amount));
    onChange(next);
  }

  function step(amount: number) {
    change(stepWheel(value, amount, min, max, wrap), amount);
  }

  // React wheel handlers are passive. A native listener prevents scrolling the
  // workspace while the user deliberately turns a wheel, including on trackpads.
  const turnRef = useRef(step);
  useEffect(() => {
    turnRef.current = step;
  });
  useEffect(() => {
    const element = control.current;
    if (!element) return;
    const turn = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const state = wheel.current;
      if (Math.sign(delta) !== Math.sign(state.distance)) state.distance = 0;
      state.distance += delta;
      if (Math.abs(state.distance) < 18 || event.timeStamp - state.lastStep < 90) return;
      const amount = Math.sign(state.distance);
      state.distance = 0;
      state.lastStep = event.timeStamp;
      turnRef.current(amount);
    };
    element.addEventListener('wheel', turn, { passive: false });
    return () => element.removeEventListener('wheel', turn);
  }, []);

  function handleKey(event: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    const amount = steps[event.key];
    if (amount !== undefined) {
      event.preventDefault();
      digits.current.text = '';
      step(amount);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? min : max;
      change(next, next - value);
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
      if (number >= min && number <= max) change(number, number - value);
    }
  }

  let reel;
  if (position !== null) {
    // Odometer: the row below slides up into the slot (or the one above down) as the position advances.
    const base = Math.floor(position + 1e-9);
    const rows = [-1, 0, 1, 2];
    reel = (
      <div
        key="roll"
        className="number-wheel__reel number-wheel__reel--rolling"
        style={{ '--roll-offset': position - base } as CSSProperties}
        aria-hidden="true"
      >
        {rows.map((offset) => (
          <span key={offset} className="number-wheel__row number-wheel__row--rolling">
            {rowLabel(base, offset, min, Math.max(max, rollMax), wrap)}
          </span>
        ))}
      </div>
    );
  } else {
    reel = (
      <div
        key={value}
        className="number-wheel__reel"
        data-animated={animated && !rolled && direction !== 0}
        data-direction={direction}
        aria-hidden="true"
      >
        <span className="number-wheel__row number-wheel__neighbor">{rowLabel(value, -1, min, max, wrap)}</span>
        <span className="number-wheel__row number-wheel__selected">{pad(value)}</span>
        <span className="number-wheel__row number-wheel__neighbor">{rowLabel(value, 1, min, max, wrap)}</span>
      </div>
    );
  }

  return (
    <div className="number-wheel">
      <span className="number-wheel__label" id={labelId}>{label}</span>
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
        aria-controls={controls}
        data-open={controls !== undefined}
        onKeyDown={handleKey}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // Keep focus on the spinbutton (and avoid selecting digits) while dragging.
          event.preventDefault();
          gesture.current = { y: event.clientY, moved: false };
          event.currentTarget.focus({ preventScroll: true });
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (!drag) return;
          const distance = drag.y - event.clientY;
          if (Math.abs(distance) < 24) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.y = event.clientY;
          drag.moved = true;
          step(Math.sign(distance));
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { gesture.current = null; }}
        onPointerLeave={() => { gesture.current = null; }}
        onClick={() => {
          // The click that ends a drag only finishes the turn.
          const dragged = gesture.current?.moved ?? false;
          gesture.current = null;
          if (!dragged) onOpen?.();
        }}
      >
        {reel}
      </div>
    </div>
  );
}
