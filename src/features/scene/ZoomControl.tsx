/**
 * Map-style zoom control over the local horizon view: "+" on top, a vertical
 * slider from the closest zoom (top) to the widest (bottom), and "−" below.
 * It works on the shared zoom level (0..1, see `zoom.ts`); each view turns the
 * level into a field of view or a camera distance.
 */

import { useI18n } from '../../i18n/context';
import { ZOOM_BUTTON_STEP, clampLevel } from './zoom';

interface ZoomControlProps {
  /** Zoom level, 0 (widest) to 1 (closest). */
  readonly level: number;
  /** What the level means in the current view, e.g. the field of view; read by assistive technology. */
  readonly valueText: string;
  readonly onChange: (level: number) => void;
}

/** Slider resolution; fine enough that dragging looks continuous. */
const SLIDER_STEP = 0.005;

export function ZoomControl({ level, valueText, onChange }: ZoomControlProps) {
  const { zoom } = useI18n().messages.scene;
  const set = (next: number) => onChange(clampLevel(next));
  return (
    <div className="zoom-control" role="group" aria-label={zoom.label}>
      <button
        type="button"
        className="zoom-control__button"
        aria-label={zoom.in}
        title={zoom.in}
        disabled={level >= 1}
        onClick={() => set(level + ZOOM_BUTTON_STEP)}
      >
        +
      </button>
      <input
        type="range"
        className="zoom-control__slider"
        min={0}
        max={1}
        step={SLIDER_STEP}
        value={level}
        aria-label={zoom.slider}
        aria-valuetext={valueText}
        aria-orientation="vertical"
        title={valueText}
        onChange={(event) => set(Number(event.currentTarget.value))}
      />
      <button
        type="button"
        className="zoom-control__button"
        aria-label={zoom.out}
        title={zoom.out}
        disabled={level <= 0}
        onClick={() => set(level - ZOOM_BUTTON_STEP)}
      >
        −
      </button>
    </div>
  );
}
