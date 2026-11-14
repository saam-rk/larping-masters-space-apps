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

function submitButton(loading: boolean, utc = DEFAULT_UTC): string {
  const html = renderToStaticMarkup(
    <ConfigPanel
      selection={{ ...selection, utc }}
      loading={loading}
      onSiteChange={vi.fn()}
      onCoordinatesChange={vi.fn()}
      onUtcChange={vi.fn()}
      onUpdate={vi.fn()}
    />,
  );
  return html.match(/<button type="submit"[^>]*>/)![0];
}

describe('ConfigPanel update availability', () => {
  it('allows querying the same valid selection, including a sample or partial result', () => {
    expect(submitButton(false)).not.toContain('disabled');
  });

  it('prevents another query while loading', () => {
    expect(submitButton(true)).toContain('disabled');
  });

  it('prevents querying invalid input', () => {
    expect(submitButton(false, '2100-01-01T12:00:00Z')).toContain('disabled');
  });
});
