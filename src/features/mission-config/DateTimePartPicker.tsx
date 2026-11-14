/**
 * Exact picker for one part of the date or time (day, month, year, hour or
 * minute): a dropdown under the wheels, drawn like the app's boxes, with a
 * grid of every value the part can take. It opens from the label above a
 * wheel (or Enter/Space/Alt+↓ on the wheel) and only changes that part.
 *
 * Picking a value (click, or Enter/Space on the highlighted one) applies it
 * and closes the dropdown; the wheel then rolls to it. Arrow keys move the
 * highlight across the grid, Home/End go to the first/last value and typing
 * digits jumps to a value. Escape, the close button, a press outside or
 * moving the focus away close it without changes.
 *
 * It is a listbox inside a non-modal element rather than a native `<dialog>`,
 * so it stays inside the box (and the curved-glass filter) instead of the top
 * layer. It sits inside the configuration `<form>`, so Enter is handled here
 * and never submits the query.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '../../i18n/context';

interface DateTimePartPickerProps {
  readonly id: string;
  readonly title: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  /** Values per row of the grid. */
  readonly columns: number;
  /** Content of an option; two-digit numbers by default. */
  readonly format?: (value: number) => ReactNode;
  /** Accessible name of an option when its content is not enough (e.g. the full month name). */
  readonly describe?: (value: number) => string;
  readonly onSelect: (value: number) => void;
  /** `restoreFocus` is false when the user pressed or moved the focus somewhere else. */
  readonly onClose: (restoreFocus: boolean) => void;
}

const TYPING_MS = 1200;

/** The control that opened the dropdown (`aria-controls`) toggles it itself, so pressing or focusing it does not close it. */
function isTrigger(target: EventTarget | null, id: string): boolean {
  return target instanceof Element && target.closest(`[aria-controls="${CSS.escape(id)}"]`) !== null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function DateTimePartPicker({
  id, title, value, min, max, columns, format = pad, describe, onSelect, onClose,
}: DateTimePartPickerProps) {
  const { messages } = useI18n();
  const titleId = useId();
  const optionIdBase = useId();
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [active, setActive] = useState(() => Math.min(max, Math.max(min, value)));
  const optionId = (option: number) => `${optionIdBase}-${option}`;

  useEffect(() => {
    list.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // Keep the highlighted value visible in a scrolling grid (the years),
    // scrolling only the grid, never the panel or the page around it.
    const grid = list.current;
    const option = document.getElementById(`${optionIdBase}-${active}`);
    if (!grid || !option || grid.scrollHeight <= grid.clientHeight) return;
    if (option.offsetTop < grid.scrollTop) grid.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > grid.scrollTop + grid.clientHeight) {
      grid.scrollTop = option.offsetTop + option.offsetHeight - grid.clientHeight;
    }
  }, [active, optionIdBase]);

  // A press anywhere else closes the dropdown without applying it.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || panel.current?.contains(event.target)) return;
      if (!isTrigger(event.target, id)) closeRef.current(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [id]);

  function move(next: number) {
    typed.current.text = '';
    setActive(Math.min(max, Math.max(min, next)));
  }

  function handleKeyDown(event: KeyboardEvent) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const amount = moves[event.key];
    if (amount !== undefined) {
      event.preventDefault();
      move(active + amount);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      move(event.key === 'Home' ? min : max);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    } else if (/^\d$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = performance.now();
      const previous = now - typed.current.at < TYPING_MS ? typed.current.text : '';
      const text = `${previous}${event.key}`.slice(-String(max).length);
      typed.current = { text, at: now };
      const number = Number(text);
      if (number >= min && number <= max) setActive(number);
    }
  }

  const options: number[] = [];
  for (let option = min; option <= max; option += 1) options.push(option);

  return (
    <div
      ref={panel}
      id={id}
      className="datetime-picker box"
      onBlur={(event) => {
        // Focus moved to another control (e.g. Tab); a press outside is handled above.
        const next = event.relatedTarget;
        if (next instanceof Node && !panel.current?.contains(next) && !isTrigger(next, id)) onClose(false);
      }}
    >
      <div className="box__head">
        <h4 className="box__title" id={titleId}>
          {title}
        </h4>
        <span className="box__rule" aria-hidden="true" />
        <button
          type="button"
          className="icon-button"
          onClick={() => onClose(true)}
          aria-label={messages.common.close}
          title={messages.common.close}
        >
          ✕
        </button>
      </div>
      <div
        ref={list}
        className="datetime-picker__grid"
        role="listbox"
        tabIndex={0}
        aria-labelledby={titleId}
        aria-activedescendant={optionId(active)}
        data-scroll={options.length > 60}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        onKeyDown={handleKeyDown}
      >
        {options.map((option) => (
          <div
            key={option}
            id={optionId(option)}
            className="datetime-picker__option"
            role="option"
            aria-selected={option === value}
            aria-label={describe?.(option)}
            data-active={option === active}
            onPointerEnter={() => setActive(option)}
            onClick={() => onSelect(option)}
          >
            {format(option)}
          </div>
        ))}
      </div>
    </div>
  );
}
