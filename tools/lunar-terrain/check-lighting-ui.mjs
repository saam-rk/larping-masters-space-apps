/** UI smoke against a production preview. Replays recorded Horizons snapshots;
 * no upstream calls. PLAYWRIGHT_MODULE and optional PLAYWRIGHT_CHROMIUM_EXECUTABLE required.
 */
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
const snapshots = JSON.parse(await readFile(new URL('../../docs/lighting-validation/snapshots.json', import.meta.url), 'utf8'));
const output = process.env.LIGHTING_QA_OUT ?? join(tmpdir(), 'lunar-lighting-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('[horizon-countdown]')) errors.push(message.text());
  });
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00Z'));
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/ephemeris') {
      const snapshot = snapshots.find(value => value.site.id === url.searchParams.get('site') && value.requestedUtc === url.searchParams.get('utc'));
      assert.ok(snapshot, `Unrecorded test request: ${url}`);
      requests.push(snapshot.site.id);
      await route.fulfill({ json: snapshot });
    } else {
      // Exercise the existing explicit countdown failure UI without network traffic.
      await route.fulfill({ json: { error: { code: 'UPSTREAM_UNAVAILABLE', detail: 'Offline UI regression fixture' } } });
    }
  });
  await page.goto(process.env.LIGHTING_APP_URL ?? 'http://127.0.0.1:5188');
  await page.getByRole('button', { name: 'Solar directa', exact: true }).waitFor();
  const cases = snapshots.slice(0, 10);
  for (const snapshot of cases) {
    if (snapshot.site.id !== 'apollo-11') {
      const input = page.getByRole('searchbox', { name: 'Coordenadas o nombre', exact: true });
      await input.fill(snapshot.site.name);
      await input.press('Tab');
      await page.locator('button.button--update[form]').click();
    }
    await page.waitForFunction(() => document.querySelector('button.button--update[form]')?.disabled === true
      && document.querySelector('button.button--update[form]')?.getAttribute('aria-busy') === 'false');
    await page.locator('.scene__label').filter({ hasText: /^(Sol|Tierra)$/ }).first().waitFor({ state: 'attached' });
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !document.body.innerText.includes('Cargando relieve…'));
    await page.getByRole('button', { name: 'Ilustrativa', exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(output, `ui-es-${snapshot.site.id}-illustrative.png`) });
    await page.getByRole('button', { name: 'Solar directa', exact: true }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('button', { name: 'Solar directa', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.ok(!(await page.locator('.scene__notes').innerText()).includes('Luz solar no disponible'));
    await page.screenshot({ path: join(output, `ui-es-${snapshot.site.id}-direct.png`) });
    assert.equal(errors.length, 0, errors.join('\n'));
  }
  await page.getByRole('button', { name: 'Preferencias', exact: true }).focus();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Direct solar', exact: true }).waitFor();
  assert.ok((await page.locator('.scene__notes').innerText()).includes('terrain beyond it is unknown'));
  for (const snapshot of cases) {
    const input = page.getByRole('searchbox', { name: 'Coordinates or name', exact: true });
    await input.fill(snapshot.site.name);
    await input.press('Tab');
    await page.locator('button.button--update[form]').click();
    await page.waitForFunction(() => document.querySelector('button.button--update[form]')?.disabled === true
      && document.querySelector('button.button--update[form]')?.getAttribute('aria-busy') === 'false');
    await page.locator('.scene__label').filter({ hasText: /^(Sun|Earth)$/ }).first().waitFor({ state: 'attached' });
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Illustrative', exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(output, `ui-en-${snapshot.site.id}-illustrative.png`) });
    await page.getByRole('button', { name: 'Direct solar', exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(output, `ui-en-${snapshot.site.id}-direct.png`) });
  }
  assert.equal(new Set(requests).size, 10);
  assert.equal(errors.length, 0, errors.join('\n'));
  const report = { sites: requests, languages: ['es', 'en'], modes: ['direct', 'illustrative'], errors, countdown: 'Explicit offline failure fixture; no live search performed' };
  await writeFile(join(output, 'ui-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
