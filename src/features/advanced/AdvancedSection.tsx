/**
 * "Advanced mode" section of the control column: one box that groups the
 * tools meant for experienced users (inverse search, mission feasibility
 * screening and scenario comparison), below the basic site and time
 * controls. It starts closed, so a first visit only shows the basic flow;
 * the closed box names the tools inside and a switch in its title rule opens
 * it. The choice is a display preference (see `preferences.ts`), remembered
 * in the preferences cookie.
 *
 * The tools stay mounted while the section is closed (`hidden`, not
 * unmounted): their fields, results, compared scenarios and a running search
 * survive closing and reopening, like the windows they open (see `Modal`).
 */

import { useId, type ReactNode } from 'react';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { Box } from '../../ui/Box';

interface AdvancedSectionProps {
  /** The advanced tools, each in its own box. */
  readonly children: ReactNode;
}

export function AdvancedSection({ children }: AdvancedSectionProps) {
  const { messages } = useI18n();
  const text = messages.advanced;
  const { preferences, update } = usePreferences();
  const open = preferences.advanced;
  const titleId = useId();
  const toolsId = useId();
  const toolNames = [messages.skySearch.heading, messages.mission.heading, messages.compare.heading];

  return (
    <Box
      title={text.heading}
      titleAs="h2"
      titleId={titleId}
      className={open ? 'advanced advanced--open' : 'advanced'}
      help={text.info}
      actions={
        <button
          type="button"
          className="compass-toggle advanced__toggle"
          aria-expanded={open}
          aria-controls={toolsId}
          onClick={() => update({ advanced: !open })}
        >
          {open ? text.hide : text.show}
          {/* The visible verb plus its object, for assistive technology: "Show advanced mode tools". */}
          <span className="visually-hidden"> {text.toggleTarget}</span>
          <span className="advanced__chevron" aria-hidden="true">
            {open ? '▴' : '▾'}
          </span>
        </button>
      }
    >
      {!open && (
        <div className="advanced__summary">
          <p className="advanced__intro">{text.intro}</p>
          <ul className="advanced__names">
            {toolNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      <div id={toolsId} className="advanced__tools" role="group" aria-labelledby={titleId} hidden={!open}>
        {children}
      </div>
    </Box>
  );
}
