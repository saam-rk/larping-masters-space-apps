/**
 * Opens the horizon playback interval dialog (see `HorizonPlayback`). Shown
 * in the title rule of the local horizon box, before the "Guide" and
 * "Compass" switches, and styled like them; filled while a playback
 * sequence is loaded. On narrow screens it shows a glyph (◷) and keeps its
 * text for assistive technology.
 */

import { useI18n } from '../../i18n/context';

interface IntervalButtonProps {
  /** A playback sequence is loaded or loading. */
  readonly active: boolean;
  readonly disabled: boolean;
  readonly onOpen: () => void;
}

export function IntervalButton({ active, disabled, onOpen }: IntervalButtonProps) {
  const { playback } = useI18n().messages;
  return (
    <button
      type="button"
      className="compass-toggle interval-button"
      aria-haspopup="dialog"
      data-active={active}
      disabled={disabled}
      title={playback.intervalHint}
      onClick={onOpen}
    >
      <span className="toolbar-label">{playback.interval}</span>
      <span className="toolbar-glyph" aria-hidden="true">◷</span>
    </button>
  );
}
