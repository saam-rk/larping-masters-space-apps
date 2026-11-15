// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findSite } from '../../../shared/sites';
import { SAVED_SAMPLE } from '../../data/savedSample';
import { MESSAGES } from '../../i18n/messages';
import { placeBodies } from './bodies';
import { FirstPersonView } from './FirstPersonView';
import { SceneLoadingContext } from '../transition/sceneLoadingContext';

const loading = vi.hoisted(() => ({
  canvas: null as HTMLCanvasElement | null,
  connected: null as HTMLElement | null,
  register: vi.fn(() => vi.fn()),
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
  Html: vi.fn(() => null),
}));

let container: HTMLDivElement;
let canvasParent: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  loading.register.mockClear();
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

describe('first-person model loading', () => {
  it.each(['faustini-rim-a', 'cabeus-exterior-wall-1', 'malapert-crater-1'] as const)('requests the %s terrain asset through the shared polar view', (siteId) => {
    // Synthetic selection for routing only; these are not observations for the selected site.
    const data = { ...SAVED_SAMPLE, site: { ...findSite(siteId), altitudeKm: 0 as const } };
    act(() => root.render(
      <FirstPersonView data={data} bodies={{ placed: [], missing: [] }}
        controls={{ zoom: 0, onZoomChange: vi.fn(), showHorizon: true, showGuides: true, anchor: { placed: [], missing: [] }, follow: null }} />,
    ));
    expect(loading.requestedUrls.length).toBeGreaterThan(0);
    expect(new Set(loading.requestedUrls)).toEqual(new Set([`/terrain/${siteId}.glb`]));
    expect(container.textContent).toBe('');
  });

  it('keeps the shared jump registered when R3F connects its event target, without a loading portal', () => {
    const render = () => act(() => root.render(
      <SceneLoadingContext value={loading.register}>
      <FirstPersonView data={SAVED_SAMPLE} bodies={placeBodies(SAVED_SAMPLE)}
        controls={{ zoom: 0, onZoomChange: vi.fn(), showHorizon: true, showGuides: true, anchor: placeBodies(SAVED_SAMPLE), follow: null }} />
      </SceneLoadingContext>,
    ));
    render();
    expect(container.textContent).toBe('');
    expect(loading.register).toHaveBeenCalledTimes(1);
    loading.connected = document.createElement('div');
    render();
    expect(loading.register).toHaveBeenCalledTimes(1);
    const unregister = loading.register.mock.results[0]!.value;
    act(() => root.render(null));
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
