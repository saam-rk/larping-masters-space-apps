import { useEffect, useRef, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { SUPPORTED_UTC_RANGE } from '../../../shared/time';
import { fetchEphemeris, type EphemerisSelection } from '../../api/ephemerisClient';
import { formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Modal } from '../../ui/Modal';
import { playbackInstants } from './playback';

/** Mounted per selection: navigation aborts loading and discards the old sequence. */
export function HorizonPlayback({ selection, onFrame, onActive }: {
  selection: EphemerisSelection;
  onFrame: (frame: EphemerisResponse | null) => void;
  onActive: (active: boolean) => void;
}) {
  const { messages } = useI18n();
  const text = messages.playback;
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(selection.utc.slice(0, 19));
  const [end, setEnd] = useState(() => new Date(Math.min(Date.parse(selection.utc) + 86400000,
    Date.parse(SUPPORTED_UTC_RANGE.endExclusive) - 1000)).toISOString().slice(0, 19));
  const [count, setCount] = useState(25);
  const [frames, setFrames] = useState<EphemerisResponse[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const instants = playbackInstants(start, end, count);

  useEffect(() => () => controller.current?.abort(), []);

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

  async function prepare() {
    if (!instants) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPlaying(false);
    setError(false);
    setProgress(0);
    onActive(true);
    const loaded: EphemerisResponse[] = [];
    // Keep the existing endpoint, provenance, sizes, distances and presence markers.
    // Serial, bounded requests; playback and seeking never query the network.
    for (const utc of instants) {
      const result = await fetchEphemeris({ ...selection, utc }, request.signal);
      if (request.signal.aborted) return;
      if (!result.ok || result.data.provenance !== 'live' ||
        [result.data.bodies.sun, result.data.bodies.earth].some((body) => body.status !== 'ok' ||
          body.observation.azimuthDeg === null || body.observation.elevationDeg === null)) {
        setError(true);
        setProgress(null);
        onActive(frames.length > 0);
        return;
      }
      loaded.push(result.data);
      setProgress(loaded.length);
    }
    setFrames(loaded);
    setIndex(0);
    onFrame(loaded[0]!);
    setProgress(null);
    setOpen(false);
  }

  const ready = frames.length > 0;
  return (
    <div className="horizon-playback" data-ready={ready}>
      <div className="horizon-playback__bar" role="group" aria-label={text.title}>
        <button type="button" onClick={() => { setPlaying(false); setOpen(true); }} title={text.interval}>{text.interval}</button>
        {ready && <>
          <button type="button" aria-label={text.restart} title={text.restart} onClick={() => seek(0)}>↤</button>
          <button type="button" aria-label={playing ? text.pause : text.play} title={playing ? text.pause : text.play}
            onClick={() => {
              if (!playing && index === frames.length - 1) { setIndex(0); onFrame(frames[0]!); }
              setPlaying(!playing);
            }}>{playing ? 'Ⅱ' : '▶'}</button>
          <input type="range" min={0} max={frames.length - 1} step={1} value={index}
            aria-label={text.timeline} aria-valuetext={formatUtc(frames[index]!.requestedUtc)}
            onChange={(event) => seek(Number(event.target.value))} />
          <select aria-label={text.speed} value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {[0.5, 1, 2, 4].map((value) => <option key={value} value={value}>{value}×</option>)}
          </select>
          <button type="button" aria-label={text.exit} title={text.exit} onClick={() => {
            setPlaying(false); setFrames([]); onFrame(null); onActive(false);
          }}>×</button>
        </>}
      </div>
      {ready && <output className="horizon-playback__time">{formatUtc(frames[index]!.requestedUtc)} · {index + 1}/{frames.length}</output>}
      <Modal open={open} onClose={() => { cancel(); setOpen(false); }} title={text.title}>
        <form className="playback-form" onSubmit={(event) => { event.preventDefault(); void prepare(); }}>
          <p>{text.description}</p>
          <fieldset disabled={progress !== null}>
            <label>{text.start}<input className="text-input" type="datetime-local" step="1" required value={start}
              min={SUPPORTED_UTC_RANGE.startInclusive.slice(0, 19)} max="2099-12-31T23:59:59"
              onChange={(event) => setStart(event.target.value)} /></label>
            <label>{text.end}<input className="text-input" type="datetime-local" step="1" required value={end}
              min={SUPPORTED_UTC_RANGE.startInclusive.slice(0, 19)} max="2099-12-31T23:59:59"
              onChange={(event) => setEnd(event.target.value)} /></label>
            <label>{text.samples}<select className="text-input" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              {[25, 61, 121].map((value) => <option key={value} value={value}>{value}</option>)}
            </select></label>
          </fieldset>
          <p className="hint">{text.detail}</p>
          {!instants && <p role="alert">{text.invalid}</p>}
          {error && <p role="alert">{text.error}</p>}
          {progress !== null ? <>
            <p role="status">{text.loading(progress, instants!.length)}</p>
            <progress value={progress} max={instants!.length} aria-label={text.title} />
            <button type="button" onClick={cancel}>{text.cancel}</button>
          </> : <button type="submit" disabled={!instants}>{text.prepare}</button>}
        </form>
      </Modal>
    </div>
  );
}
