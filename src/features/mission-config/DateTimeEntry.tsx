/**
 * Exact date and time entry: a dropdown under the wheels, drawn like the
 * app's boxes, with one numeric field per wheel. It opens when a wheel is
 * clicked (or Enter/Space pressed on it), with that wheel's field selected.
 *
 * Typing a full field moves to the next one. Enter or "Apply" sets the value
 * if it is a valid date and time in the chosen zone; otherwise the reason is
 * shown and nothing changes. Escape, "Cancel", the close button or a press
 * outside the dropdown leave the wheels as they were.
 *
 * It is a non-modal `role="dialog"` element rather than a native `<dialog>`,
 * so it stays inside the box (and the curved-glass filter) instead of the top
 * layer. It sits inside the configuration `<form>`, so Enter is handled here
 * and never submits the query.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../../i18n/context';
import { DATE_TIME_PARTS, PART_DIGITS, fieldParts, typedPartsToFields, type DateTimePart } from './dateTimeWheel';
import type { DateTimeFields } from './timeZone';

interface DateTimeEntryProps {
  readonly id: string;
  readonly fields: DateTimeFields;
  /** Field selected when the dropdown opens. */
  readonly focusPart: DateTimePart;
  /** Name of the zone the values are typed in, e.g. `UTC` or `Europe/Madrid`. */
  readonly zoneName: string;
  /** Applies the fields; returns an error message instead when they are not a valid instant. */
  readonly onApply: (fields: DateTimeFields) => string | null;
  /** `restoreFocus` is false when the user pressed somewhere else. */
  readonly onClose: (restoreFocus: boolean) => void;
}

const GROUPS: readonly (readonly DateTimePart[])[] = [['day', 'month', 'year'], ['hour', 'minute']];

function initialParts(fields: DateTimeFields): Record<DateTimePart, string> {
  const parts = fieldParts(fields);
  const text = {} as Record<DateTimePart, string>;
  for (const part of DATE_TIME_PARTS) text[part] = String(parts[part]).padStart(PART_DIGITS[part], '0');
  return text;
}

export function DateTimeEntry({ id, fields, focusPart, zoneName, onApply, onClose }: DateTimeEntryProps) {
  const { messages } = useI18n();
  const { config } = messages;
  const titleId = useId();
  const errorId = useId();
  const fieldId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const inputs = useRef<Partial<Record<DateTimePart, HTMLInputElement | null>>>({});
  const [parts, setParts] = useState(() => initialParts(fields));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const input = inputs.current[focusPart];
    input?.focus({ preventScroll: true });
    input?.select();
  }, [focusPart]);

  // A press anywhere else closes the dropdown without applying it.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) closeRef.current(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, []);

  function apply() {
    const next = typedPartsToFields(parts);
    const problem = next ? onApply(next) : config.invalidTime;
    setError(problem);
    if (problem) inputs.current[focusPart]?.focus();
  }

  function handleChange(part: DateTimePart, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, PART_DIGITS[part]);
    setParts((current) => ({ ...current, [part]: digits }));
    setError(null);
    const index = DATE_TIME_PARTS.indexOf(part);
    const following = DATE_TIME_PARTS[index + 1];
    if (digits.length === PART_DIGITS[part] && following) {
      inputs.current[following]?.focus();
      inputs.current[following]?.select();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      apply();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    }
  }

  return (
    <div
      ref={panel}
      id={id}
      className="datetime-entry box"
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
    >
      <div className="box__head">
        <h4 className="box__title" id={titleId}>
          {config.entry.title}
        </h4>
        <span className="box__rule" aria-hidden="true" />
        <button type="button" className="icon-button" onClick={() => onClose(true)} aria-label={messages.common.close} title={messages.common.close}>
          ✕
        </button>
      </div>
      <div className="datetime-entry__fields">
        {GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className={`datetime-entry__group datetime-entry__group--${groupIndex === 0 ? 'date' : 'time'}`}>
            {group.map((part, index) => (
              <div key={part} className="datetime-entry__part">
                {index > 0 && (
                  <span className="datetime-entry__separator" aria-hidden="true">
                    {groupIndex === 0 ? '/' : ':'}
                  </span>
                )}
                <label className="datetime-entry__label" htmlFor={`${fieldId}-${part}`}>
                  {config.wheels[part]}
                </label>
                <input
                  ref={(element) => {
                    inputs.current[part] = element;
                  }}
                  id={`${fieldId}-${part}`}
                  className="text-input datetime-entry__input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint={part === 'minute' ? 'done' : 'next'}
                  maxLength={PART_DIGITS[part]}
                  placeholder={'0'.repeat(PART_DIGITS[part])}
                  value={parts[part]}
                  aria-invalid={error !== null}
                  aria-describedby={errorId}
                  onChange={(event) => handleChange(part, event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <p id={errorId} className={`hint${error ? ' hint--error' : ''}`} aria-live="polite">
        {error ?? config.entry.zone(zoneName)}
      </p>
      <div className="datetime-entry__actions">
        <button type="button" className="text-button" onClick={() => onClose(true)}>
          {config.entry.cancel}
        </button>
        <button type="button" className="text-button datetime-entry__apply" onClick={apply}>
          {config.entry.apply}
        </button>
      </div>
    </div>
  );
}
