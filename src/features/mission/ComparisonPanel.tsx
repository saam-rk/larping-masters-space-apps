/**
 * Side-by-side comparison of up to four scenarios (a point and a UTC
 * instant each). Scenarios are added from the current selection, as is or
 * shifted in time (+1 d, +7 d, +½ mean synodic month), so the same point can
 * be compared across dates and different points at the same date.
 *
 * Each scenario is queried once through `/api/ephemeris` (the same request as
 * the main view) and shows the Sun and the Earth, the screening of the
 * mission assumptions (shared with the "Feasibility" box) and, on request,
 * the screening over about one synodic month. The best value of each
 * comparable row is marked; geometry rows (azimuth, elevation) are not
 * ranked, since "better" depends on the mission.
 *
 * The window's content stays mounted while closed, so the scenarios survive
 * closing and reopening it. "Show" puts a scenario on the main view.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BODY_IDS, type BodyId, type EphemerisResponse } from '../../../shared/ephemeris';
import { assessInstant, assessWindow, WINDOW_STEP_MINUTES, type InstantAssessment, type WindowAssessment } from '../../../shared/missionAssessment';
import { presenceOfTarget } from '../../../shared/presence';
import { CUSTOM_SITE_ID, findSite } from '../../../shared/sites';
import { fetchEphemeris, type ClientError, type EphemerisSelection } from '../../api/ephemerisClient';
import { formatCoordinates, formatDegrees, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';
import { Modal } from '../../ui/Modal';
import { StatusTag } from './AssessmentPanel';
import { MAX_SCENARIOS, SCENARIO_OFFSETS, shiftedUtc, type ScenarioOffset } from './scenarios';
import { formatPower, formatShare, withUnit } from './formatMission';
import { selectionKey, windowFits, windowGap, type MissionState, type WindowState } from './useMission';

type ScenarioResult =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly data: EphemerisResponse }
  | { readonly status: 'error'; readonly error: ClientError };

interface Scenario {
  readonly key: string;
  readonly selection: EphemerisSelection;
  readonly result: ScenarioResult;
}

interface ComparisonPanelProps {
  /** Selection in the control panel: what "Add" adds. */
  readonly selection: EphemerisSelection;
  readonly mission: MissionState;
  readonly windows: Readonly<Record<string, WindowState>>;
  readonly onLoadWindows: (selections: readonly EphemerisSelection[]) => void;
  /** Puts a scenario on the main view. */
  readonly onShow: (selection: EphemerisSelection) => void;
}

export function ComparisonPanel({ selection, mission, windows, onLoadWindows, onShow }: ComparisonPanelProps) {
  const { messages } = useI18n();
  const text = messages.compare;
  const [open, setOpen] = useState(false);
  const [scenarios, setScenarios] = useState<readonly Scenario[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((controller) => controller.abort());
  }, []);

  function query(target: EphemerisSelection) {
    const key = selectionKey(target);
    controllers.current.get(key)?.abort();
    const controller = new AbortController();
    controllers.current.set(key, controller);
    void fetchEphemeris(target, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      controllers.current.delete(key);
      if (!result.ok) console.error('[compare]', result.error.key, result.error.detail);
      setScenarios((current) =>
        current.map((scenario) =>
          scenario.key === key
            ? { ...scenario, result: result.ok ? { status: 'ok', data: result.data } : { status: 'error', error: result.error } }
            : scenario,
        ),
      );
    });
  }

  function add(offset: ScenarioOffset) {
    const minutes = SCENARIO_OFFSETS.find((option) => option.id === offset)!.minutes;
    const utc = shiftedUtc(selection.utc, minutes);
    if (utc === null) {
      setNotice(text.outOfRange);
      return;
    }
    const target = { ...selection, utc };
    const key = selectionKey(target);
    if (scenarios.some((scenario) => scenario.key === key)) {
      setNotice(text.duplicate);
      return;
    }
    if (scenarios.length >= MAX_SCENARIOS) {
      setNotice(text.full(MAX_SCENARIOS));
      return;
    }
    setNotice(null);
    setScenarios((current) => [...current, { key, selection: target, result: { status: 'loading' } }]);
    query(target);
  }

  function remove(key: string) {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
    setNotice(null);
    setScenarios((current) => current.filter((scenario) => scenario.key !== key));
  }

  function retry(scenario: Scenario) {
    setScenarios((current) => current.map((item) => (item.key === scenario.key ? { ...item, result: { status: 'loading' } } : item)));
    query(scenario.selection);
  }

  const loading = scenarios.some((scenario) => scenario.result.status === 'loading');
  const addButtons = (
    <div className="compare__add" role="group" aria-label={text.addGroup}>
      {SCENARIO_OFFSETS.map((offset) => (
        <button
          key={offset.id}
          type="button"
          className="text-button"
          disabled={scenarios.length >= MAX_SCENARIOS}
          title={text.addHints[offset.id]}
          onClick={() => add(offset.id)}
        >
          {text.add[offset.id]}
        </button>
      ))}
    </div>
  );

  return (
    <Box
      title={text.heading}
      titleAs="h3"
      className="compare"
      help={text.info}
      tag={`${scenarios.length}/${MAX_SCENARIOS}`}
      tagTone={scenarios.length > 0 ? 'accent' : 'muted'}
      actions={
        <button type="button" className="text-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          {text.open}
        </button>
      }
    >
      {addButtons}
      <ScenarioChips scenarios={scenarios} onRemove={remove} />
      {notice && !open && <p className="hint hint--error" role="status">{notice}</p>}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={text.dialogTitle}
        tag={loading ? <span className="blink">●</span> : `${scenarios.length}/${MAX_SCENARIOS}`}
        className="dialog--wide compare-dialog"
      >
        <div className="compare__toolbar">
          {addButtons}
          <button
            type="button"
            className="text-button"
            disabled={!scenarios.some((scenario) => windowFits(scenario.selection.utc) && windows[scenario.key]?.status !== 'done' && windows[scenario.key]?.status !== 'loading')}
            title={text.windowsHint}
            onClick={() =>
              onLoadWindows(
                scenarios
                  .filter((scenario) => windowFits(scenario.selection.utc) && windows[scenario.key]?.status !== 'done')
                  .map((scenario) => scenario.selection),
              )
            }
          >
            {text.windows}
          </button>
        </div>
        {notice && <p className="hint hint--error" role="status">{notice}</p>}
        {scenarios.length === 0 ? (
          <p className="hint">{text.empty}</p>
        ) : (
          <ComparisonTable
            scenarios={scenarios}
            mission={mission}
            windows={windows}
            onShow={(target) => {
              onShow(target);
              setOpen(false);
            }}
            onRemove={remove}
            onRetry={retry}
          />
        )}
        <p className="hint">{text.limits}</p>
      </Modal>
    </Box>
  );
}

function scenarioName(selection: EphemerisSelection, customName: string): string {
  return selection.siteId === CUSTOM_SITE_ID ? customName : findSite(selection.siteId).name;
}

function ScenarioChips({ scenarios, onRemove }: { scenarios: readonly Scenario[]; onRemove: (key: string) => void }) {
  const { messages } = useI18n();
  const text = messages.compare;
  if (scenarios.length === 0) return <p className="hint">{text.emptyShort}</p>;
  return (
    <ol className="compare__chips">
      {scenarios.map((scenario, index) => (
        <li key={scenario.key} className="compare__chip" data-status={scenario.result.status}>
          <span className="compare__chip-index">{index + 1}</span>
          <span className="compare__chip-text">
            {scenarioName(scenario.selection, messages.config.customName)} · {formatUtc(scenario.selection.utc)}
          </span>
          <button
            type="button"
            className="icon-button compare__chip-remove"
            aria-label={text.removeNamed(index + 1)}
            title={text.remove}
            onClick={() => onRemove(scenario.key)}
          >
            ✕
          </button>
        </li>
      ))}
    </ol>
  );
}

type Rank = 'max' | 'min';

interface Row {
  readonly label: ReactNode;
  readonly tone?: BodyId;
  /** Cell per scenario; `value` ranks it when the row has a `rank`. */
  readonly cells: readonly { readonly text: ReactNode; readonly value?: number | null }[];
  readonly rank?: Rank;
  readonly group?: boolean;
}

function bestIndexes(row: Row): Set<number> {
  if (!row.rank) return new Set();
  const values = row.cells.map((cell) => (typeof cell.value === 'number' ? cell.value : null));
  const known = values.filter((value): value is number => value !== null);
  if (known.length < 2) return new Set();
  const best = row.rank === 'max' ? Math.max(...known) : Math.min(...known);
  // Nothing to single out when every scenario ties.
  if (known.every((value) => value === best)) return new Set();
  return new Set(values.flatMap((value, index) => (value === best ? [index] : [])));
}

interface ComparisonTableProps {
  readonly scenarios: readonly Scenario[];
  readonly mission: MissionState;
  readonly windows: Readonly<Record<string, WindowState>>;
  readonly onShow: (selection: EphemerisSelection) => void;
  readonly onRemove: (key: string) => void;
  readonly onRetry: (scenario: Scenario) => void;
}

function ComparisonTable({ scenarios, mission, windows, onShow, onRemove, onRetry }: ComparisonTableProps) {
  const { locale, messages } = useI18n();
  const text = messages.compare;
  const mtext = messages.mission;
  const noValue = messages.results.noValue;
  const assumptions = mission.reading.assumptions;

  const data = scenarios.map((scenario) => (scenario.result.status === 'ok' ? scenario.result.data : null));
  const instants: (InstantAssessment | null)[] = data.map((item) => (item && assumptions ? assessInstant(item, assumptions) : null));
  const windowStats: (WindowAssessment | null)[] = scenarios.map((scenario) => {
    const window = windows[scenario.key];
    return window?.status === 'done' && assumptions ? assessWindow(window.frames, WINDOW_STEP_MINUTES, assumptions) : null;
  });
  const pending = (index: number): ReactNode => {
    const result = scenarios[index]!.result;
    if (result.status === 'loading') return <span className="blink">{text.loading}</span>;
    if (result.status === 'error') return <span className="hint--error">{messages.errors[result.error.key]}</span>;
    return noValue;
  };
  const windowPending = (index: number): ReactNode => {
    const scenario = scenarios[index]!;
    const window = windows[scenario.key];
    if (!windowFits(scenario.selection.utc)) return mtext.windowOutOfRangeShort;
    if (!window || window.status === 'idle') return <span className="compare__muted">{text.windowNotRun}</span>;
    if (window.status === 'loading') return <span className="blink">{text.loading}</span>;
    if (window.status === 'error') return <span className="hint--error">{messages.errors[window.error.key]}</span>;
    return noValue;
  };

  const bodyRows = (body: BodyId): Row[] => {
    const observations = data.map((item) => {
      const result = item?.bodies[body];
      return result?.status === 'ok' ? result.observation : null;
    });
    return [
      { label: messages.bodies[body], tone: body, group: true, cells: scenarios.map(() => ({ text: '' })) },
      {
        label: messages.results.azimuth,
        cells: observations.map((observation, index) => ({
          text: observation ? (formatDegrees(observation.azimuthDeg, locale, 2) ?? noValue) : pending(index),
        })),
      },
      {
        label: messages.results.elevation,
        cells: observations.map((observation, index) => ({
          text: observation ? (formatDegrees(observation.elevationDeg, locale, 2) ?? noValue) : pending(index),
        })),
      },
      {
        label: messages.results.state,
        cells: observations.map((observation, index) => ({
          text: observation ? messages.presence.short[presenceOfTarget(observation)] : pending(index),
        })),
      },
    ];
  };

  const rows: Row[] = [
    ...BODY_IDS.flatMap(bodyRows),
    { label: mtext.screeningTitle, group: true, cells: scenarios.map(() => ({ text: '' })) },
    {
      label: mtext.rows.power,
      rank: 'max',
      cells: instants.map((instant, index) => ({
        text: instant ? (formatPower(instant.power.powerW, locale) ?? noValue) : pending(index),
        value: instant?.power.powerW,
      })),
    },
    {
      label: mtext.rows.margin,
      rank: 'max',
      cells: instants.map((instant, index) => ({
        text: instant
          ? instant.link.earthAboveMask === false
            ? mtext.earthBelowMask
            : (withUnit(instant.link.marginDb, locale, 1, 'dB', true) ?? noValue)
          : pending(index),
        // Margin only ranks while the Earth is above the mask.
        value: instant && instant.link.earthAboveMask !== false ? instant.link.marginDb : null,
      })),
    },
    {
      label: mtext.power,
      cells: instants.map((instant, index) => ({ text: instant ? <StatusTag status={instant.power.status} /> : pending(index) })),
    },
    {
      label: mtext.link,
      cells: instants.map((instant, index) => ({ text: instant ? <StatusTag status={instant.link.status} /> : pending(index) })),
    },
    {
      label: mtext.overall,
      cells: instants.map((instant, index) => ({ text: instant ? <StatusTag status={instant.overall} /> : pending(index) })),
    },
    { label: mtext.windowTitle, group: true, cells: scenarios.map(() => ({ text: '' })) },
    {
      label: mtext.windowRows.powerShare,
      rank: 'max',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (formatShare(stats.power.fraction, locale) ?? noValue) : windowPending(index),
        value: stats?.power.fraction,
      })),
    },
    {
      label: mtext.windowRows.linkShare,
      rank: 'max',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (formatShare(stats.link.fraction, locale) ?? noValue) : windowPending(index),
        value: stats?.link.fraction,
      })),
    },
    {
      label: mtext.windowRows.bothShare,
      rank: 'max',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (formatShare(stats.both.fraction, locale) ?? noValue) : windowPending(index),
        value: stats?.both.fraction,
      })),
    },
    {
      label: mtext.windowRows.powerGap,
      rank: 'min',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (windowGap(stats.power) ?? noValue) : windowPending(index),
        value: stats?.power.longestGapMinutes,
      })),
    },
    {
      label: mtext.windowRows.linkGap,
      rank: 'min',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (windowGap(stats.link) ?? noValue) : windowPending(index),
        value: stats?.link.longestGapMinutes,
      })),
    },
    {
      label: mtext.windowRows.meanPower,
      rank: 'max',
      cells: windowStats.map((stats, index) => ({
        text: stats ? (formatPower(stats.meanPowerW, locale) ?? noValue) : windowPending(index),
        value: stats?.meanPowerW,
      })),
    },
  ];

  return (
    <div className="compare__scroll">
      {!assumptions && <p className="hint hint--error">{mtext.fixAssumptions}</p>}
      <table className="compare__table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{text.criterion}</span>
            </th>
            {scenarios.map((scenario, index) => (
              <th key={scenario.key} scope="col" className="compare__scenario">
                <span className="compare__scenario-index">{text.scenario(index + 1)}</span>
                <span className="compare__scenario-name">{scenarioName(scenario.selection, messages.config.customName)}</span>
                <span className="compare__scenario-meta">
                  {formatCoordinates(scenario.selection.latitudeDeg, scenario.selection.longitudeEastDeg, locale, messages.hemisphere)}
                </span>
                <span className="compare__scenario-meta">{formatUtc(scenario.selection.utc)}</span>
                {scenario.result.status === 'ok' && scenario.result.data.provenance === 'saved-sample' && (
                  <span className="compare__scenario-meta">{mtext.sampleData}</span>
                )}
                <span className="compare__scenario-actions">
                  <button type="button" className="text-button" onClick={() => onShow(scenario.selection)}>
                    {text.show}
                  </button>
                  {scenario.result.status === 'error' && (
                    <button type="button" className="text-button" onClick={() => onRetry(scenario)}>
                      {text.retry}
                    </button>
                  )}
                  <button type="button" className="text-button" onClick={() => onRemove(scenario.key)}>
                    {text.remove}
                  </button>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            if (row.group) {
              return (
                <tr key={rowIndex} className="compare__group">
                  <th scope="colgroup" colSpan={scenarios.length + 1} className={row.tone ? `readings__body readings__body--${row.tone}` : undefined}>
                    {row.label}
                  </th>
                </tr>
              );
            }
            const best = bestIndexes(row);
            return (
              <tr key={rowIndex}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, index) => (
                  <td key={scenarios[index]!.key} className={best.has(index) ? 'compare__best' : undefined}>
                    {cell.text}
                    {best.has(index) && (
                      <span className="compare__best-mark" title={text.best}>
                        {' '}▲<span className="visually-hidden"> {text.best}</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
