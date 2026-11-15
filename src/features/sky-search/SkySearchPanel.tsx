/**
 * Inverse search (`/api/sky-search`): azimuth and elevation ranges for the
 * Sun and the Earth (one to four rows) and the direction in time give the
 * closest matching instant. The search starts from the control panel's site
 * and instant; a match is handed to `onShow`, which puts it on the local
 * horizon view.
 *
 * The box stays in the control column as a short summary (conditions set,
 * last result) with a button that opens the search window. The window holds
 * the form in three numbered steps and ready-made examples. Each condition
 * (e.g. the Sun's elevation) takes one line; the longer explanations (units
 * and conventions, the search directions, what each example shows and the
 * extended guide) open in their own window from an "i" button, so the form
 * reads at a glance. Values the Sun or the Earth can never take at the site
 * are flagged, and the possible ones are listed beside each row.
 *
 * The window's content stays mounted while closed: fields and the last
 * result survive, and a running search keeps going (it can be cancelled). A
 * result for a site that is no longer selected stays readable but cannot be
 * shown.
 */

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  ANGLE_BOUNDS,
  SKY_SEARCH_DIRECTIONS,
  SKY_TARGET_INFO,
  SKY_TARGETS,
  wrapsNorth,
  type AngleRange,
  type SkySearchDirection,
  type SkySearchResponse,
  type SkyTarget,
} from '../../../shared/skySearch';
import { possibleSky } from '../../../shared/skyFeasibility';
import { CUSTOM_SITE_ID, findSite } from '../../../shared/sites';
import type { ClientError, EphemerisSelection } from '../../api/ephemerisClient';
import { fetchSkySearch } from '../../api/skySearchClient';
import { formatDegrees, formatOffset, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';
import { DialogButton, HelpButton } from '../../ui/DialogButton';
import { Modal } from '../../ui/Modal';
import { EMPTY_INPUTS, readForm, type ConditionInputs, type RowState } from './conditionForm';
import { EXAMPLE_DIRECTIONS, EXAMPLE_INPUTS, SKY_SEARCH_EXAMPLES, type SkySearchExample } from './examples';
import type { Messages } from '../../i18n/messages';

/** "Sun", "Earth" or, for the separation, "Sun–Earth". */
function targetBodyName(target: SkyTarget, messages: Messages): string {
  const { bodies } = SKY_TARGET_INFO[target];
  return bodies.length === 1 ? messages.bodies[bodies[0]!] : messages.skySearch.pair;
}

/** Row colour: the body's own, or `pair` for the separation. */
function targetTone(target: SkyTarget): string {
  const { bodies } = SKY_TARGET_INFO[target];
  return bodies.length === 1 ? bodies[0]! : 'pair';
}

interface SkySearchPanelProps {
  readonly selection: EphemerisSelection;
  /** Shows a matching instant on the horizon view (for the current site). */
  readonly onShow: (utc: string) => void;
}

type SearchState =
  | { readonly status: 'idle' }
  | { readonly status: 'searching' }
  | { readonly status: 'done'; readonly data: SkySearchResponse }
  | { readonly status: 'error'; readonly error: ClientError };

function sameSite(selection: EphemerisSelection, data: SkySearchResponse): boolean {
  return selection.latitudeDeg === data.site.latitudeDeg && selection.longitudeEastDeg === data.site.longitudeEastDeg;
}

export function SkySearchPanel({ selection, onShow }: SkySearchPanelProps) {
  const { locale, messages } = useI18n();
  const text = messages.skySearch;
  const idBase = useId();
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<ConditionInputs>(EMPTY_INPUTS);
  const [direction, setDirection] = useState<SkySearchDirection>('nearest');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);

  const current = useRef({ selection, onShow });
  useEffect(() => { current.current = { selection, onShow }; }, [selection, onShow]);
  useEffect(() => () => inFlight.current?.abort(), []);

  const reading = readForm(inputs, selection);
  const searching = state.status === 'searching';
  const canSearch = reading.conditions !== null && !searching;
  const siteName = (site: { id: string; name: string }) => (site.id === CUSTOM_SITE_ID ? messages.config.customName : site.name);
  const currentSiteName = selection.siteId === CUSTOM_SITE_ID ? messages.config.customName : findSite(selection.siteId).name;
  const fieldId = (target: SkyTarget, bound: 'min' | 'max') => `${idBase}-${target}-${bound}`;
  const directionId = `${idBase}-direction`;
  const errorId = `${idBase}-errors`;
  const conditionsId = `${idBase}-conditions`;

  function setField(target: SkyTarget, bound: 'min' | 'max', value: string) {
    setInputs((current) => ({ ...current, [target]: { ...current[target], [bound]: value } }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const conditions = reading.conditions;
    if (!conditions || searching) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState({ status: 'searching' });
    void fetchSkySearch({ selection, direction, conditions }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      inFlight.current = null;
      if (!result.ok) {
        console.error('[sky-search]', result.error.key, result.error.detail);
        setState({ status: 'error', error: result.error });
        return;
      }
      setState({ status: 'done', data: result.data });
      if (result.data.outcome.status === 'found' && sameSite(current.current.selection, result.data)) {
        current.current.onShow(result.data.outcome.match.utc);
      }
    });
  }

  function handleCancel() {
    inFlight.current?.abort();
    inFlight.current = null;
    setState({ status: 'idle' });
  }

  /** Fills the form with an example, and sets its search direction when it has one (the eclipses look for the next date). */
  function applyExample(example: SkySearchExample) {
    setInputs(EXAMPLE_INPUTS[example]);
    const exampleDirection = EXAMPLE_DIRECTIONS[example];
    if (exampleDirection) setDirection(exampleDirection);
  }

  /** Closes the window so the match on the horizon view is visible. */
  function handleShow(utc: string) {
    if (selection.utc !== utc) onShow(utc);
    setOpen(false);
  }

  const bodyName = (target: SkyTarget) => targetBodyName(target, messages);
  const angleName = (target: SkyTarget) => text.angles[SKY_TARGET_INFO[target].angle];
  const rowError = (target: SkyTarget, row: RowState): string | null => {
    if (row.kind !== 'invalid') return null;
    const prefix = `${bodyName(target)} · ${angleName(target).toLowerCase()}: `;
    if (row.reason === 'format') return prefix + text.rowErrors.format;
    if (row.reason === 'order') return prefix + text.rowErrors.order;
    const angle = SKY_TARGET_INFO[target].angle;
    return prefix + (angle === 'azimuth' ? text.rowErrors.azimuthBounds : angle === 'elevation' ? text.rowErrors.elevationBounds : text.rowErrors.separationBounds);
  };
  const errors = [
    ...SKY_TARGETS.map((target) => rowError(target, reading.rows[target])).filter((error): error is string => error !== null),
    ...reading.impossible.map((body) => text.impossible(messages.bodies[body])),
  ];
  const possible = possibleSky(selection);
  // Rounded outwards to 0.1°, so a shown bound is never tighter than the check.
  const down = (value: number) => formatDegrees(Math.floor(value * 10) / 10, locale, 1) as string;
  const up = (value: number) => formatDegrees(Math.ceil(value * 10) / 10, locale, 1) as string;
  const possibleText = (target: SkyTarget) => {
    const { bodies, angle } = SKY_TARGET_INFO[target];
    // The separation is not bounded per site (see `skyFeasibility.ts`): its full span.
    if (angle === 'separation') return text.span(down(ANGLE_BOUNDS.separation[0]), up(ANGLE_BOUNDS.separation[1]));
    const range = possible[bodies[0]!][angle];
    return range === null ? text.anyAzimuth : text.span(down(range.min), up(range.max));
  };
  const wrapNotes = SKY_TARGETS.flatMap((target) => {
    const row = reading.rows[target];
    return row.kind === 'ok' && wrapsNorth(SKY_TARGET_INFO[target].angle, row.range) ? [text.wrapsNorth(bodyName(target))] : [];
  });
  const filled = SKY_TARGETS.some((target) => inputs[target].min !== '' || inputs[target].max !== '');

  const formatRange = (range: AngleRange) => {
    const min = formatDegrees(range.min, locale);
    return range.min === range.max ? `= ${min}` : `${min} → ${formatDegrees(range.max, locale)}`;
  };

  const searchingTag = searching ? <span className="blink">●</span> : undefined;
  const conditionsHelp = [
    text.conditionsHint,
    ...(['azimuth', 'elevation', 'separation'] as const).map((angle) => `${text.angles[angle]}: ${text.angleHints[angle]}.`),
  ];
  const directionHelp = SKY_SEARCH_DIRECTIONS.map((option) => `${text.directions[option]}: ${text.directionHints[option]}`);
  const examplesHelp = [
    text.examplesIntro,
    ...SKY_SEARCH_EXAMPLES.map((example) => `${text.examples[example].title}: ${text.examples[example].detail}`),
  ];

  return (
    <Box
      title={text.heading}
      titleAs="h3"
      className="sky-search"
      help={text.info}
      tag={searchingTag}
      actions={
        <button type="button" className="text-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          {text.open}
        </button>
      }
    >
      <p className="sky-search__intro">{text.intro}</p>
      <BoxSummary state={state} count={reading.active} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={text.dialogTitle}
        tag={searchingTag}
        className="dialog--wide sky-search-dialog"
        actions={<GuideButton />}
      >
        <div className="sky-search__layout">
          <div className="sky-search__main">
            <form className="sky-search__form" onSubmit={handleSubmit} noValidate>
              <section className="sky-search__step" aria-labelledby={conditionsId}>
                <StepHead id={conditionsId} title={text.steps.conditions} help={conditionsHelp} />
                <div className="sky-search__grid" role="group" aria-labelledby={conditionsId} aria-describedby={errors.length > 0 ? errorId : undefined}>
                  <span aria-hidden="true" />
                  <span className="sky-search__head" aria-hidden="true">
                    {text.min}
                  </span>
                  <span className="sky-search__head" aria-hidden="true">
                    {text.max}
                  </span>
                  <span className="sky-search__head sky-search__head--possible" aria-hidden="true">
                    {text.possibleHeading}
                  </span>
                  {SKY_TARGETS.map((target) => {
                    const row = reading.rows[target];
                    const { bodies, angle } = SKY_TARGET_INFO[target];
                    const body = targetTone(target);
                    // Only single-body rows can be impossible at a site (see `skyFeasibility.ts`).
                    const impossible = row.kind === 'ok' && angle !== 'separation' && reading.impossible.includes(bodies[0]!);
                    const invalid = (bound: 'min' | 'max') =>
                      impossible || (row.kind === 'invalid' && (row.field === bound || row.field === 'both'));
                    const hintId = `${idBase}-${target}-hint`;
                    return (
                      <div key={target} className="sky-search__row" data-active={row.kind === 'ok'} data-body={body}>
                        <span className="sky-search__label">
                          <span className={`sky-search__body sky-search__body--${body}`}>{bodyName(target)}</span>
                          <span className="sky-search__angle">{angleName(target)}</span>
                          {/* Shown in the step's "i" window; kept here for screen readers. */}
                          <span className="visually-hidden" id={hintId}>
                            {text.angleHints[angle]}
                          </span>
                        </span>
                        {(['min', 'max'] as const).map((bound) => (
                          <input
                            key={bound}
                            id={fieldId(target, bound)}
                            className="text-input sky-search__input"
                            inputMode="decimal"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="—"
                            aria-label={text.fieldLabel(bodyName(target), angleName(target), bound === 'min' ? text.minimum : text.maximum)}
                            aria-describedby={hintId}
                            aria-invalid={invalid(bound)}
                            value={inputs[target][bound]}
                            onChange={(event) => setField(target, bound, event.target.value)}
                          />
                        ))}
                        <span className="sky-search__possible" data-target={target}>
                          <span className="sky-search__possible-label">{text.possibleHeading}: </span>
                          {possibleText(target)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {errors.length > 0 && (
                  <p id={errorId} className="hint hint--error">
                    {errors.join(' ')}
                  </p>
                )}
                {errors.length === 0 && wrapNotes.length > 0 && <p className="hint">{wrapNotes.join(' ')}</p>}
                {reading.active === 0 && errors.length === 0 && <p className="hint">{text.needOne}</p>}
                {filled && (
                  <button type="button" className="text-button sky-search__clear" onClick={() => setInputs(EMPTY_INPUTS)}>
                    {text.clear}
                  </button>
                )}
              </section>

              <section className="sky-search__step" aria-labelledby={directionId}>
                <StepHead id={directionId} title={text.steps.direction} help={directionHelp} />
                <div className="segmented sky-search__directions" role="group" aria-labelledby={directionId}>
                  {SKY_SEARCH_DIRECTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="segmented__option"
                      aria-pressed={direction === option}
                      title={text.directionHints[option]}
                      onClick={() => setDirection(option)}
                    >
                      {text.directions[option]}
                    </button>
                  ))}
                </div>
                <p className="hint sky-search__reference">{text.reference(currentSiteName, formatUtc(selection.utc))}</p>
              </section>

              <div className="sky-search__actions">
                <button type="submit" className={`button button--update ${canSearch ? 'button--go' : searching ? 'button--busy' : 'button--idle'}`} disabled={!canSearch} aria-busy={searching}>
                  {searching ? (
                    <>
                      {text.searching}
                      <span className="blink" aria-hidden="true">
                        _
                      </span>
                    </>
                  ) : (
                    <>[ {text.search} ]</>
                  )}
                </button>
                {searching && (
                  <button type="button" className="text-button sky-search__cancel" onClick={handleCancel}>
                    {text.cancel}
                  </button>
                )}
              </div>
              {searching && <p className="hint">{text.background}</p>}
            </form>

            <section className="sky-search__step" aria-labelledby={`${idBase}-result`}>
              <StepHead id={`${idBase}-result`} title={text.steps.result} />
              <div aria-live="polite" className="sky-search__result">
                {state.status === 'idle' && <p className="hint">{text.noResult}</p>}
                {state.status === 'searching' && (
                  <p className="hint">
                    {text.searching}
                    <span className="blink" aria-hidden="true">
                      _
                    </span>
                  </p>
                )}
                {state.status === 'error' && <p className="callout callout--error">{messages.errors[state.error.key]}</p>}
                {state.status === 'done' && (
                  <SearchResult
                    data={state.data}
                    current={sameSite(selection, state.data)}
                    siteName={siteName(state.data.site)}
                    formatRange={formatRange}
                    onShow={handleShow}
                    shownUtc={selection.utc}
                  />
                )}
              </div>
            </section>
          </div>

          <aside className="sky-search__guide" aria-labelledby={`${idBase}-examples`}>
            <section className="sky-search__guide-section">
              <StepHead id={`${idBase}-examples`} title={text.examplesHeading} help={examplesHelp} />
              <ul className="sky-search__examples">
                {SKY_SEARCH_EXAMPLES.map((example) => (
                  <li key={example} className="sky-search__example">
                    <span className="sky-search__example-title" title={text.examples[example].detail}>
                      {text.examples[example].title}
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={text.tryExampleLabel(text.examples[example].title)}
                      onClick={() => applyExample(example)}
                    >
                      {text.tryExample}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <div className="sky-search__footer">
          <button type="button" className="text-button" onClick={() => setOpen(false)}>
            {text.close}
          </button>
        </div>
      </Modal>
    </Box>
  );
}

/** Title of a step of the window, with an "i" button for its longer explanation when there is one. */
function StepHead({ id, title, help }: { id: string; title: string; help?: readonly string[] }) {
  return (
    <div className="sky-search__step-head">
      <h3 className="sky-search__step-title" id={id}>
        {title}
      </h3>
      {help && <HelpButton section={title} paragraphs={help} />}
    </div>
  );
}

/** "i" button in the window's title rule: the extended guide, in its own window. */
function GuideButton() {
  const { messages } = useI18n();
  const text = messages.skySearch;
  return (
    <DialogButton
      label="i"
      ariaLabel={messages.common.help(text.guideHeading)}
      buttonClassName="icon-button icon-button--info"
      title={text.guideHeading}
      dialogClassName="dialog--guide"
    >
      {text.guide.map((section) => (
        <section key={section.heading} className="sky-search__guide-section">
          <h3 className="sky-search__step-title">{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </DialogButton>
  );
}

/** One line in the box: conditions set and the state of the last search. */
function BoxSummary({ state, count }: { state: SearchState; count: number }) {
  const { messages } = useI18n();
  const text = messages.skySearch;
  let status: string | null = null;
  let tone = '';
  if (state.status === 'searching') status = `${text.searching}…`;
  else if (state.status === 'error') {
    status = messages.errors[state.error.key];
    tone = ' hint--error';
  } else if (state.status === 'done') {
    status = state.data.outcome.status === 'found' ? `${text.lastMatch}: ${formatUtc(state.data.outcome.match.utc)}` : text.lastNone;
  }
  return (
    <p className={`hint sky-search__summary${tone}`} aria-live="polite">
      {text.summary(count)}
      {status && <> · {status}</>}
    </p>
  );
}

interface SearchResultProps {
  readonly data: SkySearchResponse;
  /** The result belongs to the site selected now. */
  readonly current: boolean;
  readonly siteName: string;
  readonly formatRange: (range: AngleRange) => string;
  readonly onShow: (utc: string) => void;
  readonly shownUtc: string;
}

function SearchResult({ data, current, siteName, formatRange, onShow, shownUtc }: SearchResultProps) {
  const { locale, messages } = useI18n();
  const text = messages.skySearch;
  const { outcome } = data;
  const searchedStart = formatUtc(data.searched.startUtc);
  const searchedEnd = formatUtc(data.searched.endUtc);

  if (outcome.status === 'not-found') {
    return (
      <p className="callout callout--warning">
        {outcome.reason === 'budget' ? text.budget(searchedStart, searchedEnd) : text.notFound(searchedStart, searchedEnd)}
      </p>
    );
  }

  const { match } = outcome;
  const targets = SKY_TARGETS.filter((target) => data.conditions[target] !== undefined);
  return (
    <div className="sky-search__match">
      <p className="sky-search__match-head">
        <span className="sky-search__match-title">{text.matchHeading}</span>
        <span className="sky-search__match-time">{formatUtc(match.utc)}</span>
      </p>
      <p className="hint">
        {text.offset}: {formatOffset(match.offsetSeconds)}
      </p>
      <table className="readings sky-search__values">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{messages.results.object}</span>
            </th>
            <th scope="col">{text.condition}</th>
            <th scope="col">{text.value}</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target}>
              <th scope="row">
                {targetBodyName(target, messages)} · {text.angles[SKY_TARGET_INFO[target].angle].toLowerCase()}
              </th>
              <td>{formatRange(data.conditions[target] as AngleRange)}</td>
              <td>{formatDegrees(match.values[target] ?? null, locale) ?? messages.results.noValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!outcome.complete && <p className="callout callout--warning">{text.incomplete}</p>}
      {current ? (
        <>
          {shownUtc === match.utc && <p className="hint">{text.shown}</p>}
          <button type="button" className="text-button sky-search__show" onClick={() => onShow(match.utc)}>
            {text.show}
          </button>
        </>
      ) : (
        <p className="hint hint--error">{text.otherSite(siteName)}</p>
      )}
      <p className="hint sky-search__precision">{text.precision}</p>
    </div>
  );
}
