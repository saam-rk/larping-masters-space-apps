// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { SOURCE_CATALOG, SOURCE_SECTIONS } from './sourceCatalog';
import { SourcesContent } from './SourcesContent';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SourcesContent data={SAVED_SAMPLE} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('source catalog', () => {
  it('limits historical research to Apollo 11 references', () => {
    expect(SOURCE_CATALOG.filter((source) => source.section === 'historic').map((source) => source.id)).toEqual([
      'sp4029Landing',
      'lrocApollo11Mapping',
      'nasaLunarModule3d',
      'spacecraftDimensions',
    ]);
  });

  it('has unique ids and main URLs, and every section has at least one source', () => {
    const ids = SOURCE_CATALOG.map((source) => source.id);
    const urls = SOURCE_CATALOG.map((source) => source.url);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(urls).size).toBe(urls.length);
    for (const section of SOURCE_SECTIONS) {
      expect(SOURCE_CATALOG.some((source) => source.section === section.id)).toBe(true);
    }
  });

  it('has a non-empty reason for every source and a title for every section in both languages', () => {
    for (const messages of Object.values(MESSAGES)) {
      for (const source of SOURCE_CATALOG) expect(messages.results.sourceReasons[source.id].trim()).not.toBe('');
      for (const section of SOURCE_SECTIONS) {
        expect(messages.results.sourceSections[section.id].title.trim()).not.toBe('');
        expect(messages.results.sourceSections[section.id].summary.trim()).not.toBe('');
      }
    }
  });
});

describe('SourcesContent', () => {
  it('lists the query, both groups and every section in the table of contents', () => {
    const toc = container.querySelector('nav.sources-toc')!;
    const entries = [...toc.querySelectorAll('a')].map((link) => link.textContent);
    expect(entries).toHaveLength(1 + 2 + SOURCE_SECTIONS.length);
    expect(entries[0]).toBe(`1 ${MESSAGES.en.results.sourcesCurrent}`);
    expect(entries).toContain(`2.1 ${MESSAGES.en.results.sourceSections.ephemeris.title} 44 sources`);
  });

  it('points every table-of-contents entry at a heading in the dialog', () => {
    for (const link of container.querySelectorAll<HTMLAnchorElement>('nav.sources-toc a')) {
      const target = document.getElementById(link.getAttribute('href')!.slice(1));
      expect(target?.matches('h3, h4')).toBe(true);
    }
  });

  it('renders every catalog source with its reason', () => {
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.sources a[target="_blank"]')].map((link) => link.href);
    for (const source of SOURCE_CATALOG) expect(links).toContain(new URL(source.url).href);
    expect(container.textContent).toContain(MESSAGES.en.results.sourceReasons.lrocApollo11Mapping);
  });

  it('does not show references to other historical missions', () => {
    expect(container.textContent).not.toMatch(/Apollo (12|14|15|16|17)|Luna (2|17)|Surveyor|Chang'e|Chandrayaan|SLIM|Odysseus|Blue Ghost/);
    expect(container.textContent).toContain(MESSAGES.en.results.sourceSections.historic.title);
    const toc = container.querySelector('nav.sources-toc')!;
    expect(toc.textContent).toContain(`${MESSAGES.en.results.sourceSections.historic.title} 44 sources`);
  });

  it('jumps to a section and focuses its heading without changing the URL', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const before = window.location.href;
    const link = [...container.querySelectorAll<HTMLAnchorElement>('nav.sources-toc a')].find((entry) =>
      entry.textContent?.includes(MESSAGES.en.results.sourceSections.historic.title),
    )!;

    act(() => link.click());

    const heading = document.getElementById(link.getAttribute('href')!.slice(1))!;
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
    expect(window.location.href).toBe(before);
  });
});
