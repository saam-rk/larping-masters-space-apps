// @vitest-environment jsdom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatAngle } from '../../format';
import { MESSAGES } from '../../i18n/messages';
import { AngleLegend } from './AngleLegend';
import type { SceneBody } from './bodies';
import { horizontalToDirection } from './geometry';
import { ScaleToggle } from './ScaleToggle';
import { DEFAULT_SCENE_SCALE, type SceneScale } from './sceneScale';

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function body(id: SceneBody['body'], azimuthDeg: number, elevationDeg: number): SceneBody {
  return {
    body: id,
    azimuthDeg,
    elevationDeg,
    direction: horizontalToDirection(azimuthDeg, elevationDeg),
    angularDiameterDeg: 0.5,
    rangeKm: 1,
    nominalSize: false,
    nominalRange: false,
  };
}

function ToggleHarness() {
  const [scale, setScale] = useState<SceneScale>(DEFAULT_SCENE_SCALE);
  return <ScaleToggle scale={scale} onChange={setScale} />;
}

describe('scale switch', () => {
  it('starts at visual scale and switches to real scale', () => {
    act(() => root.render(<ToggleHarness />));
    const [visual, real] = container.querySelectorAll<HTMLButtonElement>('button');
    expect(visual!.textContent).toBe('Visual');
    expect(visual!.getAttribute('aria-pressed')).toBe('true');
    expect(real!.getAttribute('aria-pressed')).toBe('false');
    act(() => real!.click());
    expect(visual!.getAttribute('aria-pressed')).toBe('false');
    expect(real!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('angle legend', () => {
  it('lists each body and the Earth − Sun difference across north', () => {
    act(() => root.render(<AngleLegend bodies={[body('sun', 350, 1.25), body('earth', 20, 6.5)]} />));
    const rows = [...container.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Sun', formatAngle(350, 'en'), formatAngle(1.25, 'en')],
      ['Earth', formatAngle(20, 'en'), formatAngle(6.5, 'en')],
      ['Δ E − S', '+30.0°', '+5.3°'],
      ['Separation', expect.stringMatching(/^30\.\d°$/)],
    ]);
    // Highest elevation 6.5°: drawn ×5 so it reads on the dome.
    expect(container.querySelector('tfoot')!.textContent).toBe('Elevation drawn ×5');
  });

  it('has no exaggeration footer when the bodies are high enough', () => {
    act(() => root.render(<AngleLegend bodies={[body('sun', 90, 40), body('earth', 200, 15)]} />));
    expect(container.querySelector('tfoot')).toBeNull();
  });

  it('shows no difference rows with a single body', () => {
    act(() => root.render(<AngleLegend bodies={[body('sun', 90, -2)]} />));
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('tbody td:last-child')!.textContent).toBe('−2.0°');
  });
});
