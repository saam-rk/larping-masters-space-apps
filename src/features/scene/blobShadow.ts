/**
 * Soft dark disc texture for the contact shadow under the astronaut in the
 * first-person view. Decorative depth cue only: it does not follow the Sun
 * direction and is not a computed shadow.
 */

import { CanvasTexture, SRGBColorSpace } from 'three';

let cached: CanvasTexture | null = null;

export function blobShadowTexture(): CanvasTexture {
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.75)');
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  cached = new CanvasTexture(canvas);
  cached.colorSpace = SRGBColorSpace;
  return cached;
}
