/**
 * Visual/real scale switch of the third-person view (see `sceneScale.ts`),
 * shown over the view at the top left and styled like the view switch.
 */

import { useI18n } from '../../i18n/context';
import { SCENE_SCALES, type SceneScale } from './sceneScale';

interface ScaleToggleProps {
  readonly scale: SceneScale;
  readonly onChange: (scale: SceneScale) => void;
}

export function ScaleToggle({ scale, onChange }: ScaleToggleProps) {
  const { scale: messages } = useI18n().messages.scene;
  return (
    <div className="scale-toggle" role="group" aria-label={messages.label}>
      <span className="scale-toggle__label" aria-hidden="true">
        {messages.label}
      </span>
      <div className="view-toggle">
        {SCENE_SCALES.map((option) => (
          <button
            key={option}
            type="button"
            className="view-toggle__option"
            aria-pressed={scale === option}
            title={messages.titles[option]}
            onClick={() => onChange(option)}
          >
            {messages.names[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
