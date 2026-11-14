/**
 * Everything behind and in front of the interface that is pure decoration:
 * star layers and schematics behind it, the CRT/VHS overlay in front of it.
 * All of it is `aria-hidden` and ignores the pointer.
 *
 * Effect levels (chosen on the first visit, changeable from the sidebar):
 * - full: parallax, warp, animated noise/tracking/flicker, chromatic fringes.
 * - lite: static stars and sketches, static scanlines and vignette.
 * - off: plain background, no overlay.
 */

import { useEffect, useState } from 'react';
import type { EffectLevel } from '../../preferences/preferences';
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

function CrtOverlay({ animated }: { animated: boolean }) {
  const [noise] = useState(() => (animated ? createNoiseTexture() : null));
  return (
    <div className="crt" aria-hidden="true">
      <div className="crt__scanlines" />
      {animated && noise && <div className="crt__noise" style={{ backgroundImage: `url(${noise})` }} />}
      {animated && <div className="crt__tracking" />}
      <div className="crt__glass" />
      <div className="crt__bezel" />
    </div>
  );
}

export function Backdrop({ level, warping }: { level: EffectLevel; warping: boolean }) {
  const full = level === 'full';

  useEffect(() => {
    setParallaxEnabled(full);
    return () => setParallaxEnabled(false);
  }, [full]);

  if (level === 'off') return null;

  return (
    <>
      <div className="backdrop" data-warping={warping} aria-hidden="true">
        <StarField mode={full ? 'full' : 'lite'} />
        <SketchLayer animated={full} />
      </div>
      <CrtOverlay key={level} animated={full} />
    </>
  );
}
