/**
 * Compact text summary (docs/GUIA_PRIMERA_DEMO.md): place, its coordinates
 * and time, azimuth
 * and elevation of the Sun and Earth in degrees, short plain-language states
 * (full sentence as tooltip), and the visible terrain warning. Sources and the
 * method open in dialogs from the box title; the Sources dialog lists this
 * query's sources and then the project-wide list (`sourceCatalog.ts`), each
 * with the reason it is used, in a scrollable window. Range and range-rate are
 * intentionally not shown. Missing values are labeled, never shown as zero.
 *
 * While a query runs (`busy`) the values scramble and decode into the new
 * result when it arrives; the previous values stay readable to assistive
 * technology until then.
 */

import type { ReactNode } from 'react';
import { BODY_IDS, type BodyId, type BodyResult, type EphemerisResponse } from '../../../shared/ephemeris';
import { presenceOfTarget } from '../../../shared/presence';
import { CUSTOM_SITE_ID, findSite, isSiteId } from '../../../shared/sites';
import type { ClientError } from '../../api/ephemerisClient';
import { formatCoordinates, formatDegrees, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';
import { DialogButton } from '../../ui/DialogButton';
import { ScrambleText } from '../../ui/ScrambleText';
import { SOURCE_CATALOG, type SourceGroup } from './sourceCatalog';

interface ResultsPanelProps {
  readonly data: EphemerisResponse;
  readonly error: ClientError | null;
  /** A query is running: scramble the values until the new result arrives. */
  readonly busy: boolean;
  /** Data status tag (sample, live, pending…) shown in the title rule. */
  readonly status?: ReactNode;
}

export function ResultsPanel({ data, error, busy, status }: ResultsPanelProps) {
  const { locale, messages } = useI18n();
  const { results } = messages;
  const siteName = data.site.id === CUSTOM_SITE_ID ? messages.config.customName : data.site.name;
  const coordinates = formatCoordinates(data.site.latitudeDeg, data.site.longitudeEastDeg, locale, messages.hemisphere);

  return (
    <Box
      title={results.heading}
      titleAs="h3"
      className="results"
      tag={status}
      help={results.info}
      actions={
        <DialogButton label={results.sources} buttonClassName="text-button" title={results.sources}>
          <Sources data={data} />
        </DialogButton>
      }
    >
      <div aria-live="polite" aria-busy={busy} className="results__content">
        <p className="results__case">
          <span className="results__place">
            <ScrambleText className="results__site" text={siteName} active={busy} />
            <span className="results__coords">
              <span className="visually-hidden">{results.coordinates}: </span>
              <ScrambleText text={coordinates} active={busy} />
            </span>
          </span>
          <ScrambleText className="results__time" text={formatUtc(data.ephemerisUtc ?? data.requestedUtc)} active={busy} />
        </p>

        {error && <p className="callout callout--error">{messages.errors[error.key]}</p>}

        <table className="readings">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">{results.object}</span>
              </th>
              <th scope="col">{results.azimuth}</th>
              <th scope="col">{results.elevation}</th>
              <th scope="col">{results.state}</th>
            </tr>
          </thead>
          <tbody>
            {BODY_IDS.map((body) => (
              <BodyRow key={body} body={body} result={data.bodies[body]} busy={busy} />
            ))}
          </tbody>
        </table>

        {data.warnings.includes('PARTIAL_RESULT') && <p className="callout">{results.partial}</p>}
        {data.warnings.includes('HORIZONS_API_VERSION_UNVERIFIED') && <p className="callout">{results.versionUnverified}</p>}

      </div>
    </Box>
  );
}

function Sources({ data }: { data: EphemerisResponse }) {
  const { messages } = useI18n();
  const { results } = messages;
  const retrievedAt = formatUtc(data.source.retrievedAt);
  const variantOf = isSiteId(data.site.id) ? findSite(data.site.id).variantOf : undefined;
  const variantBase = variantOf ? findSite(variantOf).name : null;
  return (
    <div className="sources-list">
      <h3 className="sources__group">{results.sourcesCurrent}</h3>
      <p>{data.provenance === 'saved-sample' ? results.provenanceSample(retrievedAt) : results.provenanceLive(retrievedAt)}</p>
      <ul className="sources">
        <li>
          {results.siteSource}:{' '}
          {data.site.source ? (
            <>
              <a href={data.site.source.url} target="_blank" rel="noreferrer">
                {data.site.source.name}
              </a>
              {data.site.source.locator ? `, ${data.site.source.locator}` : ''}
            </>
          ) : (
            results.siteSourceCustom
          )}
        </li>
        {variantBase && <li>{results.siteVariant(variantBase)}</li>}
        <li>
          {results.positionSource}:{' '}
          <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">
            {data.source.name}
          </a>
          {[data.source.planetaryEphemeris, data.source.observerFrame].filter(Boolean).map((part) => `, ${part}`)}
        </li>
      </ul>
      <SourceGroupList group="app" heading={results.sourcesApp} />
      <SourceGroupList group="research" heading={results.sourcesResearch} />
    </div>
  );
}

/** One group of the project-wide source list, each line with the reason it is listed. */
function SourceGroupList({ group, heading }: { group: SourceGroup; heading: string }) {
  const { results } = useI18n().messages;
  return (
    <>
      <h3 className="sources__group">{heading}</h3>
      <ul className="sources">
        {SOURCE_CATALOG.filter((source) => source.group === group).map((source) => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
            <span className="sources__reason">{results.sourceReasons[source.id]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function BodyRow({ body, result, busy }: { body: BodyId; result: BodyResult; busy: boolean }) {
  const { locale, messages } = useI18n();
  const name = (
    <th scope="row" className={`readings__body readings__body--${body}`}>
      {messages.bodies[body]}
    </th>
  );

  if (result.status === 'error') {
    return (
      <tr>
        {name}
        <td colSpan={3} className="readings__error">
          <ScrambleText text={`${messages.results.bodyError} ${messages.errors[result.error.code]}`} active={busy} />
        </td>
      </tr>
    );
  }

  const { observation } = result;
  const presence = presenceOfTarget(observation);
  const straddles =
    body === 'earth' &&
    presence === 'upper-limb-above-reference-horizon' &&
    observation.elevationDeg !== null &&
    observation.elevationDeg < 0;
  const fullState = `${messages.presence[body][presence]}${straddles ? ` ${messages.presence.earthStraddles}` : ''}`;

  return (
    <tr>
      {name}
      <td className="readings__value">
        <ScrambleText text={formatDegrees(observation.azimuthDeg, locale) ?? messages.results.noValue} active={busy} />
      </td>
      <td className="readings__value">
        <ScrambleText text={formatDegrees(observation.elevationDeg, locale) ?? messages.results.noValue} active={busy} />
      </td>
      <td className={`readings__state readings__state--${presence}`} title={fullState}>
        <span aria-hidden="true">
          <ScrambleText text={messages.presence.short[presence]} active={busy} />
          {straddles && (
            <span className="readings__aside">
              {' '}
              (<ScrambleText text={messages.presence.earthStraddlesShort} active={busy} />)
            </span>
          )}
        </span>
        <span className="visually-hidden">{fullState}</span>
      </td>
    </tr>
  );
}
