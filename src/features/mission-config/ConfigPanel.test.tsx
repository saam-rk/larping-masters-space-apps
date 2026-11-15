import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_ID, findSite, MORE_SITES, type SiteId } from '../../../shared/sites';
import { DEFAULT_UTC } from '../../../shared/time';
import { MESSAGES } from '../../i18n/messages';
import { ConfigPanel } from './ConfigPanel';

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
    />,
  );
}

describe('ConfigPanel reference points', () => {
  it('lists the three featured points as radios and the others in the drop-down, alphabetically', () => {
    const html = renderPanel(DEFAULT_SITE_ID);
    const radios = [...html.matchAll(/<input[^>]*name="reference-site"[^>]*>/g)].map((match) => /value="([^"]+)"/.exec(match[0])?.[1]);
    expect(radios).toEqual(['nobile-rim-1', 'nobile-rim-2', 'shackleton-rim']);
    const options = [...html.matchAll(/role="option"[^>]*>([^<]+)</g)].map((match) => match[1]!.replace(/&#x27;/g, "'"));
    expect(options).toHaveLength(MORE_SITES.length);
    expect(options[0]).toBe('Amundsen 1 · NPB');
    expect(options).toContain('Haworth');
    expect(options).toContain('Leibnitz Beta Plateau, extended boundaries · Site20v2');
    const names = options.map((option) => option.split(' · ')[0]!);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    expect(html).toContain('Choose another point…');
  });

  it('shows a drop-down point as the chosen option and checks no radio', () => {
    const html = renderPanel('malapert-massif');
    const radios = [...html.matchAll(/<input[^>]*name="reference-site"[^>]*>/g)].map((match) => match[0]);
    expect(radios).toHaveLength(3);
    expect(radios.some((radio) => /\bchecked\b/.test(radio))).toBe(false);
    expect(renderPanel('shackleton-rim')).toMatch(/<input[^>]*checked[^>]*value="shackleton-rim"|<input[^>]*value="shackleton-rim"[^>]*checked/);
    expect(html).toMatch(/class="wheel-select__value">Malapert Massif · R23</);
    expect(html).toMatch(/aria-selected="true"[^>]*>Malapert Massif · R23</);
  });
});
