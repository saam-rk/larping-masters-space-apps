/** Colours and fonts taken from the app (src/styles.css in the repository root). */

import { continueRender, delayRender, staticFile } from 'remotion';

export const COLORS = {
  bg: '#030604',
  bgGlow: '#0b170e',
  panelSolid: '#040a06',
  line: '#d3ebcc',
  text: '#e2f6dc',
  muted: '#93b398',
  accent: '#39ff88',
  cyan: '#3ee8ff',
  amber: '#ffc233',
} as const;

export const FONTS = {
  retro: "'VT323', monospace",
  legible: "'Iosevka', monospace",
} as const;

const faces = [
  new FontFace('VT323', `url(${staticFile('fonts/vt323-latin-400-normal.woff2')}) format('woff2')`, { weight: '400' }),
  new FontFace('Iosevka', `url(${staticFile('fonts/iosevka-latin-600-normal.woff2')}) format('woff2')`, { weight: '600' }),
];
const handle = delayRender('Loading fonts');
Promise.all(faces.map((face) => face.load()))
  .then((loaded) => {
    loaded.forEach((face) => document.fonts.add(face));
    continueRender(handle);
  })
  .catch((error) => {
    console.error(error);
    continueRender(handle);
  });
