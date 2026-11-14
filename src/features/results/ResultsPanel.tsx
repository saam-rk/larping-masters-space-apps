/**
 * Compact text summary (docs/GUIA_PRIMERA_DEMO.md): place and time, azimuth
 * and elevation of the Sun and Earth in degrees, short plain-language states
 * (full sentence as tooltip), and the visible terrain warning. Sources and the
 * method open in dialogs from the box title. Range and range-rate are
 * intentionally not shown. Missing values are labeled, never shown as zero.
 */

import type { ReactNode } from 'react';
import { BODY_IDS, type BodyId, type BodyResult, type EphemerisResponse } from '../../../shared/ephemeris';
import { presenceOfTarget } from '../../../shared/presence';
import type { ClientError } from '../../api/ephemerisClient';
import { formatDegrees, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';
import { DialogButton } from '../../ui/DialogButton';

interface ResultsPanelProps {
  readonly data: EphemerisResponse;
  readonly error: ClientError | null;
  /** Data status tag (sample, live, pending…) shown in the title rule. */
  readonly status?: ReactNode;
}

export function ResultsPanel({ data, error, status }: ResultsPanelProps) {
  const { messages } = useI18n();
  const { results } = messages;

  return (
    <Box
      title={results.heading}
      titleAs="h3"
      className="results warp-fade"
      tag={status}
      help={results.info}
      actions={
        <DialogButton label={results.sources} buttonClassName="text-button" title={results.sources}>
          <Sources data={data} />
        </DialogButton>
      }
    >
      <div aria-live="polite" className="results__content">
        <p className="results__case">
          <span className="results__site">{data.site.name}</span>
          <span className="results__time">{formatUtc(data.ephemerisUtc ?? data.requestedUtc)}</span>
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
              <BodyRow key={body} body={body} result={data.bodies[body]} />
            ))}
          </tbody>
        </table>

        {data.warnings.includes('PARTIAL_RESULT') && <p className="callout">{results.partial}</p>}
        {data.warnings.includes('HORIZONS_API_VERSION_UNVERIFIED') && <p className="callout">{results.versionUnverified}</p>}

        <p className="terrain-note">{results.terrainWarning}</p>
      </div>
    </Box>
  );
}

function Sources({ data }: { data: EphemerisResponse }) {
  const { messages } = useI18n();
  const { results } = messages;
  const retrievedAt = formatUtc(data.source.retrievedAt);
  return (
    <>
      <p>{data.provenance === 'saved-sample' ? results.provenanceSample(retrievedAt) : results.provenanceLive(retrievedAt)}</p>
      <ul className="sources">
        <li>
          {results.siteSource}:{' '}
          <a href={data.site.source.url} target="_blank" rel="noreferrer">
            {data.site.source.name}
          </a>
          {data.site.source.locator ? `, ${data.site.source.locator}` : ''}
        </li>
        <li>
          {results.positionSource}:{' '}
          <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">
            {data.source.name}
          </a>
          {[data.source.planetaryEphemeris, data.source.observerFrame].filter(Boolean).map((part) => `, ${part}`)}
        </li>
      </ul>
    </>
  );
}

function BodyRow({ body, result }: { body: BodyId; result: BodyResult }) {
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
          {messages.results.bodyError} {messages.errors[result.error.code]}
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
      <td className="readings__value">{formatDegrees(observation.azimuthDeg, locale) ?? messages.results.noValue}</td>
      <td className="readings__value">{formatDegrees(observation.elevationDeg, locale) ?? messages.results.noValue}</td>
      <td className={`readings__state readings__state--${presence}`} title={fullState}>
        {messages.presence.short[presence]}
        {straddles && <span className="readings__aside"> ({messages.presence.earthStraddlesShort})</span>}
        <span className="visually-hidden">. {fullState}</span>
      </td>
    </tr>
  );
}
