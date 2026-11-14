/**
 * Site and UTC time selection (agreement D-015): dropdown with the three
 * reference points, coordinates of the selected one, UTC date/time and an
 * update button. Custom coordinates are out of scope for the first demo.
 */

import { useId, useState, type FormEvent } from 'react';
import { findSite, isSiteId, REFERENCE_SITES } from '../../../shared/sites';
import { parseUtcInstant, SUPPORTED_UTC_RANGE } from '../../../shared/time';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates } from '../../format';
import { useI18n } from '../../i18n/context';

interface ConfigPanelProps {
  readonly selection: EphemerisSelection;
  readonly loading: boolean;
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

export function ConfigPanel({ selection, loading, onSiteChange, onUtcChange, onUpdate }: ConfigPanelProps) {
  const { locale, messages } = useI18n();
  const siteFieldId = useId();
  const timeFieldId = useId();
  const [timeInput, setTimeInput] = useState(toInputValue(selection.utc));
  const parsedTime = parseUtcInstant(`${timeInput}Z`);
  const site = findSite(selection.siteId);

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
    <form className="panel config" onSubmit={handleSubmit}>
      <h2 className="panel__title">{messages.config.heading}</h2>

      <label className="field" htmlFor={siteFieldId}>
        <span className="field__label">{messages.config.site}</span>
        <select
          id={siteFieldId}
          value={selection.siteId}
          onChange={(event) => {
            if (isSiteId(event.target.value)) onSiteChange(event.target.value);
          }}
        >
          {REFERENCE_SITES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span className="field__label">{messages.config.coordinates}</span>
        <span className="field__value">
          {formatCoordinates(site.latitudeDeg, site.longitudeEastDeg, locale, messages.hemisphere)}
        </span>
        <span className="field__hint">{messages.config.siteNote}</span>
      </div>

      <label className="field" htmlFor={timeFieldId}>
        <span className="field__label">{messages.config.utc}</span>
        <input
          id={timeFieldId}
          type="datetime-local"
          step={60}
          min={INPUT_MIN}
          max={INPUT_MAX}
          value={timeInput}
          aria-invalid={!parsedTime.ok}
          onChange={(event) => handleTimeChange(event.target.value)}
        />
        <span className="field__hint">{parsedTime.ok ? messages.config.utcHint : messages.config.invalidTime}</span>
      </label>

      <button type="submit" className="button" disabled={loading || !parsedTime.ok}>
        {loading ? messages.config.updating : messages.config.update}
      </button>
    </form>
  );
}
