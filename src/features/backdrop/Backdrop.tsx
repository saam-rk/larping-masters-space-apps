/**
 * Everything behind and in front of the interface that is pure decoration:
 * star layers and schematics behind it, the CRT/VHS overlay in front of it.
 * All of it is `aria-hidden` and ignores the pointer.
 *
 * - `full`: pointer parallax, animated noise/tracking/flicker (plus the
 *   screen curvature, see `CrtCurvature`). With "prefers-reduced-motion"
 *   the layers stay but parallax and animations are skipped.
 * - `lite` (low performance): the same layers drawn once and left static:
 *   stars and schematics without parallax, fixed grain, scanlines, vignette
 *   and bezel. Nothing animates, so an idle page costs no frames.
 */

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../preferences/preferences';
import { setParallaxEnabled } from './motion';
import { installResizeActivity } from './resizeActivity';
import { SketchLayer } from './SketchLayer';
import { StarField } from './StarField';

export type BackdropMode = 'full' | 'lite';

/** Small tileable grain texture, generated once on the client (no network request). */
function createNoiseTexture(size = 128): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const image = context.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() * 255;
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = Math.random() < 0.5 ? 255 : 0;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function CrtOverlay({ mode }: { mode: BackdropMode }) {
  const [noise] = useState(createNoiseTexture);
  return (
    <div className="crt" data-mode={mode} aria-hidden="true">
      <div className="crt__scanlines" />
      {noise && <div className="crt__noise" style={{ backgroundImage: `url(${noise})` }} />}
      {mode === 'full' && <div className="crt__tracking" />}
      <div className="crt__glass" />
      <div className="crt__bezel" />
    </div>
  );
}

export function Backdrop({ mode }: { mode: BackdropMode }) {
  useEffect(() => {
    setParallaxEnabled(mode === 'full' && !prefersReducedMotion());
    return () => setParallaxEnabled(false);
  }, [mode]);

  // Lets the CSS drop the curvature filter and pause the overlay while the viewport changes.
  useEffect(() => installResizeActivity(), []);

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <StarField />
        <SketchLayer />
      </div>
      <CrtOverlay mode={mode} />
    </>
  );
}
