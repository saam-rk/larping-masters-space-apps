/**
 * Turns a recording from `record.mjs` into what the Remotion project reads:
 * - public/footage/app.mp4   constant 30 fps H.264 video of the screencast;
 * - src/capture.json         marks, pointer samples and clicks, in seconds of
 *                            that video.
 *
 * Frame times use the browser's frame timestamps (when each frame was drawn),
 * so variable screencast intervals become the right hold durations. Uses the
 * ffmpeg binary that ships with Remotion (`npx remotion ffmpeg`).
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'capture', 'raw');
const session = JSON.parse(readFileSync(join(RAW, 'session.json'), 'utf8'));

const frameTime = (frame) => frame.deviceT ?? frame.t;
const origin = frameTime(session.frames[0]);
const lines = ['ffconcat version 1.0'];
session.frames.forEach((frame, i) => {
  const next = session.frames[i + 1];
  const duration = next ? Math.max(1, frameTime(next) - frameTime(frame)) : 33;
  lines.push(`file 'frames/${frame.file}'`, `duration ${(duration / 1000).toFixed(4)}`);
});
// The concat demuxer ignores the last duration unless the final file is repeated.
lines.push(`file 'frames/${session.frames.at(-1).file}'`);
writeFileSync(join(RAW, 'frames.ffconcat'), lines.join('\n'));

mkdirSync(join(ROOT, 'public', 'footage'), { recursive: true });
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', 'capture/raw/frames.ffconcat',
  '-fps_mode', 'cfr', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', 'public/footage/app.mp4'], { stdio: 'inherit', shell: true, cwd: ROOT });

const seconds = (t) => Math.round(((t - origin) / 1000) * 1000) / 1000;
const capture = {
  width: session.width,
  height: session.height,
  duration: seconds(frameTime(session.frames.at(-1))),
  marks: Object.fromEntries(Object.entries(session.marks).map(([name, t]) => [name, seconds(t)])),
  pointer: session.pointer.map((p) => ({ t: seconds(p.t), x: Math.round(p.x), y: Math.round(p.y) })),
  clicks: session.clicks.map((c) => ({ t: seconds(c.t), x: Math.round(c.x), y: Math.round(c.y), label: c.label })),
};
writeFileSync(join(ROOT, 'src', 'capture.json'), JSON.stringify(capture, null, 1));
console.log(`video ${capture.duration}s, ${capture.pointer.length} pointer samples, ${capture.clicks.length} clicks`);
