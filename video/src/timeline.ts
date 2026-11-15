/**
 * Edit decision list of the presentation video.
 *
 * Everything is placed in *source* seconds of the recorded footage
 * (public/footage/app.mp4, see capture/): each segment plays a slice of the
 * recording at a given speed, and camera moves, captions and sounds are tied
 * to source times so they stay in sync with what the app does on screen.
 * Source times come from the recording's marks (src/capture.json).
 */

import capture from './capture.json';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const OUTRO_FRAMES = 72;

export interface Segment {
  readonly id: string;
  /** Source start and end, in seconds of the recording. */
  readonly from: number;
  readonly to: number;
  /** Playback speed of the slice. */
  readonly rate: number;
}

/** Slices of the recording, in order. Gaps between them are cut (idle pauses and the ~40 s sunrise search). */
export const SEGMENTS: readonly Segment[] = [
  { id: 'setup', from: 0.4, to: 6.9, rate: 2.8 },
  { id: 'apollo', from: 6.9, to: 9.2, rate: 1.2 },
  { id: 'points', from: 11.6, to: 20.3, rate: 3.4 },
  { id: 'update', from: 20.3, to: 25.9, rate: 2.4 },
  { id: 'data', from: 25.9, to: 28.9, rate: 1.6 },
  { id: 'third', from: 28.9, to: 41.6, rate: 4.0 },
  { id: 'interval', from: 43.3, to: 46.6, rate: 2.4 },
  { id: 'rise', from: 87.9, to: 92.4, rate: 2.4 },
  { id: 'focus', from: 93.6, to: 105.4, rate: 3.6 },
  { id: 'play', from: 105.4, to: 109.1, rate: 1.0 },
  { id: 'advanced', from: 111.6, to: 121.4, rate: 3.2 },
];

export interface PlacedSegment extends Segment {
  /** First output frame and number of output frames. */
  readonly start: number;
  readonly frames: number;
}

export const PLACED: readonly PlacedSegment[] = (() => {
  let start = 0;
  return SEGMENTS.map((segment) => {
    const frames = Math.round(((segment.to - segment.from) / segment.rate) * FPS);
    const placed = { ...segment, start, frames };
    start += frames;
    return placed;
  });
})();

export const FOOTAGE_FRAMES = PLACED.reduce((sum, s) => sum + s.frames, 0);
export const TOTAL_FRAMES = FOOTAGE_FRAMES + OUTRO_FRAMES;

/** Source second shown at an output frame (clamped to the footage). */
export function sourceTime(frame: number): number {
  const segment = PLACED.find((s) => frame < s.start + s.frames) ?? PLACED[PLACED.length - 1]!;
  const local = Math.min(Math.max(frame - segment.start, 0), segment.frames);
  return segment.from + (local / FPS) * segment.rate;
}

/** Output frame at which a source second is shown, or null when that moment was cut. */
export function outputFrame(source: number): number | null {
  for (const s of PLACED) {
    if (source >= s.from && source < s.to) return s.start + ((source - s.from) / s.rate) * FPS;
  }
  return null;
}

/** Output frames where the footage jumps (a cut between non-contiguous slices). */
export const JUMP_CUTS: readonly number[] = PLACED.slice(1)
  .filter((s, i) => Math.abs(s.from - PLACED[i]!.to) > 0.05)
  .map((s) => s.start);

/** Camera keyframes in source seconds: zoom `scale` around the point (x, y) of the 1920×1080 recording. */
export interface CameraKey {
  readonly t: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

export const CAMERA: readonly CameraKey[] = [
  { t: 0, scale: 1.14, ...CENTER },
  { t: 6.2, scale: 1.14, ...CENTER },
  { t: 6.9, scale: 1, ...CENTER },
  { t: 9.2, scale: 1.08, x: 1200, y: 480 },
  { t: 11.6, scale: 1.08, x: 1200, y: 480 },
  { t: 12.8, scale: 1.55, x: 330, y: 250 },
  { t: 18.9, scale: 1.55, x: 330, y: 250 },
  { t: 20.1, scale: 1, ...CENTER },
  { t: 25.9, scale: 1, ...CENTER },
  { t: 26.7, scale: 1.6, x: 1190, y: 960 },
  { t: 28.1, scale: 1.6, x: 1190, y: 960 },
  { t: 29.1, scale: 1, ...CENTER },
  { t: 31.2, scale: 1, ...CENTER },
  { t: 33.0, scale: 1.22, x: 1380, y: 330 },
  { t: 38.6, scale: 1.22, x: 1380, y: 330 },
  { t: 40.2, scale: 1, ...CENTER },
  { t: 43.3, scale: 1, ...CENTER },
  { t: 45.0, scale: 1.3, x: 960, y: 560 },
  { t: 92.4, scale: 1.3, x: 960, y: 560 },
  { t: 93.6, scale: 1, ...CENTER },
  { t: 105.4, scale: 1, ...CENTER },
  { t: 106.6, scale: 1.1, x: 960, y: 560 },
  { t: 109.1, scale: 1.1, x: 960, y: 560 },
  { t: 111.6, scale: 1, ...CENTER },
  { t: 115.4, scale: 1, ...CENTER },
  { t: 116.6, scale: 1.45, x: 320, y: 800 },
  { t: 122, scale: 1.45, x: 320, y: 800 },
];

export interface Caption {
  readonly from: number;
  readonly to: number;
  readonly step: string;
  readonly title: string;
  readonly detail: string;
  /** Screen corner; lower-left unless the zoomed interface needs that space. */
  readonly corner?: 'bottom-left' | 'top-left' | 'top-right';
}

/** Lower-left captions, in source seconds. Kept short: the voice-over is added in post-production. */
export const CAPTIONS: readonly Caption[] = [
  { from: 0.4, to: 6.7, step: '01', title: 'Setup', detail: 'Full effects · English' },
  { from: 6.9, to: 9.2, step: '02', title: 'Apollo 11', detail: 'Default scene · first landing' },
  { from: 11.6, to: 25.9, step: '03', title: 'Amundsen Rim', detail: 'Live UTC time → Update view' },
  { from: 25.9, to: 28.9, step: '04', title: 'Data', detail: 'Sun & Earth azimuth and elevation · JPL Horizons', corner: 'top-left' },
  { from: 28.9, to: 41.6, step: '05', title: '3rd person', detail: 'Visual scale · Guide · Compass' },
  { from: 43.3, to: 92.4, step: '06', title: 'Interval', detail: 'Start at sunrise → Prepare interval' },
  { from: 93.6, to: 105.4, step: '07', title: 'Full screen · 1st person', detail: 'Facing the astronaut · speed 4× → Play' },
  { from: 105.4, to: 109.1, step: '07', title: 'Real-time shadows', detail: 'The Sun crosses behind the astronaut' },
  { from: 112.0, to: 121.4, step: '08', title: 'Advanced mode', detail: 'Inverse search · Feasibility · Compare scenarios', corner: 'top-right' },
];

/** Small tag shown right after the sunrise-search cut, so the shortened wait is not hidden. */
export const SKIP_TAG = { from: 87.9, to: 89.6, text: '▸▸ sunrise search shortened' };

export interface Cue {
  readonly t: number;
  readonly sound: 'click' | 'blip' | 'whoosh' | 'warp' | 'ticks';
  readonly volume: number;
}

const marks = capture.marks;

/** Sound cues in source seconds. Clicks follow every recorded press. */
export const CUES: readonly Cue[] = [
  ...capture.clicks.map((c) => ({ t: c.t, sound: 'click' as const, volume: 0.35 })),
  { t: marks.update + 0.05, sound: 'warp', volume: 0.36 },
  { t: marks.third + 0.05, sound: 'whoosh', volume: 0.3 },
  { t: marks.fullscreen + 0.05, sound: 'whoosh', volume: 0.3 },
  { t: marks.first + 0.05, sound: 'whoosh', volume: 0.3 },
  { t: marks.exitFullscreen + 0.05, sound: 'whoosh', volume: 0.25 },
  { t: 26.0, sound: 'ticks', volume: 0.18 },
  { t: marks.riseFound, sound: 'blip', volume: 0.25 },
  { t: marks.ready, sound: 'blip', volume: 0.25 },
];
