import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

interface WheelSelectProps {
  /** Visible label above the control. */
  readonly label: string;
  /** Text shown while nothing is chosen. */
  readonly placeholder: string;
  readonly options: readonly string[];
  /** Index of the chosen option, or null. */
  readonly value: number | null;
  readonly describedBy?: string;
  readonly onChange: (index: number) => void;
}

/**
 * Drop-down list styled like the date and time wheels: the closed control is
 * the wheels' illuminated slot, and the open list is the same framed panel
 * with the active row lit. ARIA "select-only combobox" pattern: arrows,
 * Home/End, Enter/Space to choose, Escape to close; a click outside closes.
 * Long lists scroll, keeping the active row in view.
 */
export function WheelSelect({ label, placeholder, options, value, describedBy, onChange }: WheelSelectProps) {
  const labelId = useId();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value ?? 0);
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Not implemented by every environment (jsdom).
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  function show() {
    setActive(value ?? 0);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(index);
    setOpen(false);
  }

  function handleKey(event: KeyboardEvent) {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => Math.min(last, active + 1),
      ArrowUp: () => Math.max(0, active - 1),
      Home: () => 0,
      End: () => last,
    };
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setActive(move());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      setOpen(false);
    }
  }

  const chosen = value === null ? null : (options[value] ?? null);

  return (
    <div className="wheel-select" ref={root}>
      <span className="search-field__label" id={labelId}>
        {label}
      </span>
      <div className="wheel-select__frame">
        <button
          type="button"
          className="wheel-select__trigger"
          role="combobox"
          aria-labelledby={labelId}
          aria-controls={listId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={open ? optionId(active) : undefined}
          aria-describedby={describedBy}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={handleKey}
        >
          <span className={chosen === null ? 'wheel-select__value wheel-select__value--empty' : 'wheel-select__value'}>
            {chosen ?? placeholder}
          </span>
          <span className="wheel-select__caret" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        </button>
        <ul className="wheel-select__list" id={listId} role="listbox" aria-labelledby={labelId} hidden={!open}>
          {options.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              role="option"
              className="wheel-select__option"
              aria-selected={index === value}
              data-active={index === active}
              onPointerEnter={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
