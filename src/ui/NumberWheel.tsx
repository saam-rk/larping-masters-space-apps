import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { stepWheel } from '../features/mission-config/dateTimeWheel';
import { ScrambleText } from './ScrambleText';

interface NumberWheelProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly wrap?: boolean;
  readonly animated: boolean;
  readonly scrambling: boolean;
  readonly invalid: boolean;
  readonly describedBy: string;
  /**
   * Text for each value, for a wheel of named options (e.g. the time zone):
   * values are then indexes, the text is also the accessible value and the
   * wheel label is only read by assistive technology. Numbers are shown with
   * two digits otherwise.
   */
  readonly format?: (value: number) => string;
  readonly onChange: (value: number) => void;
}

/** Three visible positions, with mouse-wheel, swipe, click and keyboard control. */
export function NumberWheel({
  label, value, min, max, wrap = true, animated, scrambling, invalid, describedBy, format, onChange,
}: NumberWheelProps) {
  const labelId = useId();
  const control = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ y: number; moved: boolean } | null>(null);
  const digits = useRef({ text: '', at: 0 });
  const wheel = useRef({ distance: 0, lastStep: -Infinity });
  const [direction, setDirection] = useState(1);
  const previous = stepWheel(value, -1, min, max, wrap);
  const next = stepWheel(value, 1, min, max, wrap);
  const display = (number: number) => (format ? format(number) : String(number).padStart(2, '0'));

  function step(amount: number) {
    setDirection(Math.sign(amount));
    onChange(stepWheel(value, amount, min, max, wrap));
  }

  // React wheel handlers are passive. A native listener prevents scrolling the
  // workspace while the user deliberately turns a wheel, including on trackpads.
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
      setDirection(amount);
      onChange(stepWheel(value, amount, min, max, wrap));
    };
    element.addEventListener('wheel', turn, { passive: false });
    return () => element.removeEventListener('wheel', turn);
  }, [value, min, max, wrap, onChange]);

  function handleKey(event: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    const amount = steps[event.key];
    if (amount !== undefined) {
      event.preventDefault();
      digits.current.text = '';
      step(amount);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      onChange(event.key === 'Home' ? min : max);
    } else if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = performance.now();
      const previousDigits = now - digits.current.at < 1200 ? digits.current.text : '';
      const text = `${previousDigits}${event.key}`.slice(-String(max).length);
      digits.current = { text, at: now };
      const number = Number(text);
      if (number >= min && number <= max) onChange(number);
    }
  }

  return (
    <div className={`number-wheel${format ? ' number-wheel--text' : ''}`}>
      <span className="number-wheel__label" id={labelId}>{label}</span>
      <div
        ref={control}
        className="number-wheel__control"
        role="spinbutton"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuenow={value}
        aria-valuetext={format ? format(value) : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onKeyDown={handleKey}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // Keep focus on the stable spinbutton when a neighboring row is replaced.
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
        onClickCapture={(event) => {
          if (gesture.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
          }
          gesture.current = null;
        }}
      >
        <div
          key={value}
          className="number-wheel__reel"
          data-animated={animated && !scrambling}
          data-direction={direction}
        >
          <button
            type="button"
            className="number-wheel__neighbor"
            tabIndex={-1}
            aria-label={`${label}: ${display(previous)}`}
            disabled={previous === value}
            onClick={() => { control.current?.focus({ preventScroll: true }); step(-1); }}
          >
            {previous !== value ? display(previous) : '\u00a0'}
          </button>
          <span className="number-wheel__selected">
            {animated ? <ScrambleText text={display(value)} active={scrambling} /> : display(value)}
          </span>
          <button
            type="button"
            className="number-wheel__neighbor"
            tabIndex={-1}
            aria-label={`${label}: ${display(next)}`}
            disabled={next === value}
            onClick={() => { control.current?.focus({ preventScroll: true }); step(1); }}
          >
            {next !== value ? display(next) : '\u00a0'}
          </button>
        </div>
      </div>
    </div>
  );
}
