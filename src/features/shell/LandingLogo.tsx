/**
 * Start screen logo: a cartoon half-lit Moon circled by a satellite drawn in
 * the same chalk-schematic style as the background sketches (see
 * backdrop/roughPath.ts). Decorative only: it is not to scale and does not
 * show any real orbit.
 *
 * The orbit is a tilted ellipse. Its back half is drawn before the Moon (so
 * the disc hides it) and its front half after. When `animated`, the satellite
 * travels the orbit with SMIL; a mask hides it behind the disc while it is on
 * the back half. Otherwise it rests on the front half.
 */

import { createRng, roughEllipse, roughLine, type Rng } from '../backdrop/roughPath';

const WIDTH = 300;
const HEIGHT = 210;
const CX = 150;
const CY = 105;
const MOON_R = 60;
const ORBIT_RX = 112;
const ORBIT_RY = 30;
const ORBIT_TILT_DEG = -16;
/** Resting position on the front half of the orbit (degrees from +x, clockwise). */
const REST_ANGLE_DEG = 62;
const ORBIT_SECONDS = 14;

/** Lit right half plus a slightly gibbous bulge past the terminator. */
const LIT_PATH = `M${CX} ${CY - MOON_R}A${MOON_R} ${MOON_R} 0 0 1 ${CX} ${CY + MOON_R}A${MOON_R * 0.28} ${MOON_R} 0 0 1 ${CX} ${CY - MOON_R}Z`;

/** Clean ellipse for the motion path: starts at +x and runs the front half first. */
const MOTION_PATH = `M${CX + ORBIT_RX} ${CY}A${ORBIT_RX} ${ORBIT_RY} 0 1 1 ${CX - ORBIT_RX} ${CY}A${ORBIT_RX} ${ORBIT_RY} 0 1 1 ${CX + ORBIT_RX} ${CY}`;

/** Craters on the lit side: [cx, cy, r]. */
const CRATERS: readonly (readonly [number, number, number])[] = [
  [CX + 26, CY - 30, 9],
  [CX + 38, CY + 8, 6],
  [CX + 14, CY + 30, 11],
  [CX + 6, CY - 6, 4.5],
  [CX + 46, CY - 10, 3.5],
];

function roughRect(rng: Rng, x: number, y: number, w: number, h: number): string {
  return (
    roughLine(rng, x, y, x + w, y, 0.4, 1) +
    roughLine(rng, x + w, y, x + w, y + h, 0.4, 1) +
    roughLine(rng, x + w, y + h, x, y + h, 0.4, 1) +
    roughLine(rng, x, y + h, x, y, 0.4, 1)
  );
}

/** Satellite schematic centred on the origin: bus, two ruled solar panels, dish antenna. */
function satelliteStrokes(rng: Rng): string {
  let d = roughRect(rng, -6, -5, 12, 10);
  for (const side of [-1, 1] as const) {
    const inner = side * 7;
    const outer = side * 23;
    d += roughLine(rng, side * 6, 0, inner, 0, 0.3, 1);
    d += roughRect(rng, Math.min(inner, outer), -4, 16, 8);
    for (let i = 1; i < 4; i++) {
      const x = inner + ((outer - inner) * i) / 4;
      d += roughLine(rng, x, -4, x, 4, 0.2, 1);
    }
  }
  d += roughLine(rng, 0, -5, 0, -10, 0.3, 1);
  d += `M-5 -13Q0 -7 5 -13`;
  return d;
}

const rng = createRng(20261114);
const ORBIT_STROKES = roughEllipse(rng, CX, CY, ORBIT_RX, ORBIT_RY, 0, 2);
const SATELLITE_STROKES = satelliteStrokes(rng);
const REST = (() => {
  const angle = (REST_ANGLE_DEG * Math.PI) / 180;
  return { x: CX + Math.cos(angle) * ORBIT_RX, y: CY + Math.sin(angle) * ORBIT_RY };
})();

const ORBIT_TRANSFORM = `rotate(${ORBIT_TILT_DEG} ${CX} ${CY})`;

export function LandingLogo({ animated }: { animated: boolean }) {
  const chalkStroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;

  return (
    <svg className="landing-logo" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
      <defs>
        <filter id="landing-chalk" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="11" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.6 0 0 0 1.6" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <clipPath id="landing-orbit-back">
          <rect x={-WIDTH} y={-HEIGHT} width={WIDTH * 3} height={HEIGHT + CY} />
        </clipPath>
        <clipPath id="landing-orbit-front">
          <rect x={-WIDTH} y={CY} width={WIDTH * 3} height={HEIGHT * 2} />
        </clipPath>
        <clipPath id="landing-moon-disc">
          <circle cx={CX} cy={CY} r={MOON_R} />
        </clipPath>
        {/* Hides the satellite behind the disc, only while it is on the back half. */}
        <mask id="landing-behind-moon" maskUnits="userSpaceOnUse" x={-WIDTH} y={-HEIGHT} width={WIDTH * 3} height={HEIGHT * 3}>
          <rect x={-WIDTH} y={-HEIGHT} width={WIDTH * 3} height={HEIGHT * 3} fill="#fff" />
          <circle cx={CX} cy={CY} r={MOON_R} fill="#000" opacity="0">
            {animated && (
              <animate
                attributeName="opacity"
                values="0;1"
                keyTimes="0;0.5"
                calcMode="discrete"
                dur={`${ORBIT_SECONDS}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        </mask>
      </defs>

      {/* Back half of the orbit, hidden by the disc. */}
      <g className="landing-logo__chalk" transform={ORBIT_TRANSFORM} clipPath="url(#landing-orbit-back)">
        <path d={ORBIT_STROKES} filter="url(#landing-chalk)" {...chalkStroke} />
      </g>

      {/* Cartoon Moon: dim night side, lit side with craters, bold outline. */}
      <g className="landing-logo__moon">
        <circle cx={CX} cy={CY} r={MOON_R} className="landing-logo__night" />
        <g clipPath="url(#landing-moon-disc)">
          <path d={LIT_PATH} className="landing-logo__day" />
          {CRATERS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="landing-logo__crater" />
          ))}
        </g>
        <circle cx={CX} cy={CY} r={MOON_R} className="landing-logo__rim" />
      </g>

      {/* Front half of the orbit and the satellite, over the disc. */}
      <g className="landing-logo__chalk" transform={ORBIT_TRANSFORM}>
        <g clipPath="url(#landing-orbit-front)">
          <path d={ORBIT_STROKES} filter="url(#landing-chalk)" {...chalkStroke} />
        </g>
        <g mask={animated ? 'url(#landing-behind-moon)' : undefined}>
          <g transform={animated ? undefined : `translate(${REST.x} ${REST.y})`}>
            {animated && <animateMotion path={MOTION_PATH} dur={`${ORBIT_SECONDS}s`} repeatCount="indefinite" />}
            <g transform={`rotate(${-ORBIT_TILT_DEG}) scale(1.35)`}>
              <path d={SATELLITE_STROKES} filter="url(#landing-chalk)" {...chalkStroke} strokeWidth={1.2} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
