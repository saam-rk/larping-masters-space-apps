/**
 * The recorded app: the footage slices, a camera that zooms on the part of the
 * interface being used, and the pointer drawn from the recorded samples (the
 * screencast does not include the system cursor).
 */

import { Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import capture from './capture.json';
import { CAMERA, FPS, HEIGHT, PLACED, sourceTime, WIDTH } from './timeline';

function cameraAt(t: number) {
  const next = CAMERA.findIndex((key) => key.t > t);
  if (next <= 0) {
    const key = next === 0 ? CAMERA[0]! : CAMERA[CAMERA.length - 1]!;
    return { scale: key.scale, x: key.x, y: key.y };
  }
  const a = CAMERA[next - 1]!;
  const b = CAMERA[next]!;
  const p = Easing.inOut(Easing.cubic)((t - a.t) / (b.t - a.t));
  return { scale: a.scale + (b.scale - a.scale) * p, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

/** Translation that puts (x, y) at the centre, clamped so the frame stays covered. */
function cameraTransform(t: number): string {
  const { scale, x, y } = cameraAt(t);
  const tx = Math.min(0, Math.max(WIDTH - WIDTH * scale, WIDTH / 2 - x * scale));
  const ty = Math.min(0, Math.max(HEIGHT - HEIGHT * scale, HEIGHT / 2 - y * scale));
  return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

function pointerAt(t: number): { x: number; y: number } {
  const samples = capture.pointer;
  if (t <= samples[0]!.t) return samples[0]!;
  let lo = 0;
  let hi = samples.length - 1;
  if (t >= samples[hi]!.t) return samples[hi]!;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  const p = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

/** Seconds of output since the most recent press, measured on the source clock and sped up like the footage. */
function pressAge(t: number, rate: number): number | null {
  let latest: number | null = null;
  for (const click of capture.clicks) if (click.t <= t) latest = click.t;
  return latest === null ? null : (t - latest) / rate;
}

function Cursor({ t, rate }: { t: number; rate: number }) {
  const { x, y } = pointerAt(t);
  const age = pressAge(t, rate);
  const pressed = age !== null && age < 0.12;
  const ring = age !== null && age < 0.45 ? age / 0.45 : null;
  return (
    <>
      {ring !== null && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 70,
            height: 70,
            marginLeft: -35,
            marginTop: -35,
            borderRadius: '50%',
            border: '3px solid #3ee8ff',
            boxShadow: '0 0 18px rgba(62, 232, 255, 0.6)',
            transform: `scale(${0.25 + ring * 0.85})`,
            opacity: 1 - ring,
          }}
        />
      )}
      <svg
        width={34}
        height={34}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: x - 3,
          top: y - 2,
          transform: `scale(${pressed ? 0.86 : 1})`,
          transformOrigin: '3px 2px',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.65))',
        }}
      >
        <path d="M3 2 L3 19 L7.6 14.8 L10.6 21.4 L13.5 20.1 L10.6 13.6 L16.8 13.6 Z" fill="#f4fff6" stroke="#06110a" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
}

export function Footage() {
  const frame = useCurrentFrame();
  const t = sourceTime(frame);
  const segment = PLACED.find((s) => frame < s.start + s.frames) ?? PLACED[PLACED.length - 1]!;
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#030604', opacity: fadeIn }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: cameraTransform(t) }}>
        {PLACED.map((s) => (
          <Sequence key={s.id} from={s.start} durationInFrames={s.frames} layout="none">
            <OffthreadVideo
              src={staticFile('footage/app.mp4')}
              trimBefore={Math.round(s.from * FPS)}
              playbackRate={s.rate}
              muted
              style={{ position: 'absolute', inset: 0, width: WIDTH, height: HEIGHT }}
            />
          </Sequence>
        ))}
        <Cursor t={t} rate={segment.rate} />
      </div>
    </div>
  );
}
