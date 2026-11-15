// @vitest-environment jsdom

import { act, useLayoutEffect, type ReactNode, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSite } from '../../../shared/sites';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { placeBodies } from './bodies';
import { FirstPersonView } from './FirstPersonView';

const loading = vi.hoisted(() => ({
  canvas: null as HTMLCanvasElement | null,
  connected: null as HTMLElement | null,
  targets: [] as (HTMLElement | null)[],
  requestedUrls: [] as string[],
  pending: new Promise<never>(() => {}),
}));

vi.mock('../../i18n/context', () => ({
  useI18n: () => ({ locale: 'en', messages: MESSAGES.en }),
}));

vi.mock('@react-three/fiber', () => ({
  useThree: (select: (state: unknown) => unknown) => select({ size: { width: 800, height: 480 }, gl: { domElement: loading.canvas }, events: { connected: loading.connected } }),
}));

vi.mock('@react-three/drei', () => ({
  PerspectiveCamera: () => null,
  Line: () => null,
  useGLTF: (url: string) => { loading.requestedUrls.push(url); throw loading.pending; },
  // Mirror Html's target selection and root-effect dependency without requiring WebGL in jsdom.
  Html: ({ portal, children }: { portal?: RefObject<HTMLElement>; children: ReactNode }) => {
    const target = portal?.current ?? loading.connected ?? loading.canvas?.parentElement ?? null;
    useLayoutEffect(() => { loading.targets.push(target); }, [target]);
    return <div>{children}</div>;
  },
}));

let container: HTMLDivElement;
let canvasParent: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  loading.targets = [];
  loading.requestedUrls = [];
  loading.connected = null;
  canvasParent = document.createElement('div');
  loading.canvas = document.createElement('canvas');
  canvasParent.append(loading.canvas);
  container = document.createElement('div');
  document.body.append(canvasParent, container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  canvasParent.remove();
  container.remove();
  vi.unstubAllGlobals();
});

describe('first-person loading portal', () => {
  it('requests the Faustini terrain asset through the shared polar view', () => {
    // Synthetic selection for routing only; the saved observations are not Faustini data.
    const data = { ...SAVED_SAMPLE, site: { ...findSite('faustini-rim-a'), altitudeKm: 0 as const } };
    act(() => root.render(
      <FirstPersonView data={data} bodies={{ placed: [], missing: [] }}
        controls={{ zoom: 0, onZoomChange: vi.fn(), showHorizon: true }} />,
    ));
    expect(loading.requestedUrls.length).toBeGreaterThan(0);
    expect(new Set(loading.requestedUrls)).toEqual(new Set(['/terrain/faustini-rim-a.glb']));
    expect(container.textContent).toContain(MESSAGES.en.scene.terrainLoading);
  });

  it('keeps the loading root on the canvas parent when R3F connects its event target', () => {
    const render = () => act(() => root.render(
      <FirstPersonView data={SAVED_SAMPLE} bodies={placeBodies(SAVED_SAMPLE)}
        controls={{ zoom: 0, onZoomChange: vi.fn(), showHorizon: true }} />,
    ));
    render();
    expect(container.textContent).toContain(MESSAGES.en.scene.terrainLoading);
    expect(loading.targets).toEqual([canvasParent]);
    loading.connected = document.createElement('div');
    render();
    // No target change means no second nested DOM root or racing cleanup for the same portal element.
    expect(loading.targets).toEqual([canvasParent]);
  });
});
