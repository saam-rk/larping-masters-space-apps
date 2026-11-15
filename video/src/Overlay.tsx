/**
 * Light on-screen guidance over the footage: a lower-left step caption in the
 * app's terminal style, a tag where a wait was shortened, and a brief CRT
 * flicker on jump cuts.
 */

import { interpolate, useCurrentFrame } from 'remotion';
import { CAPTIONS, JUMP_CUTS, outputFrame, SKIP_TAG } from './timeline';
import { COLORS, FONTS } from './theme';

function useSpan(from: number, to: number) {
  const frame = useCurrentFrame();
  const start = outputFrame(from) ?? 0;
  const end = outputFrame(to - 0.001) ?? start;
  const visible = frame >= start && frame <= end + 1;
  const opacity = interpolate(frame, [start, start + 6, end - 5, end + 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { visible, opacity, local: frame - start };
}

const CORNERS = {
  'bottom-left': { left: 56, bottom: 64 },
  'top-left': { left: 56, top: 56 },
  'top-right': { right: 56, top: 56 },
} as const;

function CaptionCard({ step, title, detail, from, to, corner = 'bottom-left' }: (typeof CAPTIONS)[number]) {
  const { visible, opacity, local } = useSpan(from, to);
  if (!visible) return null;
  // Type the detail line in, like the app's scrambled labels settling.
  const shown = Math.min(detail.length, Math.max(0, Math.floor((local - 3) * 2.6)));
  return (
    <div
      style={{
        position: 'absolute',
        ...CORNERS[corner],
        opacity,
        transform: `translateY(${interpolate(local, [0, 8], [14, 0], { extrapolateRight: 'clamp' })}px)`,
        display: 'flex',
        alignItems: 'stretch',
        background: 'rgba(3, 8, 5, 0.86)',
        border: `2px solid ${COLORS.cyan}`,
        boxShadow: `0 0 24px rgba(62, 232, 255, 0.25), inset 0 0 18px rgba(57, 255, 136, 0.06)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.retro,
          fontSize: 44,
          lineHeight: 1,
          color: COLORS.bg,
          background: COLORS.cyan,
          padding: '14px 16px 10px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {step}
      </div>
      <div style={{ padding: '10px 22px 12px 18px', minWidth: 300 }}>
        <div style={{ fontFamily: FONTS.retro, fontSize: 40, lineHeight: 1, letterSpacing: 3, textTransform: 'uppercase', color: COLORS.accent }}>
          {title}
        </div>
        <div style={{ fontFamily: FONTS.legible, fontWeight: 600, fontSize: 22, marginTop: 6, color: COLORS.text, whiteSpace: 'pre' }}>
          {detail.slice(0, shown)}
          <span style={{ opacity: shown < detail.length ? 1 : 0, color: COLORS.accent }}>▌</span>
        </div>
      </div>
    </div>
  );
}

function SkipTag() {
  const { visible, opacity } = useSpan(SKIP_TAG.from, SKIP_TAG.to);
  if (!visible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 56,
        top: 52,
        opacity,
        fontFamily: FONTS.retro,
        fontSize: 32,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: COLORS.amber,
        background: 'rgba(3, 8, 5, 0.86)',
        border: `2px solid ${COLORS.amber}`,
        padding: '6px 16px 4px',
      }}
    >
      {SKIP_TAG.text}
    </div>
  );
}

function CutFlicker() {
  const frame = useCurrentFrame();
  const cut = JUMP_CUTS.find((f) => frame >= f && frame < f + 5);
  if (cut === undefined) return null;
  const k = frame - cut;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#d3ebcc', opacity: [0.16, 0.08, 0.04, 0.02, 0][k], mixBlendMode: 'screen' }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${(cut * 37) % 80}%`,
          height: 90 - k * 16,
          background: 'linear-gradient(180deg, transparent, rgba(57,255,136,0.18), transparent)',
        }}
      />
    </>
  );
}

export function Overlay() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {CAPTIONS.map((caption) => (
        <CaptionCard key={`${caption.step}-${caption.from}`} {...caption} />
      ))}
      <SkipTag />
      <CutFlicker />
    </div>
  );
}
