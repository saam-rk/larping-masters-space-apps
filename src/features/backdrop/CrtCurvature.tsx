/**
 * Curved-glass ("fisheye") distortion of the interface, like the bulging
 * tube of an old CRT: straight lines bow outward and the edges bend away.
 *
 * Implemented as an SVG displacement filter applied with CSS to the app frame
 * (`:root[data-curve='on'] .app__frame`). The displacement map is computed
 * once per viewport size on a small canvas and stretched by the browser; the
 * field is smooth, so bilinear scaling keeps it exact enough. Its resolution
 * is capped (`MAX_MAP_SIDE`), so zooming out (a larger CSS viewport) does not
 * make it more expensive, and it is rebuilt on the frame after a resize: the
 * filter region follows the viewport, and a stale, smaller region would clip
 * the frame after zooming out.
 *
 * Limits:
 * - The filter only moves pixels, and the browser hit-tests the undistorted
 *   layout, so near the screen edges a control is drawn up to `maxShift()` px
 *   away from where it reacts. `curvaturePointer.ts` remaps hover and clicks to
 *   the drawn position while the filter is on. Dialogs open in the top layer
 *   and are not distorted.
 * - The cost depends on the browser. Chromium runs the filter on the GPU;
 *   Firefox has no accelerated path for it and filters the frame on the CPU,
 *   ~140 ms per repaint, so the filter is never used there (`isFirefox`).
 *   Any other browser is probed once the page has settled (see `PROBE`) and
 *   the filter is dropped for the rest of the visit where it is too slow. The
 *   star field and the bezel keep their curvature either way.
 */

import { useEffect, useState } from 'react';
import { barrelShift, encodeShift, evaluateProbe, isCalm, isFirefox, mapChannels, maxShift, PROBE, type MapChannels } from './curvature';
import { installCurvaturePointer } from './curvaturePointer';

/** Decided once: the browser does not change during a visit. */
const FILTER_SUPPORTED = typeof navigator === 'undefined' || !isFirefox(navigator.userAgent);

const CRT_CURVATURE_FILTER_ID = 'crt-curvature';

/** Map resolution relative to the viewport. */
const MAP_SCALE = 1 / 8;
/** Largest map side, px (a 1920 px wide viewport already gives ~250). */
const MAX_MAP_SIDE = 256;

interface CurvatureMap {
  readonly url: string;
  /** Viewport size, px. */
  readonly width: number;
  readonly height: number;
  /**
   * Overscan, px: the filter region and the map extend this far beyond each
   * edge of the viewport. Near the sides the barrel samples the source from
   * outside the frame; a region clipped to the frame would leave that
   * transparent and show the backdrop beside the frame.
   */
  readonly pad: number;
  /** feDisplacementMap `scale`, px. */
  readonly scale: number;
  readonly channels: MapChannels;
}

/**
 * Output pixel (x, y) samples the source at center + d·fit·(1 + k·r²), with r
 * the distance from the center over the half-diagonal and `fit` from
 * `barrelFit` (keeps the top and bottom rows in place). Encoded for
 * feDisplacementMap as channel = 0.5 + shift / scale (8 bits), one axis in a
 * grey and the other in alpha so that colour management cannot alter it (see
 * `mapChannels`). The map covers the viewport plus `pad` px on every side.
 */
function createMap(width: number, height: number): CurvatureMap | null {
  try {
    const shift = maxShift(width, height);
    const pad = Math.ceil(shift) + 2;
    const regionWidth = width + 2 * pad;
    const regionHeight = height + 2 * pad;
    const mapScale = Math.min(MAP_SCALE, MAX_MAP_SIDE / Math.max(regionWidth, regionHeight));
    const mapWidth = Math.max(16, Math.round(regionWidth * mapScale));
    const mapHeight = Math.max(16, Math.round(regionHeight * mapScale));
    const canvas = document.createElement('canvas');
    canvas.width = mapWidth;
    canvas.height = mapHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const cx = width / 2;
    const cy = height / 2;
    const channels = mapChannels(width, height);
    // Room for the largest shift on either side, with a small margin.
    const scale = Math.ceil(2 * shift * 1.05) + 1;
    const image = context.createImageData(mapWidth, mapHeight);

    for (let j = 0; j < mapHeight; j++) {
      const dy = ((j + 0.5) / mapHeight) * regionHeight - pad - cy;
      for (let i = 0; i < mapWidth; i++) {
        const dx = ((i + 0.5) / mapWidth) * regionWidth - pad - cx;
        const [shiftX, shiftY] = barrelShift(dx, dy, width, height);
        const grey = encodeShift(channels.x === 'R' ? shiftX : shiftY, scale);
        const alpha = encodeShift(channels.x === 'R' ? shiftY : shiftX, scale);
        const offset = (j * mapWidth + i) * 4;
        image.data[offset] = grey;
        image.data[offset + 1] = grey;
        image.data[offset + 2] = grey;
        image.data[offset + 3] = alpha;
      }
    }
    context.putImageData(image, 0, 0);
    return { url: canvas.toDataURL('image/png'), width, height, pad, scale, channels };
  } catch {
    return null;
  }
}

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Result of the probe for this page visit; `null` until it has run. */
let probeResult: 'fast' | 'slow' | null = null;

/**
 * First waits for the page to settle (loaded, fonts ready, 3D canvas mounted,
 * calm frames: the load itself is slow and used to be blamed on the filter),
 * then repaints a tiny element inside the filtered frame on every animation
 * frame (see `.app__frame[data-probe]` in the CSS) and reports whether the
 * browser keeps up. Time spent in a hidden tab is discarded. Returns a cancel
 * function.
 */
function runProbe(onResult: (result: 'fast' | 'slow') => void): () => void {
  const frame = document.querySelector<HTMLElement>('.app__frame');
  if (!frame) {
    onResult('fast');
    return () => {};
  }

  const started = performance.now();
  let loaded = document.readyState === 'complete';
  let fontsReady = false;
  const onLoad = () => {
    loaded = true;
  };
  if (!loaded) window.addEventListener('load', onLoad, { once: true });
  const fonts = document.fonts?.ready;
  if (fonts) {
    void fonts.then(() => {
      fontsReady = true;
    });
  } else {
    fontsReady = true;
  }

  let id = 0;
  let last = 0;
  let toggle = false;
  let skipped = 0;
  let deltas: number[] = [];
  let settled = false;
  const settleDeltas: number[] = [];

  const isSettled = (time: number) => {
    if (time - started > PROBE.settleTimeoutMs) return true;
    // `.scene-stage canvas` appears once the lazily loaded 3D scene has mounted.
    const ready = loaded && fontsReady && document.querySelector('.scene-stage canvas') !== null;
    return ready && isCalm(settleDeltas);
  };

  const step = (time: number) => {
    if (!settled) {
      if (!document.hidden && last !== 0) settleDeltas.push(time - last);
      if (settleDeltas.length > PROBE.calmFrames) settleDeltas.shift();
      last = document.hidden ? 0 : time;
      if (isSettled(time)) {
        settled = true;
        last = 0;
      }
      id = requestAnimationFrame(step);
      return;
    }

    if (document.hidden || last === 0 || time - last > 1000) {
      // First frame, or the tab was in the background: start measuring again.
      skipped = 0;
      deltas = [];
    } else if (skipped < PROBE.warmupFrames) {
      skipped += 1;
    } else {
      deltas.push(time - last);
      const verdict = evaluateProbe(deltas);
      if (verdict !== 'pending') {
        frame.removeAttribute('data-probe');
        onResult(verdict);
        return;
      }
    }
    last = document.hidden ? 0 : time;
    toggle = !toggle;
    frame.dataset.probe = toggle ? 'a' : 'b';
    id = requestAnimationFrame(step);
  };

  id = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(id);
    window.removeEventListener('load', onLoad);
    frame.removeAttribute('data-probe');
  };
}

export function CrtCurvature({ enabled: requested }: { enabled: boolean }) {
  const enabled = requested && FILTER_SUPPORTED;
  const [map, setMap] = useState<CurvatureMap | null>(null);
  const [verdict, setVerdict] = useState<'probing' | 'fast' | 'slow'>(probeResult ?? 'probing');

  useEffect(() => {
    if (!enabled) return;
    let frame: number | null = null;
    let built = { width: 0, height: 0 };
    const build = () => {
      frame = null;
      const { width, height } = readViewport();
      if (width === built.width && height === built.height) return;
      built = { width, height };
      setMap(createMap(width, height));
    };
    // One rebuild per frame, however many resize events arrive in it.
    const onResize = () => {
      if (frame === null) frame = requestAnimationFrame(build);
    };
    build();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  const active = enabled && map !== null && verdict !== 'slow';

  // The CSS only references the filter once the map exists.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.curve = active ? 'on' : 'off';
    if (active) root.style.setProperty('--curve-pad', `${map.pad}px`);
    return () => {
      root.dataset.curve = 'off';
      root.style.removeProperty('--curve-pad');
    };
  }, [active, map]);

  // Hover and clicks follow the drawn position of the controls, not the layout one.
  useEffect(() => {
    if (!active) return;
    return installCurvaturePointer();
  }, [active]);

  // Check once per visit that the filter does not make the page lag.
  const probing = active && verdict === 'probing';
  useEffect(() => {
    if (!probing) return;
    return runProbe((result) => {
      probeResult = result;
      setVerdict(result);
      if (result === 'slow') {
        console.info('[crt] Screen curvature filter disabled: repaints were too slow in this browser.');
      }
    });
  }, [probing]);

  if (!active) return null;

  return (
    <svg className="crt-curvature" aria-hidden="true" focusable="false" width="0" height="0">
      <filter
        id={CRT_CURVATURE_FILTER_ID}
        filterUnits="userSpaceOnUse"
        primitiveUnits="userSpaceOnUse"
        x={-map.pad}
        y={-map.pad}
        width={map.width + 2 * map.pad}
        height={map.height + 2 * map.pad}
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={map.url}
          x={-map.pad}
          y={-map.pad}
          width={map.width + 2 * map.pad}
          height={map.height + 2 * map.pad}
          preserveAspectRatio="none"
          result="map"
        />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={map.scale} xChannelSelector={map.channels.x} yChannelSelector={map.channels.y} />
      </filter>
    </svg>
  );
}
