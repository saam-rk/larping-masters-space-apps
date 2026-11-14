/**
 * Landing and settings logo: the Salamanca astronaut circled by a satellite
 * on a decorative chalk orbit.
 *
 * The astronaut sits between the back and front halves of the orbit. A mask
 * covers the satellite as it passes behind the astronaut. With animation
 * disabled, the satellite rests on the front half.
 */

import { useId, type ComponentProps } from 'react';
import { createRng, roughEllipse, roughLine, type Rng } from '../backdrop/roughPath';
import astronautImage from './salamanca-astronaut.png';

const WIDTH = 300;
const HEIGHT = 210;
const CX = 150;
const CY = 105;
const ASTRONAUT_SIZE = 122;
const ORBIT_RX = 112;
const ORBIT_RY = 30;
const ORBIT_TILT_DEG = -16;
/** Resting position on the front half of the orbit (degrees from +x, clockwise). */
const REST_ANGLE_DEG = 62;
const ORBIT_SECONDS = 14;

/** Clean ellipse for the motion path: starts at +x and runs the front half first. */
const MOTION_PATH = `M${CX + ORBIT_RX} ${CY}A${ORBIT_RX} ${ORBIT_RY} 0 1 1 ${CX - ORBIT_RX} ${CY}A${ORBIT_RX} ${ORBIT_RY} 0 1 1 ${CX + ORBIT_RX} ${CY}`;

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

type AstronautPosition = Pick<ComponentProps<'svg'>, 'x' | 'y' | 'width' | 'height'>;

export function AstronautMark(position: AstronautPosition) {
  const tintId = useId();

  return (
    <svg viewBox="152 72 920 1128" aria-hidden="true" focusable="false" {...position}>
      <defs>
        <filter id={tintId} colorInterpolationFilters="sRGB">
          <feComponentTransfer result="dense">
            <feFuncA type="linear" slope="3" intercept="-0.05" />
          </feComponentTransfer>
          <feFlood floodColor="var(--amber)" />
          <feComposite in2="dense" operator="in" />
        </filter>
      </defs>
      {/* Fill the suit's interior so the visor and shadows occlude the orbit. */}
      <path
        fill="var(--panel-solid)"
        d="M302 320Q269 242 313 165L365 107Q404 86 505 108Q564 110 596 193
           Q613 241 600 321L628 343Q662 374 734 373L884 365L974 329L1019 327
           L1038 375L993 412L920 428L857 445L730 445L672 455L648 509
           Q720 527 737 612L729 637L815 639Q882 646 905 722L941 761
           L978 748Q1042 733 1050 784Q1054 837 1005 866L967 928
           Q918 970 858 927L784 861L732 776L691 770L650 723
           Q664 777 682 818L731 908Q775 938 777 1013L802 1101
           Q818 1173 754 1178Q694 1188 662 1122L606 1046L534 935
           L493 859Q452 855 429 819Q385 772 406 711L365 691
           Q341 745 289 720L228 665Q181 626 181 552Q194 496 235 457
           Q213 427 235 400Q261 359 314 350Z"
      />
      <image href={astronautImage} width="1225" height="1284" filter={`url(#${tintId})`} />
    </svg>
  );
}

export function LandingLogo({ animated }: { animated: boolean }) {
  const prefix = useId().replace(/\W/g, '');
  const ids = {
    chalk: `${prefix}-chalk`,
    orbit_back: `${prefix}-orbit-back`,
    orbit_front: `${prefix}-orbit-front`,
    astronaut: `${prefix}-astronaut`,
    silhouette: `${prefix}-silhouette`,
    satellite_mask: `${prefix}-satellite-mask`,
  };
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
        <filter id={ids.chalk} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="11" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.6 0 0 0 1.6" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <clipPath id={ids.orbit_back}>
          <rect x={-WIDTH} y={-HEIGHT} width={WIDTH * 3} height={HEIGHT + CY} />
        </clipPath>
        <clipPath id={ids.orbit_front}>
          <rect x={-WIDTH} y={CY} width={WIDTH * 3} height={HEIGHT * 2} />
        </clipPath>
        <g id={ids.astronaut}>
          <AstronautMark
            x={CX - ASTRONAUT_SIZE / 2}
            y={CY - ASTRONAUT_SIZE / 2}
            width={ASTRONAUT_SIZE}
            height={ASTRONAUT_SIZE}
          />
        </g>
        <filter id={ids.silhouette}>
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        {animated && (
          <mask id={ids.satellite_mask} maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
            <rect width={WIDTH} height={HEIGHT} fill="#fff" />
            <use href={`#${ids.astronaut}`} filter={`url(#${ids.silhouette})`} opacity="0">
              <animate
                attributeName="opacity"
                values="0;1"
                keyTimes="0;0.5"
                calcMode="discrete"
                dur={`${ORBIT_SECONDS}s`}
                repeatCount="indefinite"
              />
            </use>
          </mask>
        )}
      </defs>

      <g transform={ORBIT_TRANSFORM} clipPath={`url(#${ids.orbit_back})`}>
        <path d={ORBIT_STROKES} filter={`url(#${ids.chalk})`} {...chalkStroke} />
      </g>

      <use href={`#${ids.astronaut}`} />

      <g transform={ORBIT_TRANSFORM} clipPath={`url(#${ids.orbit_front})`}>
        <path d={ORBIT_STROKES} filter={`url(#${ids.chalk})`} {...chalkStroke} />
      </g>

      <g mask={animated ? `url(#${ids.satellite_mask})` : undefined}>
        <g transform={ORBIT_TRANSFORM}>
          <g transform={animated ? undefined : `translate(${REST.x} ${REST.y})`}>
            {animated && <animateMotion path={MOTION_PATH} dur={`${ORBIT_SECONDS}s`} repeatCount="indefinite" />}
            <g transform={`rotate(${-ORBIT_TILT_DEG}) scale(1.35)`}>
              <path d={SATELLITE_STROKES} filter={`url(#${ids.chalk})`} {...chalkStroke} strokeWidth={1.2} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
