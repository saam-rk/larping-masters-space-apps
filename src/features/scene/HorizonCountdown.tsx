/**
 * Top-right corner of the local horizon view: time left until the Sun and the
 * Earth set (or rise, when below the horizon) after the shown site and
 * instant. Definition and method in `horizonEvents.ts`. ↓ marks a set and ↑ a
 * rise, in each body's color.
 *
 * Each body's side of the horizon is read from the shown result, so once a
 * body has gone below its threshold the row switches to the time until it
 * rises (and back). What a search establishes is kept for the session as a
 * `CountdownRecord`: a later instant before the found event (e.g. the next
 * frames of a horizon playback) is answered from it without asking again, and
 * switching views or going back to an instant does not ask again either.
 * Failed searches are not kept.
 *
 * JPL asks for one Horizons request at a time (see
 * `docs/LUNAR_RELIABILITY_AUDIT.md`), so searches run one after another and
 * wait while `paused` (the page's own ephemeris query is running). A search
 * already running is not restarted when the shown instant changes (playback
 * frames); when it ends, the instant shown then is checked again.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { fetchSkySearch } from '../../api/skySearchClient';
import { formatDuration, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { HelpButton } from '../../ui/DialogButton';
import type { PlacedBodies } from './bodies';
import {
  countdownConditions,
  countdownPlan,
  countdownRecord,
  recallCountdown,
  type CountdownOutcome,
  type CountdownPlan,
  type CountdownRecord,
} from './horizonEvents';

type Entry = CountdownOutcome | { readonly status: 'error' };

/** What the searches established, for the session. */
const records: CountdownRecord[] = [];

function siteKey(data: EphemerisResponse): string {
  return [data.site.id, data.site.latitudeDeg, data.site.longitudeEastDeg].join('|');
}

/** Identifies a failed search: site, instant, body and event. */
function failureKey(data: EphemerisResponse, plan: CountdownPlan): string {
  return [siteKey(data), data.requestedUtc, plan.body, plan.event].join('|');
}

export function HorizonCountdown({
  data,
  bodies,
  paused = false,
}: {
  data: EphemerisResponse;
  bodies: PlacedBodies;
  /** Hold (and cancel) the searches, e.g. while the page queries a new result. */
  paused?: boolean;
}) {
  const { messages, locale } = useI18n();
  const text = messages.scene.countdown;
  const site = siteKey(data);
  const atMs = Date.parse(data.requestedUtc);
  const plans = useMemo(() => bodies.placed.map((body) => countdownPlan(body, data.site)), [bodies, data.site]);
  // Bumped when a search ends, so the shown instant is checked again.
  const [version, setVersion] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const running = useRef<AbortController | null>(null);

  const entryFor = (plan: CountdownPlan): Entry | undefined =>
    recallCountdown(records, site, plan, atMs) ?? (failed.has(failureKey(data, plan)) ? { status: 'error' } : undefined);

  // The next body without an answer at the shown instant (none while a search runs).
  const next = plans.find((plan) => !plan.never && entryFor(plan) === undefined);

  useEffect(() => {
    if (paused || !next || running.current) return;
    const controller = new AbortController();
    running.current = controller;
    const plan = next;
    const shown = data;
    const selection = {
      siteId: shown.site.id,
      latitudeDeg: shown.site.latitudeDeg,
      longitudeEastDeg: shown.site.longitudeEastDeg,
      utc: shown.requestedUtc,
    };
    void (async () => {
      const result = await fetchSkySearch({ selection, direction: 'after', conditions: countdownConditions(plan) }, controller.signal);
      if (controller.signal.aborted) return;
      running.current = null;
      if (result.ok) {
        records.push(countdownRecord(siteKey(shown), plan, result.data));
      } else {
        console.error('[horizon-countdown]', result.error.key, result.error.detail);
        setFailed((current) => new Set(current).add(failureKey(shown, plan)));
      }
      setVersion((value) => value + 1);
    })();
    // The search keeps running across new instants; it is only cancelled below.
  }, [paused, next, data, version]);

  // Pausing or leaving the view cancels the running search.
  useEffect(() => {
    if (!paused) return;
    running.current?.abort();
    running.current = null;
  }, [paused]);
  useEffect(() => () => {
    running.current?.abort();
    running.current = null;
  }, []);

  if (plans.length === 0) return null;

  const valueText = (plan: CountdownPlan, entry: Entry | undefined): string => {
    if (plan.never) return text.never[plan.event];
    if (!entry) return text.loading;
    if (entry.status === 'error') return text.error;
    if (entry.status === 'budget') return text.budget;
    if (entry.status === 'beyond') return text.beyond(entry.days.toLocaleString(locale));
    if (entry.seconds <= 0) return text.now;
    const duration = formatDuration(entry.seconds);
    return entry.complete ? text.in(duration) : text.atMost(duration);
  };

  return (
    <div className="scene__countdown" role="group" aria-label={text.label}>
      <div className="scene__countdown-head">
        <span className="scene__countdown-heading" title={text.detail}>{text.heading}</span>
        <span className="scene__countdown-rule" aria-hidden="true" />
        <HelpButton section={text.heading} paragraphs={text.info} />
      </div>
      {plans.map((plan) => {
        const entry = plan.never ? undefined : entryFor(plan);
        const at = entry?.status === 'found' ? text.at(formatUtc(entry.utc)) : undefined;
        return (
          <p key={plan.body} className="scene__countdown-row" data-body={plan.body} data-event={plan.event} data-pending={!plan.never && !entry}>
            <span className="scene__countdown-event">
              <span className="scene__countdown-arrow" aria-hidden="true">{plan.event === 'rise' ? '↑' : '↓'}</span>
              {text.events[plan.body][plan.event]}
            </span>
            <span className="scene__countdown-value" title={at}>
              {valueText(plan, entry)}
            </span>
          </p>
        );
      })}
    </div>
  );
}
