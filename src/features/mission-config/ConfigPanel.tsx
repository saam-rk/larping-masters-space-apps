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

import { useId, useState, type FormEvent } from 'react';
import { CUSTOM_SITE_ID, findSite, REFERENCE_SITES, type SiteId } from '../../../shared/sites';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates } from '../../format';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Box } from '../../ui/Box';
import { NumberWheel } from '../../ui/NumberWheel';
import { formatCoordinateQuery, parseCoordinateQuery, type CoordinateQuery } from './coordinateQuery';
import { DateTimeEntry } from './DateTimeEntry';
import {
  changeDatePart,
  changeTimePart,
  currentUtcMinute,
  daysInMonth,
  fieldParts,
  MAX_YEAR,
  MIN_YEAR,
  type DateTimePart,
} from './dateTimeWheel';
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
  const wheelHintId = useId();
  const wheelIdBase = useId();
  const entryId = useId();
  const [searchInput, setSearchInput] = useState(() =>
    formatCoordinateQuery(selection.latitudeDeg, selection.longitudeEastDeg),
  );
  const [zone, setZone] = useState<TimeZoneMode>('utc');
  const [fields, setFields] = useState<DateTimeFields>(() => utcToFields(selection.utc, 'utc'));
  /** LIVE and the exact entry roll every wheel from `from` to the new fields. */
  const [roll, setRoll] = useState<{ id: number; from: DateTimeFields }>(() => ({ id: 0, from: fields }));
  const [entryPart, setEntryPart] = useState<DateTimePart | null>(null);
  const { day, month, year, hour, minute } = fieldParts(fields);
  const rollFrom = fieldParts(roll.from);
  const query = parseCoordinateQuery(searchInput);
  const parsedTime = fieldsToUtc(fields, zone, selection.utc);
  const custom = selection.siteId === CUSTOM_SITE_ID;
  const valid = parsedTime.ok && isUsable(query);
  const canUpdate = valid && !loading;

  const wheelId = (part: DateTimePart) => `${wheelIdBase}-${part}`;

  /** Sets every wheel at once; with effects on, each one rolls to its new value. */
  function rollTo(next: DateTimeFields) {
    if (animated) setRoll((current) => ({ id: current.id + 1, from: fields }));
    setFields(next);
  }

  function handleLive() {
    const utc = currentUtcMinute();
    setEntryPart(null);
    rollTo(utcToFields(utc, zone));
    onUtcChange(utc);
  }

  function handleEntryApply(next: DateTimeFields): string | null {
    const parsed = fieldsToUtc(next, zone, selection.utc);
    if (!parsed.ok) return parsed.reason === 'nonexistent-local-time' ? config.nonexistentTime : config.invalidTime;
    const part = entryPart;
    setEntryPart(null);
    rollTo(next);
    onUtcChange(parsed.iso);
    if (part) document.getElementById(wheelId(part))?.focus({ preventScroll: true });
    return null;
  }

  function handleEntryClose(restoreFocus: boolean) {
    const part = entryPart;
    setEntryPart(null);
    if (restoreFocus && part) document.getElementById(wheelId(part))?.focus({ preventScroll: true });
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
    setEntryPart(null);
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
                  id={wheelId(part)}
                  label={config.wheels[part]}
                  value={value}
                  min={min}
                  max={max}
                  wrap={part !== 'year'}
                  animated={animated}
                  invalid={!parsedTime.ok}
                  describedBy={`${timeHintId} ${wheelHintId}`}
                  rollId={roll.id}
                  rollFrom={rollFrom[part]}
                  controls={entryPart ? entryId : undefined}
                  onOpen={() => setEntryPart(part)}
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
                  id={wheelId(part)}
                  label={config.wheels[part]}
                  value={value}
                  min={0}
                  max={max}
                  animated={animated}
                  invalid={!parsedTime.ok}
                  describedBy={`${timeHintId} ${wheelHintId}`}
                  rollId={roll.id}
                  rollFrom={rollFrom[part]}
                  controls={entryPart ? entryId : undefined}
                  onOpen={() => setEntryPart(part)}
                  onChange={(value) => handleFieldsChange({ time: changeTimePart(fields, index, value) })}
                />
              ))}
            </div>
          </div>
          <span id={wheelHintId} className="visually-hidden">
            {config.wheelEntryHint}
          </span>
          {entryPart && (
            <DateTimeEntry
              id={entryId}
              fields={fields}
              focusPart={entryPart}
              zoneName={zone === 'utc' ? 'UTC' : (localZoneId() ?? localOffsetLabel(selection.utc))}
              onApply={handleEntryApply}
              onClose={handleEntryClose}
            />
          )}
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
