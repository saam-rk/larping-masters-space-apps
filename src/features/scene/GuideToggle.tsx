/**
 * "Guide" show/hide switch for the straight paths toward the Sun and the
 * Earth, in both views (see `SkyScene`): in third person the dashed line
 * from the observer to each body and its azimuth and elevation guides; in
 * first person a line on the ground along each body's azimuth and an arc up
 * to it. Shown in the title rule of the local horizon box, beside the
 * "Compass" switch, and styled like it. On narrow screens it shows a glyph
 * (↗) and keeps its text for assistive technology.
 */

import { useI18n } from '../../i18n/context';

interface GuideToggleProps {
  readonly shown: boolean;
  readonly onChange: (shown: boolean) => void;
}

export function GuideToggle({ shown, onChange }: GuideToggleProps) {
  const { guideToggle } = useI18n().messages.scene;
  return (
    <button
      type="button"
      className="compass-toggle"
      aria-pressed={shown}
      title={shown ? guideToggle.hide : guideToggle.show}
      onClick={() => onChange(!shown)}
    >
      <span className="toolbar-label">{guideToggle.label}</span>
      <span className="toolbar-glyph" aria-hidden="true">↗</span>
    </button>
  );
}
