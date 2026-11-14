/**
 * Site and time selection: the three reference points (a terminal-style
 * radio list with their coordinates), a search box for custom coordinates or
 * a point name (filled in when a reference point is picked), separate date
 * and time fields with a time zone selector (UTC, the time NASA uses for
 * launches, or the browser's local zone) and the update button. Explanations
 * live in each section's help dialog.
 *
 * The update button is available for any valid selection while idle,
 * including the saved sample and retries of the same case. Once a complete live
 * result for the current selection is on screen it reads "Updated" (still
 * pressable to query again).
 */

import { useEffect, useId, useState, type FormEvent } from 'react';
import { CUSTOM_SITE_ID, findSite, REFERENCE_SITES, type SiteId } from '../../../shared/sites';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates } from '../../format';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Box } from '../../ui/Box';
import { NumberWheel } from '../../ui/NumberWheel';
import { formatCoordinateQuery, parseCoordinateQuery, type CoordinateQuery } from './coordinateQuery';
import { changeDatePart, changeTimePart, currentUtcMinute, daysInMonth, MAX_YEAR, MIN_YEAR } from './dateTimeWheel';
import {
  fieldsToUtc,
  formatUtcMinute,
  localOffsetLabel,
  localZoneId,
  utcToFields,
  type DateTimeFields,
  type TimeZoneMode,
} from './timeZone';

interface ConfigPanelProps {
  readonly selection: EphemerisSelection;
  readonly loading: boolean;
  /** A complete live result matching the selection is on screen. */
  readonly upToDate: boolean;
  readonly onSiteChange: (siteId: SiteId) => void;
  readonly onCoordinatesChange: (latitudeDeg: number, longitudeEastDeg: number) => void;
  readonly onUtcChange: (utc: string) => void;
  readonly onUpdate: () => void;
}

function isUsable(query: CoordinateQuery): boolean {
  return query.kind === 'coordinates' || query.kind === 'site';
}

export function ConfigPanel({
  selection,
  loading,
  upToDate,
  onSiteChange,
  onCoordinatesChange,
  onUtcChange,
  onUpdate,
}: ConfigPanelProps) {
  const { locale, messages } = useI18n();
  const { preferences, configured } = usePreferences();
  const animated = configured && preferences.effects === 'on' && !prefersReducedMotion();
  const { config } = messages;
  const siteTitleId = useId();
  const searchFieldId = useId();
  const searchHintId = useId();
  const dateFieldId = useId();
  const timeFieldId = useId();
  const zoneFieldId = useId();
  const timeHintId = useId();
  const [searchInput, setSearchInput] = useState(() =>
    formatCoordinateQuery(selection.latitudeDeg, selection.longitudeEastDeg),
  );
  const [zone, setZone] = useState<TimeZoneMode>('utc');
  const [fields, setFields] = useState<DateTimeFields>(() => utcToFields(selection.utc, 'utc'));
  const [livePulse, setLivePulse] = useState(0);
  const [scrambling, setScrambling] = useState(false);
  const [year, month, day] = fields.date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = fields.time.split(':').map(Number) as [number, number];
  const query = parseCoordinateQuery(searchInput);
  const parsedTime = fieldsToUtc(fields, zone, selection.utc);
  const custom = selection.siteId === CUSTOM_SITE_ID;
  const valid = parsedTime.ok && isUsable(query);
  const canUpdate = valid && !loading;

  useEffect(() => {
    if (livePulse === 0) return;
    const timer = window.setTimeout(() => setScrambling(false), 330);
    return () => window.clearTimeout(timer);
  }, [livePulse]);

  function handleLive() {
    const utc = currentUtcMinute();
    setFields(utcToFields(utc, zone));
    onUtcChange(utc);
    if (animated) {
      setScrambling(true);
      setLivePulse((pulse) => pulse + 1);
    }
  }

  function handlePresetChange(siteId: SiteId) {
    const site = findSite(siteId);
    setSearchInput(formatCoordinateQuery(site.latitudeDeg, site.longitudeEastDeg));
    onSiteChange(siteId);
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    const next = parseCoordinateQuery(value);
    if (next.kind === 'coordinates') onCoordinatesChange(next.latitudeDeg, next.longitudeEastDeg);
    else if (next.kind === 'site') onSiteChange(next.siteId);
  }

  /** A name search resolves to the point's coordinates once the box is left. */
  function settleSearch() {
    if (query.kind !== 'site') return;
    const site = findSite(query.siteId);
    setSearchInput(formatCoordinateQuery(site.latitudeDeg, site.longitudeEastDeg));
  }

  function handleFieldsChange(change: Partial<DateTimeFields>) {
    const next = { ...fields, ...change };
    setFields(next);
    const parsed = fieldsToUtc(next, zone, selection.utc);
    if (parsed.ok) onUtcChange(parsed.iso);
  }

  /** Switching zones keeps the same instant: the fields are rewritten in the new zone. */
  function handleZoneChange(next: TimeZoneMode) {
    if (parsedTime.ok) setFields(utcToFields(parsedTime.iso, next));
    setZone(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    settleSearch();
    if (canUpdate) onUpdate();
  }

  let searchHint: { text: string; error: boolean } | null = null;
  if (query.kind === 'empty') searchHint = { text: config.searchErrors.empty, error: true };
  else if (query.kind === 'invalid') searchHint = { text: config.searchErrors[query.reason], error: true };
  else if (query.kind === 'ambiguous') {
    searchHint = { text: config.searchErrors.ambiguous(query.matches.map((site) => site.name).join(', ')), error: true };
  } else if (custom) {
    const coordinates = formatCoordinates(selection.latitudeDeg, selection.longitudeEastDeg, locale, messages.hemisphere);
    searchHint = { text: config.searchReading(coordinates), error: false };
  }

  let timeHint: { text: string; error: boolean };
  if (!parsedTime.ok) {
    const nonexistent = parsedTime.reason === 'nonexistent-local-time';
    timeHint = { text: nonexistent ? config.nonexistentTime : config.invalidTime, error: true };
  } else if (zone === 'local') {
    timeHint = {
      text: config.zoneLocalHint(localOffsetLabel(parsedTime.iso), formatUtcMinute(parsedTime.iso)),
      error: false,
    };
  } else {
    timeHint = { text: config.zoneUtcHint, error: false };
  }

  let buttonClass = 'button button--update';
  let buttonLabel = <>[ {config.update} ]</>;
  if (loading) {
    buttonClass += ' button--busy';
    buttonLabel = (
      <>
        {config.updating}
        <span className="blink" aria-hidden="true">
          _
        </span>
      </>
    );
  } else if (canUpdate && upToDate) {
    buttonClass += ' button--done';
    buttonLabel = (
      <>
        <span aria-hidden="true">✓ </span>
        {config.upToDate}
      </>
    );
  } else if (canUpdate) {
    buttonClass += ' button--go';
  } else {
    buttonClass += ' button--idle';
  }

  return (
    <form className="config" onSubmit={handleSubmit}>
      <Box
        title={config.site}
        titleAs="h3"
        titleId={siteTitleId}
        help={config.siteInfo}
        tag={custom ? `[${config.customTag}]` : undefined}
        tagTone="warning"
      >
        <div className="site-list" role="radiogroup" aria-labelledby={siteTitleId}>
          {REFERENCE_SITES.map((option) => (
            <label key={option.id} className="site-option">
              <input
                type="radio"
                name="reference-site"
                value={option.id}
                checked={selection.siteId === option.id}
                onChange={() => handlePresetChange(option.id)}
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

        <label className="search-field__label" htmlFor={searchFieldId}>
          {config.search}
        </label>
        <div className="search-field">
          <span className="search-field__prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            id={searchFieldId}
            type="search"
            className="text-input"
            inputMode="text"
            enterKeyHint="go"
            autoComplete="off"
            spellCheck={false}
            placeholder={config.searchPlaceholder}
            value={searchInput}
            aria-invalid={searchHint?.error ?? false}
            aria-describedby={searchHint ? searchHintId : undefined}
            onChange={(event) => handleSearchChange(event.target.value)}
            onBlur={settleSearch}
          />
        </div>
        {searchHint && (
          <p id={searchHintId} className={`hint${searchHint.error ? ' hint--error' : ''}`}>
            {searchHint.text}
          </p>
        )}
      </Box>

      <Box
        title={config.dateTime}
        className="datetime-box"
        titleAs="h3"
        help={config.dateTimeInfo}
        actions={<button type="button" className="text-button" onClick={handleLive} title={config.liveHint}>{config.live}</button>}
      >
        <div className="datetime">
          <div className="datetime__field" role="group" aria-labelledby={dateFieldId}>
            <span className="search-field__label" id={dateFieldId}>
              {config.date}
            </span>
            <div className="datetime__wheels datetime__wheels--date">
              {([
                { part: 'day', value: day, min: 1, max: daysInMonth(year, month) },
                { part: 'month', value: month, min: 1, max: 12 },
                { part: 'year', value: year, min: MIN_YEAR, max: MAX_YEAR },
              ] as const).map(({ part, value, min, max }) => (
                <NumberWheel
                  key={part}
                  label={config.wheels[part]}
                  value={value}
                  min={min}
                  max={max}
                  wrap={part !== 'year'}
                  animated={animated}
                  scrambling={scrambling}
                  invalid={!parsedTime.ok}
                  describedBy={timeHintId}
                  onChange={(value) => handleFieldsChange({ date: changeDatePart(fields.date, part, value) })}
                />
              ))}
            </div>
          </div>
          <div className="datetime__field" role="group" aria-labelledby={timeFieldId}>
            <span className="search-field__label" id={timeFieldId}>
              {config.time}
            </span>
            <div className="datetime__wheels datetime__wheels--time">
              {([
                { part: 'hour', value: hour, index: 0, max: 23 },
                { part: 'minute', value: minute, index: 1, max: 59 },
              ] as const).map(({ part, value, index, max }) => (
                <NumberWheel
                  key={part}
                  label={config.wheels[part]}
                  value={value}
                  min={0}
                  max={max}
                  animated={animated}
                  scrambling={scrambling}
                  invalid={!parsedTime.ok}
                  describedBy={timeHintId}
                  onChange={(value) => handleFieldsChange({ time: changeTimePart(fields, index, value) })}
                />
              ))}
            </div>
          </div>
        </div>

        <label className="search-field__label" htmlFor={zoneFieldId}>
          {config.timeZone}
        </label>
        <select
          id={zoneFieldId}
          className="text-input select-input"
          value={zone}
          onChange={(event) => handleZoneChange(event.target.value as TimeZoneMode)}
        >
          <option value="utc">{config.zoneUtc}</option>
          <option value="local">{config.zoneLocal(localZoneId() ?? localOffsetLabel(selection.utc))}</option>
        </select>
        <p id={timeHintId} className={`hint${timeHint.error ? ' hint--error' : ''}`}>
          {timeHint.text}
        </p>
      </Box>

      <button type="submit" className={buttonClass} disabled={!canUpdate} aria-busy={loading}>
        {buttonLabel}
      </button>
    </form>
  );
}
