/**
 * Hand-drawn schematics floating over the stars at three depths.
 *
 * The chalk texture and depth-of-field blur are baked into each SVG with a
 * filter, so the browser rasterizes every sketch once; parallax then only
 * changes a compositor `transform`, which keeps pointer movement cheap.
 */

import { useEffect, useRef } from 'react';
import { subscribeMotion } from './motion';
import { SKETCHES, type SketchDepth } from './sketches';

const DEPTH_STYLE: Readonly<
  Record<SketchDepth, { parallaxPx: number; blur: number; stroke: number; opacity: number }>
> = {
  0: { parallaxPx: 3, blur: 0.45, stroke: 1.5, opacity: 0.2 },
  1: { parallaxPx: 7, blur: 0.25, stroke: 1.9, opacity: 0.3 },
  2: { parallaxPx: 14, blur: 3.2, stroke: 3.2, opacity: 0.2 },
};

const DEPTHS: readonly SketchDepth[] = [0, 1, 2];

function ChalkFilters() {
  return (
    <svg className="backdrop__defs" aria-hidden="true" focusable="false">
      <defs>
        {DEPTHS.map((depth) => (
          <filter key={depth} id={`chalk-${depth}`} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={depth + 3} result="noise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2.6"
              xChannelSelector="R"
              yChannelSelector="G"
              result="rough"
            />
            <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed={depth + 9} result="grain" />
            <feColorMatrix
              in="grain"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.4 0 0 0 1.8"
              result="mask"
            />
            <feComposite in="rough" in2="mask" operator="in" result="chalk" />
            <feGaussianBlur in="chalk" stdDeviation={DEPTH_STYLE[depth].blur} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

export function SketchLayer({ animated }: { animated: boolean }) {
  const itemsRef = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!animated) return;
    return subscribeMotion(({ pointerX, pointerY }) => {
      SKETCHES.forEach((sketch, index) => {
        const element = itemsRef.current[index];
        if (!element) return;
        const shift = DEPTH_STYLE[sketch.depth].parallaxPx;
        element.style.transform = `translate3d(${(-pointerX * shift).toFixed(2)}px, ${(-pointerY * shift).toFixed(2)}px, 0)`;
      });
    });
  }, [animated]);

  return (
    <div className="backdrop__sketches" aria-hidden="true">
      <ChalkFilters />
      {SKETCHES.map((sketch, index) => {
        const { drawing } = sketch;
        const style = DEPTH_STYLE[sketch.depth];
        return (
          <div
            key={sketch.id}
            ref={(element) => {
              itemsRef.current[index] = element;
            }}
            className={`sketch sketch--depth-${sketch.depth}`}
            style={{
              left: `${sketch.left}%`,
              top: `${sketch.top}%`,
              width: `max(${sketch.widthVw}vw, ${Math.round(drawing.width * 0.45)}px)`,
              opacity: style.opacity,
            }}
          >
            <svg
              viewBox={`0 0 ${drawing.width} ${drawing.height}`}
              style={{ transform: `rotate(${sketch.rotate}deg)` }}
            >
              <g filter={`url(#chalk-${sketch.depth})`}>
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={style.stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {drawing.strokes.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
                <g fill="currentColor">
                  {drawing.dots.map(([cx, cy, r], i) => (
                    <circle key={i} cx={cx} cy={cy} r={r} />
                  ))}
                  {drawing.texts.map((text, i) => (
                    <text
                      key={i}
                      x={text.x}
                      y={text.y}
                      fontSize={text.size}
                      transform={text.rotate ? `rotate(${text.rotate} ${text.x} ${text.y})` : undefined}
                    >
                      {text.text}
                    </text>
                  ))}
                </g>
              </g>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
