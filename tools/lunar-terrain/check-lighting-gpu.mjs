/** Requires an already running Vite dev server (LIGHTING_URL) and external PLAYWRIGHT_MODULE.
 * No live Horizons requests. Uses production shaders and all ten distributed terrain assets.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const output = process.env.LIGHTING_QA_OUT ?? join(tmpdir(), 'lunar-lighting-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${process.env.LIGHTING_URL ?? 'http://127.0.0.1:5187'}/tools/lunar-terrain/lighting-review.html`);
  await page.waitForFunction(() => !!window.lightingReview);
  const ordinary = await page.evaluate(() => window.lightingReview.synthetic());
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(ordinary.clear[0] > 180, JSON.stringify(ordinary));
  const unobstructed = await page.evaluate(() => window.lightingReview.synthetic(false, false, false));
  assert.ok(Math.abs(ordinary.clear[0] - unobstructed.clear[0]) <= 2, 'A clear sun-facing slope must not self-shadow');
  assert.ok(ordinary.blocked[0] < ordinary.clear[0] * 0.2, JSON.stringify(ordinary));
  await page.evaluate(() => window.lightingReview.synthetic());
  await page.screenshot({ path: join(output, 'ridge.png') });
  const eclipse = await page.evaluate(() => window.lightingReview.synthetic(true));
  assert.equal(eclipse.sourceIntensity, 0);
  assert.equal(eclipse.clear[0], 0);
  const fill = await page.evaluate(() => window.lightingReview.synthetic(true, true));
  assert.ok(fill.clear[0] > 0);
  const contacts = [];
  for (const elevation of [-0.3, -0.269127083, -0.268, -0.259932, 0, 0.269127083, 0.3]) {
    contacts.push({ elevation, pixel: await page.evaluate(elevation => window.lightingReview.contact(elevation), elevation) });
  }
  assert.equal(contacts[0].pixel[0], 0);
  assert.ok(contacts[3].pixel[0] > 0 && contacts[3].pixel[0] < 25, 'A first-contact sliver must not produce full illumination');
  assert.ok(contacts[4].pixel[0] > 180 && contacts[4].pixel[0] < 195);
  assert.ok(contacts[6].pixel[0] > 250);
  for (let i = 1; i < contacts.length; i++) assert.ok(contacts[i].pixel[0] >= contacts[i-1].pixel[0]);
  const assets = [];
  for (const [id, az, el] of [
    ['apollo-11', 88.805495, 10.703313], ['nobile-rim-1', 83.301542, 2.094722],
    ['nobile-rim-2', 61.979835, 4.411932], ['shackleton-rim', 292.387658, 1.645440],
    ['amundsen-rim', 51.344529, 5.173846], ['haworth', 143.309457, -1.038435],
    ['shoemaker-rim-a', 108.674743, 0.942157], ['faustini-rim-a', 30.569884, 3.374084],
    ['cabeus-exterior-wall-1', 192.088186, -1.450920], ['malapert-crater-1', 112.185124, -0.404747],
  ]) {
    const result = await page.evaluate(([id, az, el]) => window.lightingReview.asset(id, az, el), [id, az, el]);
    assert.ok(Math.abs(result.ground) < 0.002, JSON.stringify(result));
    assets.push(result);
    await page.screenshot({ path: join(output, `${id}.png`) });
    assert.equal(errors.length, 0, errors.join('\n'));
  }
  const probes = [];
  const linear = (byte) => { const s = byte / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  // Audit sample coordinates locate receiver patches, not the new fixed camera.
  // Re-cast ground on the curved mesh; keep audited directions as regression inputs.
  for (const args of [
    ['nobile-rim-1', 10.209534, 6.032969, [-7.5697165993, -2.5182687647]],
    ['nobile-rim-2', 257.600574, 0.197006, [15.1377075896, -22.7822186531]],
    ['shackleton-rim', 2.52979, 1.76831, [-0.62096552, -36.53494206]],
    ['amundsen-rim', 106.034378, -0.047579, [12.1179491127, 16.6878054063]],
    ['haworth', 307.798389, 3.44268, [28.2656980508, 2.9726927506]],
    ['shoemaker-rim-a', 230.591523, 0.273466, [-8.5930726152, -44.2021120704]],
    ['faustini-rim-a', 146.419945, -0.259932, [33.7411492190, 16.2245114021]],
    ['faustini-rim-a', 30.569884, 3.374084, [35.3564057307, 20.32401185]],
    ['malapert-crater-1', 276.585111, 2.060048, [-17.47268008, 6.592831804]],
  ]) {
    const result = await page.evaluate(args => window.lightingReview.asset(...args), args);
    assert.ok(result.unblockedPixel[0] > 80, `Unlit diagnostic receiver: ${JSON.stringify(result)}`);
    result.gpuDiskFraction = linear(result.shadowPixel[0]) / linear(result.unblockedPixel[0]);
    result.absoluteDifference = Math.abs(result.gpuDiskFraction - result.meshDiskFraction);
    probes.push(result);
    console.log(JSON.stringify(result));
    // Engineering regression budget for these finite-resolution fixtures only;
    // NOT an uncertainty bound on other terrain or physical solar irradiance.
    assert.ok(result.absoluteDifference < 0.05, `Disk exposure regression: ${JSON.stringify(result)}`);
    if (result.meshDiskFraction === 0) assert.ok(result.gpuDiskFraction < 0.02, JSON.stringify(result));
  }
  const report = { ordinary, eclipse, fill, contacts, assets, probes, errors, note: 'Synthetic directions exercise rendering, not fresh surface ephemerides or validated terrain illumination. Probe fractions compare GPU integration with 256/1024 actual mesh rays, not observations.' };
  await writeFile(join(output, 'gpu-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
