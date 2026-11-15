/**
 * Site and time selection: one drop-down with every reference point in two
 * labeled groups (points with a first-person relief model, the featured demo
 * points first, then the points shown in third person only; each group
 * alphabetical; Apollo 11 carries a "first landing" badge), a
 * search box for custom coordinates or a point name or code (filled in with
 * the coordinates when a reference point is picked), date and time wheels
 * (`DateTimeWheels`, shared with the horizon playback interval) with a time zone wheel
 * (UTC, the time NASA uses for launches, or the browser's local zone) and the
 * update button. Explanations live in each section's help dialog.
 *
 * The update button can be rendered elsewhere in the page (`updateTarget`, the
 * top of the view column in `App`) through a portal; it stays associated with
 * this form through its `form` attribute, so it still submits it and Enter in
 * the search box still triggers it.
 *
 * While Apollo 11 is selected, the site box is tagged as historic and offers
 * two instants (landing and the flag erected); each one selects that
 * instant and queries it right away (`onShowUtc`), so the exact landing time
 * does not have to be dialed on the wheels.
 *
 * The update button is available for valid selections while idle unless a
 * complete live result already matches the selected coordinates and UTC instant.
 * It then reads "Updated" and stays disabled until the point or date/time changes
 * (D-020). Saved samples, failed requests and partial results remain retryable.
 */

import { useId, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { APOLLO_11_SITE_ID, CUSTOM_SITE_ID, FEATURED_SITES, findSite, MORE_SITES, siteCode, type SiteId } from '../../../shared/sites';
import { APOLLO_11_FLAG_UTC, APOLLO_11_LANDING_UTC } from '../../../shared/time';
import type { EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Box } from '../../ui/Box';
import { NumberWheel } from '../../ui/NumberWheel';
import { WheelSelect } from '../../ui/WheelSelect';
import { hasFirstPersonView } from '../scene/viewMode';
import { formatCoordinateQuery, parseCoordinateQuery, type CoordinateQuery } from './coordinateQuery';
import { currentUtcMinute } from './dateTimeWheel';
import { DateTimeWheels } from './DateTimeWheels';
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
  /** Selects an instant and queries it right away (the Apollo 11 moments). */
  readonly onShowUtc: (utc: string) => void;
  /** Element where the update button is rendered; inside the form when absent. */
  readonly updateTarget?: HTMLElement | null;
}

/** Names listed in the "several points match" hint before it is cut short. */
const MAX_AMBIGUOUS_NAMES = 6;

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
  onShowUtc,
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
  const zoneFieldId = useId();
  const timeHintId = useId();
  const siteListHintId = useId();
  const apolloTitleId = useId();
  // Two parts: points with a first-person relief model (the featured demo
  // points first) and points shown in third person only, each alphabetical.
  const { listedSites, thirdPersonStart } = useMemo(() => {
    const collator = new Intl.Collator(locale, { sensitivity: 'base' });
    const others = [...MORE_SITES].sort((a, b) => collator.compare(a.name, b.name));
    const firstPerson = [...FEATURED_SITES.filter((site) => hasFirstPersonView(site.id)), ...others.filter((site) => hasFirstPersonView(site.id))];
    const thirdPerson = [...FEATURED_SITES, ...others].filter((site) => !hasFirstPersonView(site.id));
    return { listedSites: [...firstPerson, ...thirdPerson], thirdPersonStart: firstPerson.length };
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
  const apolloIndex = listedSites.findIndex((site) => site.id === APOLLO_11_SITE_ID);
  const siteBadges = apolloIndex === -1 ? undefined : { [apolloIndex]: config.siteList.apolloBadge };
  const [searchInput, setSearchInput] = useState(() =>
    formatCoordinateQuery(selection.latitudeDeg, selection.longitudeEastDeg),
  );
  const [zone, setZone] = useState<TimeZoneMode>('utc');
  const [fields, setFields] = useState<DateTimeFields>(() => utcToFields(selection.utc, 'utc'));
  // Follow instants chosen outside this panel (an inverse search match): when
  // the selected instant changes and the fields do not already show it, the
  // fields are rewritten (to the minute) and the wheels roll to it.
  const [followedUtc, setFollowedUtc] = useState(selection.utc);
  if (selection.utc !== followedUtc) {
    setFollowedUtc(selection.utc);
    const shown = fieldsToUtc(fields, zone, followedUtc);
    if (!shown.ok || shown.iso !== selection.utc) setFields(utcToFields(selection.utc, zone));
  }
  const query = parseCoordinateQuery(searchInput);
  const parsedTime = fieldsToUtc(fields, zone, selection.utc);
  const custom = selection.siteId === CUSTOM_SITE_ID;
  const apollo = selection.siteId === APOLLO_11_SITE_ID;
  const apolloMoments = [
    { key: 'landing', label: config.apollo11.landing, utc: APOLLO_11_LANDING_UTC },
    { key: 'flag', label: config.apollo11.flag, utc: APOLLO_11_FLAG_UTC },
  ] as const;
  const valid = parsedTime.ok && isUsable(query);
  const canUpdate = valid && !loading && !upToDate;

  /** Sets every wheel at once; with effects on, each wheel rolls to its new value by itself. */
  function handleLive() {
    const utc = currentUtcMinute();
    setFields(utcToFields(utc, zone));
    onUtcChange(utc);
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

  function handleFieldsChange(next: DateTimeFields) {
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
        tag={custom ? `[${config.customTag}]` : apollo ? `[${config.apollo11.tag}]` : undefined}
        tagTone={custom ? 'warning' : 'accent'}
      >
        <WheelSelect
          label={config.siteList.label}
          placeholder={config.siteList.placeholder}
          options={siteOptions}
          badges={siteBadges}
          sections={[
            { label: config.siteList.sections.firstPerson, start: 0 },
            { label: config.siteList.sections.thirdPerson, start: thirdPersonStart },
          ]}
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

        {apollo && (
          <div className="apollo-moments" role="group" aria-labelledby={apolloTitleId}>
            <span className="search-field__label apollo-moments__title" id={apolloTitleId}>
              <span aria-hidden="true">★ </span>
              {config.apollo11.title}
            </span>
            <div className="apollo-moments__list">
              {apolloMoments.map(({ key, label, utc }) => {
                const selected = selection.utc === utc;
                // Re-querying a case already shown live is blocked like the update button (D-020).
                const disabled = loading || (selected && upToDate);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`apollo-moment${selected ? ' apollo-moment--selected' : ''}`}
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => onShowUtc(utc)}
                  >
                    <span className="apollo-moment__label">
                      {label}
                      {selected && <span className="visually-hidden"> ({config.apollo11.selected})</span>}
                    </span>
                    <span className="apollo-moment__time">{formatUtc(utc)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </Box>

      <Box
        title={config.dateTime}
        className="datetime-box"
        titleAs="h3"
        help={config.dateTimeInfo}
        actions={<button type="button" className="text-button" onClick={handleLive} title={config.liveHint}>{config.live}</button>}
      >
        <DateTimeWheels
          fields={fields}
          onChange={handleFieldsChange}
          invalid={!parsedTime.ok}
          animated={animated}
          describedBy={timeHintId}
        />

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
