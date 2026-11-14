/**
 * "Compass" show/hide switch for the horizon reference (first person:
 * geometric horizon line, ticks and compass labels; third person: horizon
 * plane, grid, compass and angle guides). Shown in the title rule of the
 * local horizon box, left of the first/third-person switch, and styled like
 * it; it applies to both views.
 */

import { useI18n } from '../../i18n/context';

interface CompassToggleProps {
  readonly shown: boolean;
  readonly onChange: (shown: boolean) => void;
}

export function CompassToggle({ shown, onChange }: CompassToggleProps) {
  const { compassToggle } = useI18n().messages.scene;
  return (
    <button
      type="button"
      className="compass-toggle"
      aria-pressed={shown}
      title={shown ? compassToggle.hide : compassToggle.show}
      onClick={() => onChange(!shown)}
    >
      {compassToggle.label}
    </button>
  );
}
