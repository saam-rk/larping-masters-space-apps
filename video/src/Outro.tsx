/**
 * Closing card: the app's own landing logo (the Salamanca astronaut on a
 * chalk orbit, imported from the app source) with the product name.
 */

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { LandingLogo } from '../../src/features/shell/LandingLogo';
import { COLORS, FONTS } from './theme';

const TITLE = 'CLPS Lunar Mission Browser';
const SUBTITLE = 'NASA Space Apps 2026 · Lunar Landing Site Navigator';

export function Outro() {
  const frame = useCurrentFrame();
  const appear = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const titleChars = Math.floor(interpolate(frame, [8, 30], [0, TITLE.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const subtitle = interpolate(frame, [26, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const drift = interpolate(frame, [0, 72], [0, -6]);
  const fadeOut = interpolate(frame, [62, 72], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 42%, ${COLORS.bgGlow} 0%, ${COLORS.bg} 70%)`,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut,
        // CSS variables the logo component reads, as in the app.
        ['--amber' as string]: COLORS.amber,
        ['--panel-solid' as string]: COLORS.bg,
      }}
    >
      <div
        style={{
          width: 760,
          color: COLORS.line,
          opacity: appear,
          transform: `translateY(${drift}px) scale(${0.86 + appear * 0.14}) rotate(${interpolate(frame, [0, 72], [-1.5, 1.5])}deg)`,
          filter: 'drop-shadow(0 0 22px rgba(255, 194, 51, 0.28))',
        }}
      >
        <style>{'.landing-logo{display:block;width:100%;height:auto;overflow:visible}'}</style>
        <LandingLogo animated={false} />
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: FONTS.retro,
          fontSize: 76,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: COLORS.accent,
          textShadow: '0 0 18px rgba(57, 255, 136, 0.45)',
          minHeight: 80,
          whiteSpace: 'pre',
        }}
      >
        {TITLE.slice(0, titleChars)}
        <span style={{ opacity: titleChars < TITLE.length || frame % 16 < 8 ? 1 : 0 }}>_</span>
      </div>
      <div style={{ marginTop: 10, fontFamily: FONTS.legible, fontWeight: 600, fontSize: 28, letterSpacing: 2, color: COLORS.muted, opacity: subtitle }}>
        {SUBTITLE}
      </div>
    </AbsoluteFill>
  );
}
