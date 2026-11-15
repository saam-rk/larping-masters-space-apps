/**
 * Records the real CLPS Lunar Mission Browser running in Microsoft Edge while
 * a scripted user walks through the presentation flow.
 *
 * Output (capture/raw/, git-ignored):
 * - frames/NNNNNN.jpg  screencast frames from the Chrome DevTools Protocol;
 * - session.json       frame times, pointer samples, clicks and named marks,
 *                      all in milliseconds since the recording started.
 *
 * The app draws its interface through a CRT barrel filter and remaps the
 * pointer so controls react where they are drawn (src/features/backdrop/
 * curvaturePointer.ts). Clicks therefore target the drawn position of each
 * control, found by inverting the same barrel formula (src/features/backdrop/
 * curvature.ts). The pointer is not part of the screencast; the video draws it
 * from the recorded samples.
 *
 * Usage: start the app (`npm run dev` in the repository root), then
 *   node capture/record.mjs [appUrl]
 */

import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_URL = process.argv[2] ?? 'http://localhost:5173/';
const WIDTH = 1920;
const HEIGHT = 1080;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'raw');
const FRAMES_DIR = join(OUT_DIR, 'frames');

/** Same constant and formula as `CURVATURE_STRENGTH` / `barrelShift` in the app. */
const CURVATURE_STRENGTH = 0.12;
function barrelShift(dx, dy) {
  const fit = 1 / (1 + CURVATURE_STRENGTH * ((HEIGHT * HEIGHT) / (WIDTH * WIDTH + HEIGHT * HEIGHT)));
  const halfDiagonal2 = (WIDTH * WIDTH + HEIGHT * HEIGHT) / 4;
  const scale = fit * (1 + (CURVATURE_STRENGTH * (dx * dx + dy * dy)) / halfDiagonal2) - 1;
  return [dx * scale, dy * scale];
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(FRAMES_DIR, { recursive: true });

const session = { width: WIDTH, height: HEIGHT, appUrl: APP_URL, frames: [], pointer: [], clicks: [], marks: {} };
let startMs = 0;
const now = () => Date.now() - startMs;
const log = (...args) => console.log((now() / 1000).toFixed(2).padStart(7), ...args);

const browser = await chromium.launch({
  channel: 'msedge',
  headless: false,
  args: [`--window-size=${WIDTH},${HEIGHT + 140}`, '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, locale: 'en-US' });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

let frameCount = 0;
let recording = false;
cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
  void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  if (!recording) return;
  const file = `${String(frameCount++).padStart(6, '0')}.jpg`;
  writeFileSync(join(FRAMES_DIR, file), Buffer.from(data, 'base64'));
  session.frames.push({ file, t: now(), deviceT: metadata.timestamp ? metadata.timestamp * 1000 - startMs : null });
});

const sleep = (ms) => page.waitForTimeout(ms);
const mark = (name) => { session.marks[name] = now(); log('mark', name); };

let pointer = { x: WIDTH * 0.62, y: HEIGHT * 0.72 };

/** Drawn (on-screen) centre of a control, accounting for the curved-glass filter when it applies. */
async function drawnCenter(locator, offset = { x: 0.5, y: 0.5 }) {
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  const box = await locator.boundingBox();
  const layout = { x: box.x + box.width * offset.x, y: box.y + box.height * offset.y };
  const distorted = await page.evaluate(() => {
    const { curve, resizing } = document.documentElement.dataset;
    return curve === 'on' && resizing !== 'on' && !document.querySelector('dialog[open]')
      && !document.fullscreenElement && !document.querySelector('[data-fullscreen]');
  });
  if (!distorted) return layout;
  // Find S with S + barrelShift(S - centre) = layout (fixed-point iteration converges: the shift is small and smooth).
  let screen = { ...layout };
  for (let i = 0; i < 40; i++) {
    const [sx, sy] = barrelShift(screen.x - WIDTH / 2, screen.y - HEIGHT / 2);
    screen = { x: layout.x - sx, y: layout.y - sy };
  }
  return screen;
}

/** Eased pointer travel, sampled every ~16 ms and logged for the cursor overlay. */
async function moveTo(target, duration = 550) {
  const from = { ...pointer };
  const steps = Math.max(2, Math.round(duration / 16));
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const x = from.x + (target.x - from.x) * e;
    const y = from.y + (target.y - from.y) * e;
    await page.mouse.move(x, y);
    session.pointer.push({ t: now(), x, y });
    await sleep(Math.max(1, duration / steps - 4));
  }
  pointer = { ...target };
}

async function hover(locator, { duration = 550, offset } = {}) {
  await moveTo(await drawnCenter(locator, offset), duration);
}

async function click(locator, label, { duration = 550, offset, settle = 120 } = {}) {
  await hover(locator, { duration, offset });
  await sleep(settle);
  session.clicks.push({ t: now(), x: pointer.x, y: pointer.y, label });
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  log('click', label);
}

/** A press recorded for the overlay without a real click (native <select> popups are not captured). */
function pressMarker(label) {
  session.clicks.push({ t: now(), x: pointer.x, y: pointer.y, label });
}

/** Drag on the 3D view to rotate the camera. */
async function drag(from, to, duration = 900) {
  await moveTo(from, 400);
  await page.mouse.down();
  await moveTo(to, duration);
  await page.mouse.up();
}

try {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('.setup__save').waitFor();
  await sleep(1800);
  startMs = Date.now();
  recording = true;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });
  await page.mouse.move(pointer.x, pointer.y);
  session.pointer.push({ t: now(), ...pointer });

  // 1. Landing window: performance mode and language.
  mark('setup');
  await sleep(700);
  await click(page.locator('.setup__mode[data-mode="on"]'), 'full-effects', { duration: 650 });
  await sleep(350);
  await click(page.getByRole('button', { name: 'English' }), 'english', { duration: 500 });
  await sleep(450);
  await click(page.locator('.setup__save'), 'save', { duration: 550 });
  mark('saved');

  // 2. Default scene: Apollo 11 landing reenactment.
  await moveTo({ x: 1540, y: 900 }, 900);
  await sleep(2200);
  mark('apolloEnd');

  // 3. Amundsen Rim, live time, update view.
  await click(page.getByRole('combobox', { name: 'Point list' }), 'point-list', { duration: 700 });
  await sleep(500);
  await click(page.getByRole('option', { name: /Amundsen Rim/ }).first(), 'amundsen', { duration: 600 });
  await sleep(350);
  await click(page.getByRole('button', { name: 'LIVE', exact: true }), 'live', { duration: 500 });
  await sleep(350);
  mark('beforeUpdate');
  await click(page.getByRole('button', { name: 'Update view' }), 'update', { duration: 650 });
  mark('update');
  await page.getByRole('button', { name: 'Updated' }).waitFor({ timeout: 60000 });
  await sleep(1200);
  mark('updated');

  // 4. Data panel.
  await hover(page.locator('.results table, table').first(), { duration: 700 });
  await sleep(900);
  await hover(page.getByRole('button', { name: 'Sources' }), { duration: 500 });
  await sleep(500);
  mark('dataEnd');

  // 5. Third person, visual scale, guide and compass.
  await click(page.getByRole('button', { name: 'Third person' }), 'third', { duration: 650 });
  mark('third');
  await page.getByRole('button', { name: 'Third person', pressed: true }).waitFor({ timeout: 30000 });
  await sleep(1600);
  await hover(page.getByRole('button', { name: 'Visual', exact: true }).first(), { duration: 700 });
  await sleep(350);
  await hover(page.getByRole('button', { name: 'Guide' }), { duration: 650 });
  await sleep(300);
  await hover(page.getByRole('button', { name: 'Compass' }), { duration: 350 });
  await sleep(300);
  await drag({ x: 1250, y: 620 }, { x: 1020, y: 600 }, 1100);
  await sleep(400);
  mark('thirdEnd');

  // 6. Interval: start at the next sunrise, then prepare the sequence.
  await click(page.getByRole('button', { name: 'Interval' }), 'interval', { duration: 650 });
  const dialog = page.locator('dialog[open]');
  await dialog.waitFor();
  await sleep(700);
  await click(dialog.getByRole('group', { name: 'Start at the rise of' }).getByRole('button', { name: /Sun/ }), 'rise-sun', { duration: 650 });
  mark('riseSearch');
  await dialog.locator('button[type=submit].button--go').waitFor({ timeout: 120000 });
  mark('riseFound');
  await sleep(900);
  await click(dialog.getByRole('button', { name: 'Prepare interval' }), 'prepare', { duration: 600 });
  mark('prepare');
  await page.locator('.horizon-playback').waitFor({ timeout: 120000 });
  mark('ready');
  await sleep(900);

  // 7. Full screen, first person, focus on the astronaut, 4x, play.
  await click(page.getByRole('button', { name: 'Show the local horizon full screen' }), 'fullscreen', { duration: 650 });
  mark('fullscreen');
  await sleep(900);
  await click(page.getByRole('button', { name: 'First person' }), 'first', { duration: 600 });
  mark('first');
  await page.getByRole('button', { name: 'First person', pressed: true }).waitFor({ timeout: 30000 });
  await sleep(2600);
  await moveTo({ x: 960, y: 420 }, 800);
  await sleep(500);
  const speed = page.getByRole('combobox', { name: 'Playback speed' });
  await hover(speed, { duration: 700 });
  await sleep(150);
  pressMarker('speed-4x');
  await speed.selectOption('4');
  await sleep(450);
  await click(page.getByRole('button', { name: 'Play', exact: true }), 'play', { duration: 450 });
  mark('play');
  await moveTo({ x: 1500, y: 760 }, 700);
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ timeout: 30000 });
  mark('playEnd');
  await sleep(700);

  // 8. Leave full screen, open the advanced mode.
  await click(page.getByRole('button', { name: 'Exit full screen' }), 'exit-fullscreen', { duration: 650 });
  mark('exitFullscreen');
  await sleep(900);
  await click(page.getByRole('button', { name: 'Show advanced mode tools' }), 'advanced', { duration: 700 });
  mark('advanced');
  await sleep(700);
  await hover(page.getByRole('heading', { name: 'Inverse search' }), { duration: 500 });
  await sleep(450);
  await hover(page.getByRole('heading', { name: 'Feasibility' }), { duration: 450 });
  await sleep(450);
  await hover(page.getByRole('heading', { name: 'Compare scenarios' }), { duration: 450 });
  await sleep(900);
  mark('end');
} catch (error) {
  log('ERROR', error.message);
  process.exitCode = 1;
} finally {
  recording = false;
  await cdp.send('Page.stopScreencast').catch(() => {});
  writeFileSync(join(OUT_DIR, 'session.json'), JSON.stringify(session, null, 1));
  const span = session.frames.at(-1)?.t ?? 0;
  log(`frames: ${session.frames.length}, ~${(session.frames.length / (span / 1000)).toFixed(1)} fps`);
  await browser.close();
}
