/**
 * Top-right corner of the local horizon view: time left until the Sun and the
 * Earth set (or rise, when below the horizon) after the shown site and
 * instant. Definition and method in `horizonEvents.ts`; each body needs one
 * inverse search, made when the shown result changes. Answers are kept for
 * the session, so switching views or going back to an instant does not ask
 * again; failed searches are not kept.
 *
 * JPL asks for one Horizons request at a time (see
 * `docs/LUNAR_RELIABILITY_AUDIT.md`), so the searches wait while `paused`
 * (the page's own ephemeris query is running) and run one after another,
 * not in parallel.
 */

import { useEffect, useMemo, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { fetchSkySearch } from '../../api/skySearchClient';
import { formatDuration, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import type { PlacedBodies } from './bodies';
import { countdownConditions, countdownOutcome, countdownPlan, type CountdownOutcome, type CountdownPlan } from './horizonEvents';

type Entry = CountdownOutcome | { readonly status: 'error' };

/** Answers by search key, for the session. */
const answered = new Map<string, CountdownOutcome>();

function searchKey(data: EphemerisResponse, plan: CountdownPlan): string {
  const { site, requestedUtc } = data;
  return [site.id, site.latitudeDeg, site.longitudeEastDeg, requestedUtc, plan.body, plan.afterEvent.min, plan.afterEvent.max].join('|');
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
  const plans = useMemo(
    () =>
      bodies.placed.map((body) => {
        const plan = countdownPlan(body, data.site);
        return { plan, key: searchKey(data, plan) };
      }),
    [bodies, data],
  );
  const [entries, setEntries] = useState<Readonly<Record<string, Entry>>>({});

  useEffect(() => {
    if (paused) return;
    const controller = new AbortController();
    const selection = {
      siteId: data.site.id,
      latitudeDeg: data.site.latitudeDeg,
      longitudeEastDeg: data.site.longitudeEastDeg,
      utc: data.requestedUtc,
    };
    const pending = plans.filter(({ plan, key }) => !plan.never && !answered.has(key));
    void (async () => {
      // One search at a time (JPL's serial-request policy).
      for (const { plan, key } of pending) {
        const result = await fetchSkySearch({ selection, direction: 'after', conditions: countdownConditions(plan) }, controller.signal);
        if (controller.signal.aborted) return;
        if (result.ok) {
          const outcome = countdownOutcome(result.data);
          answered.set(key, outcome);
          setEntries((current) => ({ ...current, [key]: outcome }));
        } else {
          console.error('[horizon-countdown]', result.error.key, result.error.detail);
          setEntries((current) => ({ ...current, [key]: { status: 'error' } }));
        }
      }
    })();
    return () => controller.abort();
  }, [data, plans, paused]);

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
    <div className="scene__countdown" role="group" aria-label={text.label} title={text.detail}>
      {plans.map(({ plan, key }) => {
        const entry = answered.get(key) ?? entries[key];
        const at = !plan.never && entry?.status === 'found' ? text.at(formatUtc(entry.utc)) : undefined;
        return (
          <p key={plan.body} className="scene__countdown-row" data-body={plan.body} data-pending={!plan.never && !entry}>
            <span className="scene__countdown-event">{text.events[plan.body][plan.event]}</span>
            <span className="scene__countdown-value" title={at}>
              {valueText(plan, entry)}
            </span>
          </p>
        );
      })}
    </div>
  );
}
