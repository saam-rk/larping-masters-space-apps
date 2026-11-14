/**
 * Everything behind and in front of the interface that is pure decoration:
 * star layers and schematics behind it, the CRT/VHS overlay in front of it.
 * All of it is `aria-hidden` and ignores the pointer.
 *
 * Effects on (chosen on the first visit, switchable from the sidebar):
 * parallax, warp, animated noise/tracking/flicker, chromatic fringes. With
 * "prefers-reduced-motion" the layers stay but pointer parallax is skipped.
 * Effects off: plain background, no overlay.
 */

import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../preferences/preferences';
import { setParallaxEnabled } from './motion';
import { SketchLayer } from './SketchLayer';
import { StarField } from './StarField';

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

function CrtOverlay() {
  const [noise] = useState(createNoiseTexture);
  return (
    <div className="crt" aria-hidden="true">
      <div className="crt__scanlines" />
      {noise && <div className="crt__noise" style={{ backgroundImage: `url(${noise})` }} />}
      <div className="crt__tracking" />
      <div className="crt__glass" />
      <div className="crt__bezel" />
    </div>
  );
}

export function Backdrop({ enabled, warping }: { enabled: boolean; warping: boolean }) {
  useEffect(() => {
    setParallaxEnabled(enabled && !prefersReducedMotion());
    return () => setParallaxEnabled(false);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div className="backdrop" data-warping={warping} aria-hidden="true">
        <StarField />
        <SketchLayer />
      </div>
      <CrtOverlay />
    </>
  );
}
