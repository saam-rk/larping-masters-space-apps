/**
 * Site and time selection: one drop-down with every reference point (the
 * three featured demo points first, then the others in alphabetical order), a
 * search box for custom coordinates or a point name or code (filled in with
 * the coordinates when a reference point is picked), date and time wheels with a time zone wheel
 * (UTC, the time NASA uses for launches, or the browser's local zone) and the
 * update button. Explanations live in each section's help dialog.
 *
 * The update button can be rendered elsewhere in the page (`updateTarget`, the
 * top of the view column in `App`) through a portal; it stays associated with
 * this form through its `form` attribute, so it still submits it and Enter in
 * the search box still triggers it.
 *
 * The update button is available for valid selections while idle unless a
 * complete live result already matches the selected coordinates and UTC instant.
 * It then reads "Updated" and stays disabled until the point or date/time changes
 * (D-020). Saved samples, failed requests and partial results remain retryable.
 */

import { useId, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CUSTOM_SITE_ID, FEATURED_SITES, findSite, MORE_SITES, siteCode, type SiteId } from '../../../shared/sites';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates } from '../../format';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Box } from '../../ui/Box';
import { NumberWheel } from '../../ui/NumberWheel';
import { WheelSelect } from '../../ui/WheelSelect';
import { formatCoordinateQuery, parseCoordinateQuery, type CoordinateQuery } from './coordinateQuery';
import { DateTimePartPicker } from './DateTimePartPicker';
import {
  changeDatePart,
  changeTimePart,
  currentUtcMinute,
  daysInMonth,
  fieldParts,
  MAX_YEAR,
  MIN_YEAR,
  type DatePart,
  type DateTimePart,
  type TimePart,
} from './dateTimeWheel';
import {
  fieldsToUtc,
  formatUtcMinute,
  localOffsetLabel,
  localZoneId,
  TIME_ZONE_MODES,
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
  /** Element where the update button is rendered; inside the form when absent. */
  readonly updateTarget?: HTMLElement | null;
}

/** Names listed in the "several points match" hint before it is cut short. */
const MAX_AMBIGUOUS_NAMES = 6;

function isUsable(query: CoordinateQuery): boolean {
  return query.kind === 'coordinates' || query.kind === 'site';
}

/** Range of each wheel and the layout of its exact picker. */
interface WheelSpec<Part extends DateTimePart = DateTimePart> {
  readonly part: Part;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly wrap: boolean;
  /** Values per row in the exact picker, or null when the part is only set with its wheel (hour, minute). */
  readonly columns: number | null;
}

function wheelSpecs(parts: Record<DateTimePart, number>): {
  readonly date: readonly WheelSpec<DatePart>[];
  readonly time: readonly WheelSpec<TimePart>[];
} {
  const { day, month, year, hour, minute } = parts;
  return {
    date: [
      { part: 'day', value: day, min: 1, max: daysInMonth(year, month), wrap: true, columns: 7 },
      { part: 'month', value: month, min: 1, max: 12, wrap: true, columns: 4 },
      { part: 'year', value: year, min: MIN_YEAR, max: MAX_YEAR, wrap: false, columns: 5 },
    ],
    time: [
      { part: 'hour', value: hour, min: 0, max: 23, wrap: true, columns: null },
      { part: 'minute', value: minute, min: 0, max: 59, wrap: true, columns: null },
    ],
  };
}

function isDatePart(part: DateTimePart): part is DatePart {
  return part === 'day' || part === 'month' || part === 'year';
}

const TIME_INDEX: Record<TimePart, 0 | 1> = { hour: 0, minute: 1 };

export function ConfigPanel({
  selection,
  loading,
  upToDate,
  onSiteChange,
  onCoordinatesChange,
  onUtcChange,
  onUpdate,
  updateTarget,
}: ConfigPanelProps) {
  const { locale, messages } = useI18n();
  const { preferences, configured } = usePreferences();
  const animated = configured && preferences.effects === 'on' && !prefersReducedMotion();
  const { config } = messages;
  const formId = useId();
  const siteTitleId = useId();
  const searchFieldId = useId();
  const searchHintId = useId();
  const dateFieldId = useId();
  const timeFieldId = useId();
  const zoneFieldId = useId();
  const timeHintId = useId();
  const siteListHintId = useId();
  const listedSites = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: 'base' });
    return [...FEATURED_SITES, ...[...MORE_SITES].sort((a, b) => collator.compare(a.name, b.name))];
  }, [locale]);
  const listedIndex = listedSites.findIndex((site) => site.id === selection.siteId);
  const siteOptions = useMemo(
    () =>
      listedSites.map((site) => {
        const code = siteCode(site);
        return code ? `${site.name} · ${code}` : site.name;
      }),
    [listedSites],
  );
  const wheelHintId = useId();
  const wheelIdBase = useId();
  const pickerId = useId();
  const [searchInput, setSearchInput] = useState(() =>
    formatCoordinateQuery(selection.latitudeDeg, selection.longitudeEastDeg),
  );
  const [zone, setZone] = useState<TimeZoneMode>('utc');
  const [fields, setFields] = useState<DateTimeFields>(() => utcToFields(selection.utc, 'utc'));
  /** Date part whose exact picker is open; the time is only set with its wheels. */
  const [pickerPart, setPickerPart] = useState<DatePart | null>(null);
  // Follow instants chosen outside this panel (an inverse search match): when
  // the selected instant changes and the fields do not already show it, the
  // fields are rewritten (to the minute) and the wheels roll to it.
  const [followedUtc, setFollowedUtc] = useState(selection.utc);
  if (selection.utc !== followedUtc) {
    setFollowedUtc(selection.utc);
    const shown = fieldsToUtc(fields, zone, followedUtc);
    if (!shown.ok || shown.iso !== selection.utc) {
      setFields(utcToFields(selection.utc, zone));
      setPickerPart(null);
    }
  }
  const wheels = wheelSpecs(fieldParts(fields));
  const pickerWheel = wheels.date.find((wheel) => wheel.part === pickerPart);
  const query = parseCoordinateQuery(searchInput);
  const parsedTime = fieldsToUtc(fields, zone, selection.utc);
  const custom = selection.siteId === CUSTOM_SITE_ID;
  const valid = parsedTime.ok && isUsable(query);
  const canUpdate = valid && !loading && !upToDate;

  const wheelId = (part: DateTimePart) => `${wheelIdBase}-${part}`;

  /** Sets every wheel at once; with effects on, each wheel rolls to its new value by itself. */
  function handleLive() {
    const utc = currentUtcMinute();
    setPickerPart(null);
    setFields(utcToFields(utc, zone));
    onUtcChange(utc);
  }

  function handlePartChange(part: DateTimePart, value: number) {
    if (isDatePart(part)) handleFieldsChange({ date: changeDatePart(fields.date, part, value) });
    else handleFieldsChange({ time: changeTimePart(fields, TIME_INDEX[part], value) });
  }

  /** The label above a date wheel toggles that part's picker. */
  function togglePicker(part: DatePart) {
    setPickerPart((current) => (current === part ? null : part));
  }

  function closePicker(restoreFocus: boolean) {
    const part = pickerPart;
    setPickerPart(null);
    if (restoreFocus && part) document.getElementById(wheelId(part))?.focus({ preventScroll: true });
  }

  function handlePickerSelect(value: number) {
    if (!pickerPart) return;
    handlePartChange(pickerPart, value);
    closePicker(true);
  }

  const monthName = (style: 'short' | 'long') => (month: number) =>
    new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month - 1, 1)));
  /** Month options show the number and the short name, e.g. "02 feb". */
  const formatMonth = (month: number) => (
    <>
      <span className="datetime-picker__month-number">{String(month).padStart(2, '0')}</span>
      <span className="datetime-picker__month-name">{monthName('short')(month).replace('.', '')}</span>
    </>
  );

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
    setPickerPart(null);
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
    const names = query.matches.slice(0, MAX_AMBIGUOUS_NAMES).map((site) => site.name);
    if (query.matches.length > MAX_AMBIGUOUS_NAMES) names.push('…');
    searchHint = { text: config.searchErrors.ambiguous(names.join(', ')), error: true };
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
  } else if (valid && upToDate) {
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

  const updateButton = (
    <button type="submit" form={formId} className={buttonClass} disabled={!canUpdate} aria-busy={loading}>
      {buttonLabel}
    </button>
  );

  return (
    <form id={formId} className="config" onSubmit={handleSubmit}>
      <Box
        title={config.site}
        titleAs="h3"
        titleId={siteTitleId}
        help={config.siteInfo}
        tag={custom ? `[${config.customTag}]` : undefined}
        tagTone="warning"
      >
        <WheelSelect
          label={config.siteList.label}
          placeholder={config.siteList.placeholder}
          options={siteOptions}
          value={listedIndex === -1 ? null : listedIndex}
          describedBy={siteListHintId}
          onChange={(index) => {
            const site = listedSites[index];
            if (site) handlePresetChange(site.id);
          }}
        />
        {/* Also in the help dialog; read with the drop-down. */}
        <p id={siteListHintId} className="visually-hidden">
          {config.siteList.hint(listedSites.length, FEATURED_SITES.length)}
        </p>

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
          {(['date', 'time'] as const).map((group) => (
            <div
              key={group}
              className="datetime__field"
              role="group"
              aria-labelledby={group === 'date' ? dateFieldId : timeFieldId}
            >
              <span className="search-field__label" id={group === 'date' ? dateFieldId : timeFieldId}>
                {group === 'date' ? config.date : config.time}
              </span>
              <div className={`datetime__wheels datetime__wheels--${group}`}>
                {wheels[group].map(({ part, value, min, max, wrap, columns }) => {
                  // Hour and minute have no exact picker: they are only set with their wheels.
                  const pickable = isDatePart(part) && columns !== null;
                  return (
                    <NumberWheel
                      key={part}
                      id={wheelId(part)}
                      label={config.wheels[part]}
                      value={value}
                      min={min}
                      max={max}
                      wrap={wrap}
                      animated={animated}
                      invalid={!parsedTime.ok}
                      describedBy={pickable ? `${timeHintId} ${wheelHintId}` : timeHintId}
                      open={pickable && pickerPart === part}
                      popupId={pickable ? pickerId : undefined}
                      onOpen={pickable ? () => togglePicker(part) : undefined}
                      onChange={(next) => handlePartChange(part, next)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <span id={wheelHintId} className="visually-hidden">
            {config.wheelPickerHint}
          </span>
          {pickerWheel && pickerWheel.columns !== null && (
            <DateTimePartPicker
              key={pickerWheel.part}
              id={pickerId}
              title={config.picker[pickerWheel.part]}
              value={pickerWheel.value}
              min={pickerWheel.min}
              max={pickerWheel.max}
              columns={pickerWheel.columns}
              format={pickerWheel.part === 'month' ? formatMonth : undefined}
              describe={pickerWheel.part === 'month' ? monthName('long') : undefined}
              onSelect={handlePickerSelect}
              onClose={closePicker}
            />
          )}
        </div>

        <div className="datetime__zone" role="group" aria-labelledby={zoneFieldId}>
          <span className="search-field__label" id={zoneFieldId}>
            {config.timeZone}
          </span>
          <div className="datetime__wheels datetime__wheels--zone">
            <NumberWheel
              label={config.wheels.zone}
              value={TIME_ZONE_MODES.indexOf(zone)}
              min={0}
              max={TIME_ZONE_MODES.length - 1}
              wrap={false}
              format={(index) =>
                TIME_ZONE_MODES[index] === 'local'
                  ? config.zoneLocal(localZoneId() ?? localOffsetLabel(selection.utc))
                  : config.zoneUtc
              }
              animated={animated}
              invalid={false}
              describedBy={timeHintId}
              onChange={(index) => handleZoneChange(TIME_ZONE_MODES[index] ?? 'utc')}
            />
          </div>
        </div>
        <p id={timeHintId} className={`hint${timeHint.error ? ' hint--error' : ''}`}>
          {timeHint.text}
        </p>
      </Box>

      {updateTarget ? createPortal(updateButton, updateTarget) : updateButton}
    </form>
  );
}
