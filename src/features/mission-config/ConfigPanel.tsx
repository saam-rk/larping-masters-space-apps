/**
 * Site and UTC time selection (agreement D-015): the three reference points
 * (shown as a terminal-style radio list with their coordinates), UTC
 * date/time and an update button. Custom coordinates are out of scope for the
 * first demo. Explanations live in each section's help dialog.
 */

import { useId, useState, type FormEvent } from 'react';
import { REFERENCE_SITES } from '../../../shared/sites';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../../shared/time';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';

interface ConfigPanelProps {
  readonly selection: EphemerisSelection;
  readonly loading: boolean;
  /** The selection differs from the data on screen: highlight the update button. */
  readonly stale: boolean;
  readonly onSiteChange: (siteId: EphemerisSelection['siteId']) => void;
  readonly onUtcChange: (utc: string) => void;
  readonly onUpdate: () => void;
}

/** `2026-11-14T12:00:00Z` <-> `2026-11-14T12:00` for `<input type="datetime-local">`, read as UTC. */
function toInputValue(utc: string): string {
  return utc.slice(0, 16);
}

const INPUT_MIN = toInputValue(SUPPORTED_UTC_RANGE.startInclusive);
const INPUT_MAX = '2099-12-31T23:59';

export function ConfigPanel({ selection, loading, stale, onSiteChange, onUtcChange, onUpdate }: ConfigPanelProps) {
  const { locale, messages } = useI18n();
  const siteTitleId = useId();
  const timeFieldId = useId();
  const timeErrorId = useId();
  const [timeInput, setTimeInput] = useState(toInputValue(selection.utc));
  const parsedTime = parseUtcInstant(`${timeInput}Z`);

  function handleTimeChange(value: string) {
    setTimeInput(value);
    const parsed = parseUtcInstant(`${value}Z`);
    if (parsed.ok) onUtcChange(parsed.iso);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (parsedTime.ok) onUpdate();
  }

  return (
    <form className="config" onSubmit={handleSubmit}>
      <Box title={messages.config.site} titleAs="h3" titleId={siteTitleId} help={messages.config.siteInfo}>
        <div className="site-list" role="radiogroup" aria-labelledby={siteTitleId}>
          {REFERENCE_SITES.map((option) => (
            <label key={option.id} className="site-option">
              <input
                type="radio"
                name="reference-site"
                value={option.id}
                checked={selection.siteId === option.id}
                onChange={() => onSiteChange(option.id)}
              />
              <span className="site-option__cursor" aria-hidden="true">
                ►
              </span>
              <span className="site-option__name">{option.name}</span>
              <span className="site-option__coords">
                {formatCoordinates(option.latitudeDeg, option.longitudeEastDeg, locale, messages.hemisphere)}
              </span>
            </label>
          ))}
        </div>
      </Box>

      <Box title={messages.config.utc} titleAs="h3" help={messages.config.utcInfo}>
        <label className="visually-hidden" htmlFor={timeFieldId}>
          {messages.config.utc}
        </label>
        <div className="date-field">
          <span className="date-field__prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            id={timeFieldId}
            type="datetime-local"
            step={60}
            min={INPUT_MIN}
            max={INPUT_MAX}
            value={timeInput}
            aria-invalid={!parsedTime.ok}
            aria-describedby={parsedTime.ok ? undefined : timeErrorId}
            onChange={(event) => handleTimeChange(event.target.value)}
          />
          <span className="date-field__zone">UTC</span>
        </div>
        {!parsedTime.ok && (
          <p id={timeErrorId} className="hint hint--error">
            {messages.config.invalidTime}
          </p>
        )}
      </Box>

      <button
        type="submit"
        className={`button button--primary button--update${stale && !loading ? ' button--attention' : ''}`}
        disabled={loading || !parsedTime.ok}
      >
        {loading ? (
          <>
            {messages.config.updating}
            <span className="blink" aria-hidden="true">
              _
            </span>
          </>
        ) : (
          <>[ {messages.config.update} ]</>
        )}
      </button>
    </form>
  );
}
