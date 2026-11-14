import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_ID, findSite } from '../../../shared/sites';
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
  it('allows querying the same valid selection, including a sample or partial result', () => {
    expect(submitButton(false)).not.toContain('disabled');
  });

  it('prevents another query while loading', () => {
    expect(submitButton(true)).toContain('disabled');
  });

  it('shows Updated, still pressable, once a live result matches the selection', () => {
    const button = submitButton(false, DEFAULT_UTC, true);
    expect(button).toContain('Updated');
    expect(button).toContain('button--done');
    expect(button).not.toContain('disabled');
    expect(submitButton(false)).toContain('Update view');
  });

  it('shows the busy label while loading, even if the view was up to date', () => {
    expect(submitButton(true, DEFAULT_UTC, true)).toContain('Querying');
  });

  it('prevents querying invalid input', () => {
    expect(submitButton(false, '2100-01-01T12:00:00Z')).toContain('disabled');
  });
});
