/**
 * Mission feasibility screening for the result on screen (the same data as
 * the scene and the data box). The box in the control column shows the
 * verdict per criterion — solar power against the demand and the
 * direct-to-Earth link margin — and opens a window with the assumptions
 * (editable, shared with the scenario comparison), every intermediate value
 * of the calculation, and an optional screening over about one synodic month
 * from the instant shown.
 *
 * Model, sources and limits: `shared/missionAssessment.ts`. It is a
 * geometric screening under the user's assumptions, never a guarantee of
 * power, communications or landing suitability: terrain is not modeled.
 */

import { useId, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import {
  assessInstant,
  assessWindow,
  PANEL_ORIENTATIONS,
  WINDOW_SAMPLES,
  WINDOW_STEP_MINUTES,
  type CriterionStatus,
  type InstantAssessment,
  type MissionAssumptions,
} from '../../../shared/missionAssessment';
import { CUSTOM_SITE_ID } from '../../../shared/sites';
import { formatDegrees, formatMinutes, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';
import { HelpButton } from '../../ui/DialogButton';
import { Modal } from '../../ui/Modal';
import { EXAMPLE_INPUTS, FIELD_SPECS, LINK_FIELDS, POWER_FIELDS, type FieldId } from './assumptionsForm';
import { formatNumber, formatPower, formatShare, withUnit } from './formatMission';
import { dataSelection, selectionKey, windowFits, windowGap, type MissionState, type WindowState } from './useMission';

interface AssessmentPanelProps {
  readonly data: EphemerisResponse;
  readonly mission: MissionState;
  /** A query is running: the values on screen are about to change. */
  readonly busy: boolean;
  readonly windows: Readonly<Record<string, WindowState>>;
  readonly onLoadWindow: (data: EphemerisResponse) => void;
}

export function StatusTag({ status, compact = false }: { status: CriterionStatus; compact?: boolean }) {
  const { messages } = useI18n();
  const text = messages.mission;
  return (
    <span className={`mission-status mission-status--${status}`} title={text.verdictLong[status]}>
      {compact ? text.verdictShort[status] : text.verdict[status]}
    </span>
  );
}

export function AssessmentPanel({ data, mission, busy, windows, onLoadWindow }: AssessmentPanelProps) {
  const { messages } = useI18n();
  const text = messages.mission;
  const [open, setOpen] = useState(false);
  const assumptions = mission.reading.assumptions;
  const result = assumptions ? assessInstant(data, assumptions) : null;

  return (
    <Box
      title={text.heading}
      titleAs="h3"
      className="mission"
      help={text.info}
      tag={result && !busy ? <StatusTag status={result.overall} compact /> : undefined}
      tagTone={result?.overall === 'met' ? 'accent' : result?.overall === 'not-met' ? 'error' : 'muted'}
      actions={
        <button type="button" className="text-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          {text.open}
        </button>
      }
    >
      <MissionSummary result={result} demandW={assumptions?.power.demandW ?? null} busy={busy} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={text.dialogTitle}
        className="dialog--wide mission-dialog"
        actions={<HelpButton section={text.limitsTitle} paragraphs={text.limits} />}
      >
        <div className="mission__layout">
          <AssumptionsForm mission={mission} />
          <div className="mission__results">
            <InstantDetails data={data} result={result} />
            <WindowDetails
              data={data}
              assumptions={assumptions}
              window={windows[selectionKey(dataSelection(data))] ?? { status: 'idle' }}
              onLoad={() => onLoadWindow(data)}
            />
          </div>
        </div>
      </Modal>
    </Box>
  );
}

function MissionSummary({ result, demandW, busy }: { result: InstantAssessment | null; demandW: number | null; busy: boolean }) {
  const { locale, messages } = useI18n();
  const text = messages.mission;
  if (!result) return <p className="hint hint--error">{text.fixAssumptions}</p>;
  const noValue = messages.results.noValue;
  const power = formatPower(result.power.powerW, locale) ?? noValue;
  const demand = formatPower(demandW, locale) ?? noValue;
  const margin = withUnit(result.link.marginDb, locale, 1, 'dB', true) ?? noValue;
  return (
    <dl className="mission__summary" aria-live="polite" aria-busy={busy}>
      <div className="mission__summary-row">
        <dt>{text.power}</dt>
        <dd>
          <span className="mission__value">{text.powerVsDemand(power, demand)}</span>
          <StatusTag status={result.power.status} compact />
        </dd>
      </div>
      <div className="mission__summary-row">
        <dt>{text.link}</dt>
        <dd>
          <span className="mission__value">{result.link.earthAboveMask === false ? text.earthBelowMask : text.marginValue(margin)}</span>
          <StatusTag status={result.link.status} compact />
        </dd>
      </div>
    </dl>
  );
}

function AssumptionsForm({ mission }: { mission: MissionState }) {
  const { messages } = useI18n();
  const text = messages.mission;
  const idBase = useId();
  const invalid = new Set(mission.reading.invalid);

  const field = (id: FieldId) => {
    const inputId = `${idBase}-${id}`;
    return (
      <div key={id} className="mission__field">
        <label htmlFor={inputId} className="mission__label">
          {text.fields[id]}
        </label>
        <input
          id={inputId}
          className="text-input mission__input"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid.has(id)}
          title={text.fieldHints[id]}
          value={mission.inputs[id]}
          onChange={(event) => {
            const value = event.target.value;
            mission.setInputs((current) => ({ ...current, [id]: value }));
          }}
        />
        <span className="mission__unit">{FIELD_SPECS[id].unit}</span>
      </div>
    );
  };

  return (
    <form className="mission__form" onSubmit={(event) => event.preventDefault()} noValidate>
      <h3 className="mission__section-title">{text.assumptionsTitle}</h3>
      <p className="hint">{text.examplesNote}</p>
      <fieldset className="mission__group">
        <legend>{text.powerGroup}</legend>
        {POWER_FIELDS.map(field)}
        <div className="mission__field mission__field--wide">
          <span className="mission__label" id={`${idBase}-orientation`}>
            {text.orientation}
          </span>
          <div className="segmented mission__orientations" role="group" aria-labelledby={`${idBase}-orientation`}>
            {PANEL_ORIENTATIONS.map((orientation) => (
              <button
                key={orientation}
                type="button"
                className="segmented__option"
                aria-pressed={mission.inputs.orientation === orientation}
                title={text.orientations[orientation].hint}
                onClick={() => mission.setInputs((current) => ({ ...current, orientation }))}
              >
                {text.orientations[orientation].label}
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      <fieldset className="mission__group">
        <legend>{text.linkGroup}</legend>
        {LINK_FIELDS.map(field)}
      </fieldset>
      {invalid.size > 0 && (
        <p className="hint hint--error" role="alert">
          {text.invalidFields([...invalid].map((id) => text.fields[id]).join(', '))}
        </p>
      )}
      <button type="button" className="text-button" onClick={() => mission.setInputs(() => EXAMPLE_INPUTS)}>
        {text.resetExamples}
      </button>
    </form>
  );
}

function InstantDetails({ data, result }: { data: EphemerisResponse; result: InstantAssessment | null }) {
  const { locale, messages } = useI18n();
  const text = messages.mission;
  const noValue = messages.results.noValue;
  const siteName = data.site.id === CUSTOM_SITE_ID ? messages.config.customName : data.site.name;
  const show = (value: string | null) => value ?? noValue;

  return (
    <section className="mission__section" aria-label={text.instantTitle}>
      <h3 className="mission__section-title">{text.instantTitle}</h3>
      <p className="hint">
        {siteName} · {formatUtc(data.ephemerisUtc ?? data.requestedUtc)}
        {data.provenance === 'saved-sample' && <> · {text.sampleData}</>}
      </p>
      {!result ? (
        <p className="hint hint--error">{text.fixAssumptions}</p>
      ) : (
        <>
          <div className="mission__verdict">
            <StatusTag status={result.overall} />
            <span>{text.verdictLong[result.overall]}</span>
          </div>
          <table className="mission__table">
            <tbody>
              <tr className="mission__table-head">
                <th scope="rowgroup" colSpan={2}>
                  {text.power} <StatusTag status={result.power.status} compact />
                </th>
              </tr>
              <tr>
                <th scope="row">{text.rows.irradiance}</th>
                <td>{show(withUnit(result.power.irradianceWM2, locale, 0, 'W/m²'))}</td>
              </tr>
              <tr>
                <th scope="row">{text.rows.diskFraction}</th>
                <td>{show(formatShare(result.power.diskFraction, locale))}</td>
              </tr>
              <tr>
                <th scope="row">{text.rows.incidence}</th>
                <td>{show(result.power.incidenceFactor === null ? null : formatNumber(result.power.incidenceFactor, locale, 3))}</td>
              </tr>
              <tr>
                <th scope="row">{text.rows.power}</th>
                <td>{show(formatPower(result.power.powerW, locale))}</td>
              </tr>
              <tr className="mission__table-head">
                <th scope="rowgroup" colSpan={2}>
                  {text.link} <StatusTag status={result.link.status} compact />
                </th>
              </tr>
              <tr>
                <th scope="row">{text.rows.earthElevation}</th>
                <td>
                  {show(formatDegrees(result.link.earthElevationDeg, locale, 2))}
                  {result.link.earthAboveMask === false && <span className="mission__aside"> · {text.earthBelowMask}</span>}
                </td>
              </tr>
              <tr>
                <th scope="row">{text.rows.distance}</th>
                <td>{show(withUnit(result.link.distanceKm, locale, 0, 'km'))}</td>
              </tr>
              <tr>
                <th scope="row">{text.rows.freeSpaceLoss}</th>
                <td>{show(withUnit(result.link.freeSpaceLossDb, locale, 1, 'dB'))}</td>
              </tr>
              <tr>
                <th scope="row">C/N0</th>
                <td>{show(withUnit(result.link.cOverN0DbHz, locale, 1, 'dB·Hz'))}</td>
              </tr>
              <tr>
                <th scope="row">Eb/N0</th>
                <td>{show(withUnit(result.link.ebN0Db, locale, 1, 'dB'))}</td>
              </tr>
              <tr>
                <th scope="row">{text.rows.margin}</th>
                <td>{show(withUnit(result.link.marginDb, locale, 1, 'dB', true))}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function WindowDetails({
  data,
  assumptions,
  window,
  onLoad,
}: {
  data: EphemerisResponse;
  assumptions: MissionAssumptions | null;
  window: WindowState;
  onLoad: () => void;
}) {
  const { locale, messages } = useI18n();
  const text = messages.mission;
  const noValue = messages.results.noValue;
  const fits = windowFits(data.requestedUtc);
  const stats = window.status === 'done' && assumptions ? assessWindow(window.frames, WINDOW_STEP_MINUTES, assumptions) : null;
  const unknown = stats ? Math.max(stats.power.unknownSamples, stats.link.unknownSamples) : 0;

  return (
    <section className="mission__section" aria-label={text.windowTitle}>
      <h3 className="mission__section-title">{text.windowTitle}</h3>
      <p className="hint">{text.windowHint(WINDOW_SAMPLES, formatMinutes(WINDOW_STEP_MINUTES))}</p>
      {!fits && <p className="hint hint--error">{text.windowOutOfRange}</p>}
      {fits && window.status !== 'done' && (
        <button type="button" className="text-button" disabled={window.status === 'loading'} onClick={onLoad}>
          {window.status === 'loading' ? `${text.windowLoading}…` : window.status === 'error' ? text.windowRetry : text.windowRun}
        </button>
      )}
      {window.status === 'error' && <p className="hint hint--error">{messages.errors[window.error.key]}</p>}
      {stats && (
        <>
          <table className="mission__table">
            <tbody>
              <tr>
                <th scope="row">{text.windowRows.powerShare}</th>
                <td>{formatShare(stats.power.fraction, locale) ?? noValue}</td>
              </tr>
              <tr>
                <th scope="row">{text.windowRows.linkShare}</th>
                <td>{formatShare(stats.link.fraction, locale) ?? noValue}</td>
              </tr>
              <tr>
                <th scope="row">{text.windowRows.bothShare}</th>
                <td>{formatShare(stats.both.fraction, locale) ?? noValue}</td>
              </tr>
              <tr>
                <th scope="row">{text.windowRows.powerGap}</th>
                <td>{windowGap(stats.power) ?? noValue}</td>
              </tr>
              <tr>
                <th scope="row">{text.windowRows.linkGap}</th>
                <td>{windowGap(stats.link) ?? noValue}</td>
              </tr>
              <tr>
                <th scope="row">{text.windowRows.meanPower}</th>
                <td>{formatPower(stats.meanPowerW, locale) ?? noValue}</td>
              </tr>
            </tbody>
          </table>
          {unknown > 0 && <p className="hint">{text.windowUnknown(unknown)}</p>}
        </>
      )}
    </section>
  );
}
