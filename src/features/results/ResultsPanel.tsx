/**
 * Text summary (docs/GUIA_PRIMERA_DEMO.md): place and time, azimuth and
 * elevation of the Sun and Earth in degrees, plain-language states, sources,
 * and the visible terrain warning. Range and range-rate are intentionally not
 * shown. Missing values are labeled, never shown as zero.
 */

import { BODY_IDS, type BodyId, type BodyResult, type EphemerisResponse } from '../../../shared/ephemeris';
import { presenceOfTarget } from '../../../shared/presence';
import type { ClientError } from '../../api/ephemerisClient';
import { formatCoordinates, formatDegrees, formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { Box } from '../../ui/Box';

interface ResultsPanelProps {
  readonly data: EphemerisResponse;
  readonly error: ClientError | null;
  readonly stale: boolean;
}

export function ResultsPanel({ data, error, stale }: ResultsPanelProps) {
  const { locale, messages } = useI18n();
  const retrievedAt = formatUtc(data.source.retrievedAt);

  return (
    <Box title={messages.results.heading} titleAs="h3" className="results warp-fade">
      <div aria-live="polite" className="results__content">
        <p className="callout callout--warning">{messages.results.terrainWarning}</p>
        {error && <p className="callout callout--error">{messages.errors[error.key]}</p>}
        {stale && <p className="callout">{messages.results.stale}</p>}

        <dl className="facts">
          <dt>{messages.results.place}</dt>
          <dd>
            {data.site.name}
            <br />
            {formatCoordinates(data.site.latitudeDeg, data.site.longitudeEastDeg, locale, messages.hemisphere)}
          </dd>
          <dt>{messages.results.time}</dt>
          <dd>{formatUtc(data.ephemerisUtc ?? data.requestedUtc)}</dd>
        </dl>

        {BODY_IDS.map((body) => (
          <BodySummary key={body} body={body} result={data.bodies[body]} />
        ))}

        {data.warnings.includes('PARTIAL_RESULT') && <p className="callout">{messages.results.partial}</p>}
        {data.warnings.includes('HORIZONS_API_VERSION_UNVERIFIED') && (
          <p className="callout">{messages.results.versionUnverified}</p>
        )}

        <p className="provenance">
          {data.provenance === 'saved-sample'
            ? messages.results.provenanceSample(retrievedAt)
            : messages.results.provenanceLive(retrievedAt)}
        </p>

        <h4 className="results__subtitle">{messages.results.sources}</h4>
        <ul className="sources">
          <li>
            {messages.results.siteSource}:{' '}
            <a href={data.site.source.url} target="_blank" rel="noreferrer">
              {data.site.source.name}
            </a>
            {data.site.source.locator ? `, ${data.site.source.locator}` : ''}
          </li>
          <li>
            {messages.results.positionSource}:{' '}
            <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">
              {data.source.name}
            </a>
            {[data.source.planetaryEphemeris, data.source.observerFrame].filter(Boolean).map((part) => `, ${part}`)}
          </li>
        </ul>

        <h4 className="results__subtitle">{messages.results.method}</h4>
        <p className="method">{messages.results.methodDetail}</p>
      </div>
    </Box>
  );
}

function BodySummary({ body, result }: { body: BodyId; result: BodyResult }) {
  const { locale, messages } = useI18n();
  const name = messages.bodies[body];

  if (result.status === 'error') {
    return (
      <article className={`body body--${body}`}>
        <h4 className="body__name">{name}</h4>
        <p className="callout callout--error">
          {messages.results.bodyError} {messages.errors[result.error.code]}
        </p>
      </article>
    );
  }

  const { observation } = result;
  const presence = presenceOfTarget(observation);
  const straddles =
    body === 'earth' &&
    presence === 'upper-limb-above-reference-horizon' &&
    observation.elevationDeg !== null &&
    observation.elevationDeg < 0;

  return (
    <article className={`body body--${body}`}>
      <h4 className="body__name">{name}</h4>
      <dl className="facts">
        <dt>{messages.results.azimuth}</dt>
        <dd>{formatDegrees(observation.azimuthDeg, locale) ?? messages.results.noValue}</dd>
        <dt>{messages.results.elevation}</dt>
        <dd>{formatDegrees(observation.elevationDeg, locale) ?? messages.results.noValue}</dd>
      </dl>
      <p className="body__status">
        {messages.presence[body][presence]}
        {straddles && ` ${messages.presence.earthStraddles}`}
      </p>
    </article>
  );
}
