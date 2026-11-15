/**
 * Horizon playback: an interval dialog and, once the interval is loaded, a
 * player laid over the bottom of the local horizon view (like the zoom
 * control), inside the box and its full screen.
 *
 * The dialog has two columns: the UTC start (the same date and time wheels
 * as the main form, plus "start at the rise of" the Sun or the Earth, see
 * `nextRise.ts`) and the number of samples (24 by default, typed) on one
 * side; the time per sample (a Sun or Earth preset that spreads half that
 * body's cycle over the samples, or a custom hours-and-minutes step, see
 * `playback.ts`) and the derived end on the other. Details on the JPL
 * Horizons queries are in its "i".
 *
 * Samples come from `/api/ephemeris-series` (one Horizons request per body
 * for up to 100 samples; longer intervals load in consecutive chunks), so the
 * frames are the same Horizons observations as single results. Loading
 * reports progress, can be cancelled (also by closing the dialog) and stops
 * at the first failed or incomplete frame, keeping a previous sequence.
 *
 * While playing, the camera can be centered on the Sun or the Earth
 * (`follow`, applied by the views), and the loaded sequence is handed out
 * (`onSequence`) so the views can draw each body's course. Mounted per
 * selection: navigation aborts loading and discards the old sequence.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { HelpButton } from '../../ui/DialogButton';
import type { BodyId, EphemerisResponse } from '../../../shared/ephemeris';
import { fetchEphemerisSeries, type EphemerisSelection } from '../../api/ephemerisClient';
import { formatMinutes, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { usePreferences } from '../../preferences/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import { Modal } from '../../ui/Modal';
import { NumberWheel } from '../../ui/NumberWheel';
import { DateTimeWheels } from '../mission-config/DateTimeWheels';
import { fieldsToUtc, utcToFields, type DateTimeFields } from '../mission-config/timeZone';
import {
  DEFAULT_SAMPLES,
  MAX_SAMPLES,
  MIN_SAMPLES,
  STEP_PRESETS,
  playbackChunks,
  playbackPlan,
  presetSpanDays,
  presetStepMinutes,
  type StepPreset,
} from './playback';
import { ceilToMinute, findNextRise, type NextRise } from './nextRise';

/** Body the camera stays centered on during playback, or null for a free camera. */
export type CameraFollow = BodyId | null;

/** Largest custom step on the hour wheel. */
const MAX_CUSTOM_HOURS = 240;
const SPEEDS = [0.5, 1, 2, 4] as const;

function completeFrame(frame: EphemerisResponse): boolean {
  return (
    frame.provenance === 'live' &&
    [frame.bodies.sun, frame.bodies.earth].every(
      (body) => body.status === 'ok' && body.observation.azimuthDeg !== null && body.observation.elevationDeg !== null,
    )
  );
}

export function HorizonPlayback({
  selection,
  open,
  onClose,
  onFrame,
  onActive,
  onSequence,
  follow,
  onFollowChange,
}: {
  selection: EphemerisSelection;
  /** The interval dialog is shown (opened from the view's title rule). */
  open: boolean;
  onClose: () => void;
  onFrame: (frame: EphemerisResponse | null) => void;
  onActive: (active: boolean) => void;
  /** Every frame of the loaded sequence (for the course lines), or null. */
  onSequence?: (frames: readonly EphemerisResponse[] | null) => void;
  follow: CameraFollow;
  onFollowChange: (follow: CameraFollow) => void;
}) {
  const { messages, locale } = useI18n();
  const { preferences, configured } = usePreferences();
  const animated = configured && preferences.effects === 'on' && !prefersReducedMotion();
  const text = messages.playback;
  const samplesId = useId();
  const stepTitleId = useId();
  const stepHintId = useId();
  const startTitleId = useId();
  const riseTitleId = useId();
  const [startFields, setStartFields] = useState<DateTimeFields>(() => utcToFields(selection.utc, 'utc'));
  const [samplesText, setSamplesText] = useState(String(DEFAULT_SAMPLES));
  const [preset, setPreset] = useState<StepPreset>('sun');
  const [custom, setCustom] = useState({ hours: 1, minutes: 0 });
  const [frames, setFrames] = useState<EphemerisResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [rise, setRise] = useState<{ body: BodyId; result: NextRise | null } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const riseController = useRef<AbortController | null>(null);

  const start = fieldsToUtc(startFields, 'utc');
  const samples = /^\d+$/.test(samplesText.trim()) ? Number(samplesText.trim()) : Number.NaN;
  const samplesValid = Number.isInteger(samples) && samples >= MIN_SAMPLES && samples <= MAX_SAMPLES;
  const stepMinutes =
    preset === 'custom' ? custom.hours * 60 + custom.minutes : presetStepMinutes(preset, samplesValid ? samples : DEFAULT_SAMPLES);
  const plan = start.ok && samplesValid ? playbackPlan(start.iso, samples, stepMinutes) : null;

  useEffect(() => () => {
    controller.current?.abort();
    riseController.current?.abort();
  }, []);

  /** Moves the start to the next rise of `body` after the current start (and picks that body's preset). */
  async function startAtRise(body: BodyId) {
    if (!start.ok) return;
    riseController.current?.abort();
    const request = new AbortController();
    riseController.current = request;
    setRise({ body, result: null });
    const result = await findNextRise({ ...selection, utc: start.iso }, body, request.signal);
    if (request.signal.aborted) return;
    riseController.current = null;
    if (result.status === 'error') console.error('[horizon-playback] rise search', result.key);
    setRise({ body, result });
    if (result.status === 'found') {
      setStartFields(utcToFields(ceilToMinute(result.utc), 'utc'));
      if (preset !== 'custom') setPreset(body);
    }
  }

  /** Closing the dialog cancels loading and a running rise search. */
  function closeDialog() {
    cancel();
    if (riseController.current) {
      riseController.current.abort();
      riseController.current = null;
      setRise(null);
    }
    onClose();
  }

  function changeStart(fields: DateTimeFields) {
    riseController.current?.abort();
    riseController.current = null;
    setRise(null);
    setStartFields(fields);
  }

  // Opening the dialog pauses the player.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = index + 1;
      if (next >= frames.length) { setPlaying(false); return; }
      setIndex(next);
      onFrame(frames[next]!);
      if (next === frames.length - 1) setPlaying(false);
    }, 500 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, frames, speed, onFrame]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);

  function seek(next: number) {
    setPlaying(false);
    setIndex(next);
    onFrame(frames[next]!);
  }

  function cancel() {
    controller.current?.abort();
    setProgress(null);
    onActive(frames.length > 0);
  }

  function fail() {
    setError(true);
    setProgress(null);
    onActive(frames.length > 0);
  }

  async function prepare() {
    if (riseSearching) return;
    if (!plan) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPlaying(false);
    setError(false);
    setProgress(0);
    onActive(true);
    const loaded: EphemerisResponse[] = [];
    // Serial chunks (JPL asks for one request at a time); playback and seeking never query the network.
    for (const chunk of playbackChunks(plan)) {
      const result = await fetchEphemerisSeries(
        { selection, startUtc: chunk.startUtc, stepMinutes: plan.stepMinutes, count: chunk.count },
        request.signal,
      );
      if (request.signal.aborted) return;
      if (!result.ok) {
        console.error('[horizon-playback]', result.error.key, result.error.detail);
        fail();
        return;
      }
      if (!result.frames.every(completeFrame)) { fail(); return; }
      loaded.push(...result.frames);
      setProgress(loaded.length);
    }
    setFrames(loaded);
    setIndex(0);
    onSequence?.(loaded);
    onFrame(loaded[0]!);
    setProgress(null);
    onClose();
  }

  function exit() {
    setPlaying(false);
    setFrames([]);
    onSequence?.(null);
    onFrame(null);
    onActive(false);
    onFollowChange(null);
  }

  const ready = frames.length > 0;
  const riseSearching = rise !== null && rise.result === null;
  const stepText = formatMinutes(stepMinutes);
  const presetHint =
    preset === 'custom'
      ? null
      : text.presetHint[preset](
          stepText,
          (samplesValid ? samples : DEFAULT_SAMPLES).toLocaleString(locale),
          presetSpanDays(preset).toLocaleString(locale, { maximumFractionDigits: 2 }),
        );
  const riseText = (() => {
    if (!rise) return null;
    const { body, result } = rise;
    if (!result) return text.rise.searching[body];
    if (result.status === 'found') return text.rise.found(messages.scene.countdown.events[body].rise, formatUtc(result.utc));
    if (result.status === 'always-up') return text.rise.alwaysUp[body];
    if (result.status === 'always-down') return text.rise.alwaysDown[body];
    if (result.status === 'not-found') return text.rise.notFound[body];
    return text.rise.error[body];
  })();

  return (
    <>
      {ready && (
        <div className="horizon-playback" role="group" aria-label={text.title}>
          <div className="horizon-playback__bar">
            <button type="button" aria-label={text.restart} title={text.restart} onClick={() => seek(0)}>↤</button>
            <button type="button" aria-label={playing ? text.pause : text.play} title={playing ? text.pause : text.play}
              onClick={() => {
                if (!playing && index === frames.length - 1) { setIndex(0); onFrame(frames[0]!); }
                setPlaying(!playing);
              }}>{playing ? 'Ⅱ' : '▶'}</button>
            <input type="range" min={0} max={frames.length - 1} step={1} value={index}
              aria-label={text.timeline} aria-valuetext={formatUtc(frames[index]!.requestedUtc)}
              onChange={(event) => seek(Number(event.target.value))} />
            <select aria-label={text.speed} title={text.speed} value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              {SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}
            </select>
            <select aria-label={text.follow.label} title={text.follow.label} value={follow ?? 'free'}
              onChange={(event) => onFollowChange(event.target.value === 'free' ? null : (event.target.value as BodyId))}>
              <option value="free">{text.follow.free}</option>
              <option value="sun">{text.follow.sun}</option>
              <option value="earth">{text.follow.earth}</option>
            </select>
            <button type="button" aria-label={text.exit} title={text.exit} onClick={exit}>×</button>
          </div>
          <output className="horizon-playback__time">{formatUtc(frames[index]!.requestedUtc)} · {index + 1}/{frames.length}</output>
        </div>
      )}
      <Modal open={open} onClose={closeDialog} title={text.title} className="playback-dialog"
        actions={<HelpButton section={text.title} paragraphs={text.info} />}>
        <form className="playback-form" onSubmit={(event) => { event.preventDefault(); void prepare(); }}>
          <p>{text.description}</p>
          <fieldset disabled={progress !== null}>
            <div className="playback-form__columns">
              <div className="playback-form__column">
                <div className="playback-form__field" role="group" aria-labelledby={startTitleId}>
                  <span className="search-field__label" id={startTitleId}>{text.start}</span>
                  <DateTimeWheels fields={startFields} onChange={changeStart} invalid={!start.ok} animated={animated} />
                  <div className="playback-rise" role="group" aria-labelledby={riseTitleId}>
                    <span id={riseTitleId} className="playback-rise__label">{text.rise.label}</span>
                    {(['sun', 'earth'] as const).map((body) => (
                      <button key={body} type="button" className="text-button" disabled={!start.ok || (rise?.body === body && !rise.result)}
                        onClick={() => void startAtRise(body)}>
                        <span aria-hidden="true">↑ </span>{text.rise.bodies[body]}
                      </button>
                    ))}
                  </div>
                  {riseText && (
                    <p className={`hint${rise?.result && rise.result.status !== 'found' ? ' hint--error' : ''}`} role="status">{riseText}</p>
                  )}
                </div>
                <label className="playback-form__field" htmlFor={samplesId}>
                  <span className="search-field__label">{text.samples}</span>
                  <input id={samplesId} className="text-input" type="number" inputMode="numeric" required
                    min={MIN_SAMPLES} max={MAX_SAMPLES} step={1} value={samplesText}
                    aria-invalid={!samplesValid}
                    onChange={(event) => setSamplesText(event.target.value)} />
                </label>
              </div>
              <div className="playback-form__column">
                <div className="playback-form__field" role="group" aria-labelledby={stepTitleId}>
                  <span className="search-field__label" id={stepTitleId}>{text.step.label}</span>
                  <div className="playback-presets" role="radiogroup" aria-labelledby={stepTitleId} aria-describedby={stepHintId}>
                    {STEP_PRESETS.map((option) => (
                      <button key={option} type="button" role="radio" aria-checked={preset === option}
                        className="playback-presets__option" onClick={() => setPreset(option)}>
                        {text.step.presets[option]}
                      </button>
                    ))}
                  </div>
                  {preset === 'custom' && (
                    <div className="datetime__wheels playback-form__step">
                      <NumberWheel label={text.step.hours} value={custom.hours} min={0} max={MAX_CUSTOM_HOURS} wrap={false}
                        animated={animated} invalid={stepMinutes < 1} describedBy={stepHintId}
                        onChange={(hours) => setCustom((current) => ({ ...current, hours }))} />
                      <NumberWheel label={text.step.minutes} value={custom.minutes} min={0} max={59}
                        animated={animated} invalid={stepMinutes < 1} describedBy={stepHintId}
                        onChange={(minutes) => setCustom((current) => ({ ...current, minutes }))} />
                    </div>
                  )}
                  <p className="hint" id={stepHintId}>{presetHint ?? text.step.customHint(stepText)}</p>
                </div>
                <p className="playback-form__end">
                  {text.end}: {plan ? <>{formatUtc(plan.endUtc)} · {text.span(formatMinutes((plan.samples - 1) * plan.stepMinutes))}</> : '—'}
                </p>
              </div>
            </div>
          </fieldset>
          {!samplesValid && <p role="alert" className="hint hint--error">{text.invalidSamples(MIN_SAMPLES, MAX_SAMPLES)}</p>}
          {samplesValid && !plan && <p role="alert" className="hint hint--error">{text.invalid}</p>}
          {error && <p role="alert" className="hint hint--error">{text.error}</p>}
          {progress !== null && plan ? <>
            <p role="status">{text.loading(progress, plan.samples)}</p>
            <progress value={progress} max={plan.samples} aria-label={text.title} />
            <button type="button" className="button" onClick={cancel}>{text.cancel}</button>
          </> : <button type="submit" className={`button ${riseSearching ? 'button--busy' : plan ? 'button--go' : 'button--idle'}`} disabled={!plan || riseSearching} aria-busy={riseSearching}>{text.prepare}</button>}
        </form>
      </Modal>
    </>
  );
}
