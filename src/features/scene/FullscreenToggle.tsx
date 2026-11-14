/**
 * Full-screen switch for the local horizon box (both views), shown in its
 * title rule next to the view switch.
 *
 * Uses the Fullscreen API on the box element, so the title-rule controls
 * (compass, first/third person, help) stay available. See `useFullscreen` for
 * the browsers without it.
 */

import { useI18n } from '../../i18n/context';

interface FullscreenToggleProps {
  readonly active: boolean;
  readonly onToggle: () => void;
}

/** Corner-bracket button: outward corners to enter, inward corners to leave. */
export function FullscreenToggle({ active, onToggle }: FullscreenToggleProps) {
  const { fullscreen } = useI18n().messages.scene;
  const label = active ? fullscreen.exit : fullscreen.enter;
  return (
    <button
      type="button"
      className="fullscreen-toggle"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {active ? (
          <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" />
        ) : (
          <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />
        )}
      </svg>
    </button>
  );
}
