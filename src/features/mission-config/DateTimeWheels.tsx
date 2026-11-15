/**
 * Date and time wheels: day, month and year, then hour and minute. The label
 * above a date wheel (or Enter on it) opens that part's exact picker
 * (`DateTimePartPicker`); hour and minute are only set with their wheels.
 *
 * Used by the site and time form (`ConfigPanel`, with its time zone wheel
 * beside it) and by the horizon playback interval (UTC). The owner keeps the
 * fields; every change reports the whole new value. A change that does not
 * come from these wheels (e.g. "Live" or another time zone) closes an open
 * picker.
 */

import { useId, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { NumberWheel } from '../../ui/NumberWheel';
import { DateTimePartPicker } from './DateTimePartPicker';
import {
  changeDatePart,
  changeTimePart,
  daysInMonth,
  fieldParts,
  MAX_YEAR,
  MIN_YEAR,
  type DatePart,
  type DateTimePart,
  type TimePart,
} from './dateTimeWheel';
import type { DateTimeFields } from './timeZone';

interface DateTimeWheelsProps {
  readonly fields: DateTimeFields;
  readonly onChange: (fields: DateTimeFields) => void;
  /** Marks every wheel invalid (the fields do not form a usable instant). */
  readonly invalid: boolean;
  readonly animated: boolean;
  /** id of a hint read with every wheel (e.g. the time zone note). */
  readonly describedBy?: string;
}

/** Range of each wheel and the layout of its exact picker. */
interface WheelSpec<Part extends DateTimePart = DateTimePart> {
  readonly part: Part;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly wrap: boolean;
  /** Values per row in the exact picker, or null when the part is only set with its wheel (hour, minute). */
  readonly columns: number | null;
}

function wheelSpecs(parts: Record<DateTimePart, number>): {
  readonly date: readonly WheelSpec<DatePart>[];
  readonly time: readonly WheelSpec<TimePart>[];
} {
  const { day, month, year, hour, minute } = parts;
  return {
    date: [
      { part: 'day', value: day, min: 1, max: daysInMonth(year, month), wrap: true, columns: 7 },
      { part: 'month', value: month, min: 1, max: 12, wrap: true, columns: 4 },
      { part: 'year', value: year, min: MIN_YEAR, max: MAX_YEAR, wrap: false, columns: 5 },
    ],
    time: [
      { part: 'hour', value: hour, min: 0, max: 23, wrap: true, columns: null },
      { part: 'minute', value: minute, min: 0, max: 59, wrap: true, columns: null },
    ],
  };
}

function isDatePart(part: DateTimePart): part is DatePart {
  return part === 'day' || part === 'month' || part === 'year';
}

const TIME_INDEX: Record<TimePart, 0 | 1> = { hour: 0, minute: 1 };

export function DateTimeWheels({ fields, onChange, invalid, animated, describedBy }: DateTimeWheelsProps) {
  const { locale, messages } = useI18n();
  const { config } = messages;
  const dateFieldId = useId();
  const timeFieldId = useId();
  const wheelHintId = useId();
  const wheelIdBase = useId();
  const pickerId = useId();
  /** Date part whose exact picker is open; the time is only set with its wheels. */
  const [pickerPart, setPickerPart] = useState<DatePart | null>(null);
  // Fields this component reported last; any other new value came from outside.
  const [emitted, setEmitted] = useState(fields);
  const [shown, setShown] = useState(fields);
  if (shown !== fields) {
    setShown(fields);
    if (fields !== emitted) setPickerPart(null);
  }
  const wheels = wheelSpecs(fieldParts(fields));
  const pickerWheel = wheels.date.find((wheel) => wheel.part === pickerPart);
  const wheelId = (part: DateTimePart) => `${wheelIdBase}-${part}`;

  function emit(next: DateTimeFields) {
    setEmitted(next);
    onChange(next);
  }

  function handlePartChange(part: DateTimePart, value: number) {
    if (isDatePart(part)) emit({ ...fields, date: changeDatePart(fields.date, part, value) });
    else emit({ ...fields, time: changeTimePart(fields, TIME_INDEX[part], value) });
  }

  /** The label above a date wheel toggles that part's picker. */
  function togglePicker(part: DatePart) {
    setPickerPart((current) => (current === part ? null : part));
  }

  function closePicker(restoreFocus: boolean) {
    const part = pickerPart;
    setPickerPart(null);
    if (restoreFocus && part) document.getElementById(wheelId(part))?.focus({ preventScroll: true });
  }

  function handlePickerSelect(value: number) {
    if (!pickerPart) return;
    handlePartChange(pickerPart, value);
    closePicker(true);
  }

  const monthName = (style: 'short' | 'long') => (month: number) =>
    new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 1)));
  /** Month options show the number and the short name, e.g. "02 feb". */
  const formatMonth = (month: number) => (
    <>
      <span className="datetime-picker__month-number">{String(month).padStart(2, '0')}</span>
      <span className="datetime-picker__month-name">{monthName('short')(month).replace('.', '')}</span>
    </>
  );

  return (
    <div className="datetime">
      {(['date', 'time'] as const).map((group) => (
        <div
          key={group}
          className="datetime__field"
          role="group"
          aria-labelledby={group === 'date' ? dateFieldId : timeFieldId}
        >
          <span className="search-field__label" id={group === 'date' ? dateFieldId : timeFieldId}>
            {group === 'date' ? config.date : config.time}
          </span>
          <div className={`datetime__wheels datetime__wheels--${group}`}>
            {wheels[group].map(({ part, value, min, max, wrap, columns }) => {
              // Hour and minute have no exact picker: they are only set with their wheels.
              const pickable = isDatePart(part) && columns !== null;
              const hints = [describedBy, pickable ? wheelHintId : undefined].filter(Boolean).join(' ');
              return (
                <NumberWheel
                  key={part}
                  id={wheelId(part)}
                  label={config.wheels[part]}
                  value={value}
                  min={min}
                  max={max}
                  wrap={wrap}
                  animated={animated}
                  invalid={invalid}
                  describedBy={hints}
                  open={pickable && pickerPart === part}
                  popupId={pickable ? pickerId : undefined}
                  onOpen={pickable ? () => togglePicker(part) : undefined}
                  onChange={(next) => handlePartChange(part, next)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <span id={wheelHintId} className="visually-hidden">
        {config.wheelPickerHint}
      </span>
      {pickerWheel && pickerWheel.columns !== null && (
        <DateTimePartPicker
          key={pickerWheel.part}
          id={pickerId}
          title={config.picker[pickerWheel.part]}
          value={pickerWheel.value}
          min={pickerWheel.min}
          max={pickerWheel.max}
          columns={pickerWheel.columns}
          format={pickerWheel.part === 'month' ? formatMonth : undefined}
          describe={pickerWheel.part === 'month' ? monthName('long') : undefined}
          onSelect={handlePickerSelect}
          onClose={closePicker}
        />
      )}
    </div>
  );
}
