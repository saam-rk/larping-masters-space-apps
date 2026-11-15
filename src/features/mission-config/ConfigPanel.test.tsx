import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_ID, FEATURED_SITES, findSite, REFERENCE_SITES, type SiteId } from '../../../shared/sites';
import { APOLLO_11_LANDING_UTC as DEFAULT_UTC } from '../../../shared/time';
import { MESSAGES } from '../../i18n/messages';
import { ConfigPanel } from './ConfigPanel';
import { hasFirstPersonView } from '../scene/viewMode';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

const site = findSite(DEFAULT_SITE_ID);
const selection = {
  siteId: site.id,
  latitudeDeg: site.latitudeDeg,
  longitudeEastDeg: site.longitudeEastDeg,
  utc: DEFAULT_UTC,
};

function submitButton(loading: boolean, utc = DEFAULT_UTC, upToDate = false): string {
  const html = renderToStaticMarkup(
    <ConfigPanel
      selection={{ ...selection, utc }}
      loading={loading}
      upToDate={upToDate}
      onSiteChange={vi.fn()}
      onCoordinatesChange={vi.fn()}
      onUtcChange={vi.fn()}
      onUpdate={vi.fn()}
      onShowUtc={vi.fn()}
    />,
  );
  return html.match(/<button type="submit".*?<\/button>/)![0];
}

describe('ConfigPanel update availability', () => {
  it('allows querying a valid selection that has no complete live result, including a sample or partial result', () => {
    expect(submitButton(false)).not.toContain('disabled');
  });

  it('prevents another query while loading', () => {
    expect(submitButton(true)).toContain('disabled');
  });

  it('shows Updated and blocks duplicate updates once a complete live result matches the selection', () => {
    const button = submitButton(false, DEFAULT_UTC, true);
    expect(button).toContain('Updated');
    expect(button).toContain('button--done');
    expect(button).toContain('disabled');
    expect(submitButton(false)).toContain('Update view');
  });

  it('shows the busy label while loading, even if the view was up to date', () => {
    expect(submitButton(true, DEFAULT_UTC, true)).toContain('Querying');
  });

  it('prevents querying invalid input', () => {
    expect(submitButton(false, '2100-01-01T12:00:00Z')).toContain('disabled');
  });
});

function renderPanel(siteId: SiteId): string {
  const chosen = findSite(siteId);
  return renderToStaticMarkup(
    <ConfigPanel
      selection={{ ...selection, siteId, latitudeDeg: chosen.latitudeDeg, longitudeEastDeg: chosen.longitudeEastDeg }}
      loading={false}
      upToDate={false}
      onSiteChange={vi.fn()}
      onCoordinatesChange={vi.fn()}
      onUtcChange={vi.fn()}
      onUpdate={vi.fn()}
      onShowUtc={vi.fn()}
    />,
  );
}

describe('ConfigPanel reference points', () => {
  it('lists every point in two groups: first person (featured first, then alphabetical), then third person only (alphabetical)', () => {
    const html = renderPanel(DEFAULT_SITE_ID);
    expect(html).not.toContain('type="radio"');
    const options = [...html.matchAll(/role="option"[^>]*><span class="wheel-select__text">([^<]+)</g)].map((match) => match[1]!.replace(/&#x27;/g, "'"));
    expect(options).toHaveLength(REFERENCE_SITES.length);
    expect(options.slice(0, 4)).toEqual(['Apollo 11', 'Nobile Rim 1 · R06', 'Nobile Rim 2 · DM2', 'Shackleton Rim · R04']);
    const groups = [...html.matchAll(/class="wheel-select__section"[^>]*>([^<]+)</g)].map((match) => match[1]);
    expect(groups).toEqual(['With first person', 'Third person only']);
    const firstPerson = options.filter((option) => hasFirstPersonView(REFERENCE_SITES.find((site) => option.split(' · ')[0] === site.name)!.id));
    expect(options.slice(0, firstPerson.length)).toEqual(firstPerson);
    expect(firstPerson).toContain('Haworth');
    const alphabetical = (list: string[]) => {
      const names = list.map((option) => option.split(' · ')[0]!);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    };
    alphabetical(firstPerson.slice(FEATURED_SITES.length));
    alphabetical(options.slice(firstPerson.length));
    expect(options.slice(firstPerson.length)).toContain('Leibnitz Beta Plateau, extended boundaries · Site20v2');
    expect(html).toMatch(/class="wheel-select__value"><span class="wheel-select__text">Apollo 11<\/span><span class="wheel-select__badge">First landing</);
    expect(html).toMatch(/>Apollo 11<\/span><span class="wheel-select__badge">First landing</);
  });

  it('shows the selected point as the chosen option', () => {
    expect(renderPanel('shackleton-rim')).toMatch(/aria-selected="true"[^>]*><span class="wheel-select__text">Shackleton Rim · R04</);
    const html = renderPanel('malapert-massif');
    expect(html).toMatch(/class="wheel-select__value"><span class="wheel-select__text">Malapert Massif · R23</);
    expect(html).toMatch(/aria-selected="true"[^>]*><span class="wheel-select__text">Malapert Massif · R23</);
  });
});
