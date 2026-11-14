/** First/third-person switch shown in the title rule of the local horizon box. */

import { useId } from 'react';
import { useI18n } from '../../i18n/context';
import { VIEW_MODES, type ViewMode } from './viewMode';

interface ViewToggleProps {
  readonly mode: ViewMode;
  readonly firstPersonAvailable: boolean;
  readonly onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, firstPersonAvailable, onChange }: ViewToggleProps) {
  const { messages } = useI18n();
  const { views } = messages.scene;
  const unavailableId = useId();
  return (
    <div className="view-toggle" role="group" aria-label={views.label}>
      <span id={unavailableId} className="visually-hidden">
        {views.firstPersonUnavailable}
      </span>
      {VIEW_MODES.map((option) => {
        const unavailable = option === 'first-person' && !firstPersonAvailable;
        return (
          <button
            key={option}
            type="button"
            className="view-toggle__option"
            aria-pressed={mode === option}
            // aria-disabled keeps the explanation tooltip reachable (disabled buttons get no hover).
            aria-disabled={unavailable}
            aria-describedby={unavailable ? unavailableId : undefined}
            title={unavailable ? views.firstPersonUnavailable : views.names[option]}
            onClick={() => {
              if (!unavailable) onChange(option);
            }}
          >
            <span aria-hidden="true">{views.short[option]}</span>
            <span className="visually-hidden">{views.names[option]}</span>
          </button>
        );
      })}
    </div>
  );
}
