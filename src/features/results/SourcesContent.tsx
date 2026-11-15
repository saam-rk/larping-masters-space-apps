/**
 * Body of the Sources dialog: a numbered table of contents (like an
 * encyclopedia article) whose entries jump to each part of the project, then
 * this query's sources and the project-wide list (`sourceCatalog.ts`), one
 * section per part of the project, each source with the reason it is listed.
 *
 * Jumps scroll inside the dialog and move focus to the target heading; they do
 * not change the page URL. Smooth scrolling is skipped with
 * "prefers-reduced-motion".
 */

import { useId, type MouseEvent, type ReactNode } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { findSite, isSiteId } from '../../../shared/sites';
import { formatUtc } from '../../format';
import { useI18n } from '../../i18n/context';
import { prefersReducedMotion } from '../../preferences/preferences';
import {
  SOURCE_CATALOG,
  SOURCE_SECTIONS,
  type SourceEntry,
  type SourceGroup,
  type SourceId,
  type SourceSectionId,
} from './sourceCatalog';

const ENTRIES: readonly (SourceEntry & { readonly id: SourceId })[] = SOURCE_CATALOG;
const GROUPS: readonly SourceGroup[] = ['app', 'research'];

function sectionsOf(group: SourceGroup): readonly SourceSectionId[] {
  return SOURCE_SECTIONS.filter((section) => section.group === group).map((section) => section.id);
}

function entriesOf(section: SourceSectionId) {
  return ENTRIES.filter((entry) => entry.section === section);
}

/** Scroll the dialog body to a heading and focus it, without touching the URL. */
function jumpTo(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

function JumpLink({ to, className, label, children }: { to: string; className?: string; label?: string; children: ReactNode }) {
  return (
    <a href={`#${to}`} className={className} aria-label={label} title={label} onClick={(event) => jumpTo(event, to)}>
      {children}
    </a>
  );
}

/** Number of sources in a section; read as "N sources" by assistive technology. */
function SourceCount({ count }: { count: number }) {
  const label = useI18n().messages.results.sourcesCount(count);
  return (
    <span className="sources-toc__count" title={label}>
      <span aria-hidden="true">{count}</span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function SourcesContent({ data }: { data: EphemerisResponse }) {
  const { messages } = useI18n();
  const { results } = messages;
  const prefix = useId();
  const idOf = (key: string) => `${prefix}-${key}`;
  const tocId = idOf('toc');

  const backToContents = (
    <JumpLink to={tocId} className="sources__back" label={results.sourcesBackToContents}>
      ↑
    </JumpLink>
  );

  const groupHeading = (group: SourceGroup) => (group === 'app' ? results.sourcesApp : results.sourcesResearch);

  return (
    <div className="sources-list">
      <nav className="sources-toc" aria-labelledby={tocId}>
        <h3 className="sources-toc__title" id={tocId} tabIndex={-1}>
          {results.sourcesContents}
        </h3>
        <ol className="sources-toc__list">
          <li>
            <JumpLink to={idOf('query')}>
              <span className="sources-toc__number">1</span>{' '}
              {results.sourcesCurrent}
            </JumpLink>
          </li>
          {GROUPS.map((group, groupIndex) => (
            <li key={group}>
              <JumpLink to={idOf(group)}>
                <span className="sources-toc__number">{groupIndex + 2}</span>{' '}
                {groupHeading(group)}
              </JumpLink>
              <ol className="sources-toc__list">
                {sectionsOf(group).map((section, sectionIndex) => (
                  <li key={section}>
                    <JumpLink to={idOf(section)}>
                      <span className="sources-toc__number">{`${groupIndex + 2}.${sectionIndex + 1}`}</span>{' '}
                      {results.sourceSections[section].title}{' '}
                      <SourceCount count={entriesOf(section).length} />
                    </JumpLink>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby={idOf('query')}>
        <div className="sources__heading sources__heading--group">
          <h3 className="sources__group" id={idOf('query')} tabIndex={-1}>
            <span className="sources__number">1</span>{' '}
            {results.sourcesCurrent}
          </h3>
          {backToContents}
        </div>
        <CurrentQuery data={data} />
      </section>

      {GROUPS.map((group, groupIndex) => (
        <section key={group} aria-labelledby={idOf(group)}>
          <div className="sources__heading sources__heading--group">
            <h3 className="sources__group" id={idOf(group)} tabIndex={-1}>
              <span className="sources__number">{groupIndex + 2}</span>{' '}
              {groupHeading(group)}
            </h3>
            {backToContents}
          </div>
          {sectionsOf(group).map((section, sectionIndex) => (
            <section key={section} aria-labelledby={idOf(section)}>
              <div className="sources__heading">
                <h4 className="sources__section" id={idOf(section)} tabIndex={-1}>
                  <span className="sources__number">{`${groupIndex + 2}.${sectionIndex + 1}`}</span>{' '}
                  {results.sourceSections[section].title}
                </h4>
                {backToContents}
              </div>
              <p className="sources__summary">{results.sourceSections[section].summary}</p>
              <ul className="sources">
                {entriesOf(section).map((source) => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    {source.links?.map((link) => (
                      <span key={link.url} className="sources__extra">
                        {' · '}
                        <a href={link.url} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      </span>
                    ))}
                    <span className="sources__reason">{results.sourceReasons[source.id]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Sources of the result on screen: the site, its terrain variant and the positions. */
function CurrentQuery({ data }: { data: EphemerisResponse }) {
  const { results } = useI18n().messages;
  const retrievedAt = formatUtc(data.source.retrievedAt);
  const variantOf = isSiteId(data.site.id) ? findSite(data.site.id).variantOf : undefined;
  const variantBase = variantOf ? findSite(variantOf).name : null;
  return (
    <>
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
    </>
  );
}
