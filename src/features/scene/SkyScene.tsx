/**
 * 3D local horizon. Two views read the same Sun/Earth placement
 * (`placeBodies`, from the azimuth/elevation shown in the results panel):
 *
 * - `first-person`: eye level next to a 1.70 m astronaut on the LOLA terrain
 *   of Nobile Rim 1, Nobile Rim 2, Shackleton Rim or Amundsen Rim (only where
 *   a terrain model exists, see
 *   `terrain/models.ts`).
 * - `third-person`: at visual scale (default), a schematic sky dome with the
 *   true directions and labeled azimuth/elevation guides; at real scale,
 *   Moon, Earth and Sun to scale around the tangent horizon (see
 *   `sceneScale.ts`). The "Scale" switch over the view picks one.
 *
 * Both have a decorative 3D star background. The canvas fills whatever height
 * its box gets; notes and the zoom control are overlaid so the view keeps its
 * full height. Each view keeps its own zoom level (see `zoom.ts`), shared
 * between the slider and the camera controls (the two third-person scales
 * keep separate levels, since their distances differ). `showHorizon` comes from the
 * "Compass" switch in the box title (see `CompassToggle`) and hides the
 * horizon reference in both views.
 */

import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { useI18n } from '../../i18n/context';
import { AngleLegend } from './AngleLegend';
import { elevationExaggeration } from './angles';
import { placeBodies } from './bodies';
import { FirstPersonView } from './FirstPersonView';
import { ScaleToggle } from './ScaleToggle';
import { DEFAULT_SCENE_SCALE, type SceneScale } from './sceneScale';
import { StarSphere } from './StarSphere';
import { ThirdPersonView } from './ThirdPersonView';
import type { ViewMode } from './viewMode';
import { ZoomControl } from './ZoomControl';
import { START_VISUAL_ZOOM, START_ZOOM, distanceForLevel, fovForLevel } from './zoom';

/** Zoom kept per view, and per scale in third person. */
type ZoomKey = 'first-person' | 'third-person-real' | 'third-person-visual';
const START_ZOOM_BY_KEY: Readonly<Record<ZoomKey, number>> = {
  'first-person': START_ZOOM['first-person'],
  'third-person-real': START_ZOOM['third-person'],
  'third-person-visual': START_VISUAL_ZOOM,
};

export default function SkyScene({
  data,
  mode,
  showHorizon,
}: {
  data: EphemerisResponse;
  mode: ViewMode;
  /** Horizon line (first person) and grid (third person). */
  showHorizon: boolean;
}) {
  const { messages, locale } = useI18n();
  const bodies = useMemo(() => placeBodies(data), [data]);
  const [scale, setScale] = useState<SceneScale>(DEFAULT_SCENE_SCALE);
  const visual = mode === 'third-person' && scale === 'visual';
  const zoomKey: ZoomKey = mode === 'first-person' ? 'first-person' : `third-person-${scale}`;
  const [zoomByKey, setZoomByKey] = useState<Record<ZoomKey, number>>(START_ZOOM_BY_KEY);
  const zoom = zoomByKey[zoomKey];
  const setZoom = useCallback(
    (level: number) => setZoomByKey((current) => (current[zoomKey] === level ? current : { ...current, [zoomKey]: level })),
    [zoomKey],
  );
  const controls = { zoom, onZoomChange: setZoom, showHorizon, scale };
  const zoomText =
    mode === 'first-person'
      ? messages.scene.zoom.fieldOfView(Math.round(fovForLevel(zoom)).toLocaleString(locale))
      : visual
        ? messages.scene.zoom.level(Math.round(zoom * 100).toLocaleString(locale))
        : messages.scene.zoom.distance(formatDistanceKm(distanceForLevel(zoom), locale));
  // At visual scale sizes and distances are not drawn from Horizons, so nominal values do not show.
  const nominal = visual ? [] : bodies.placed.filter((body) => body.nominalSize || (mode === 'third-person' && body.nominalRange));
  const exaggeration = elevationExaggeration(bodies.placed.map((body) => body.elevationDeg));
  const note =
    mode === 'first-person'
      ? messages.scene.firstPersonNote
      : scale === 'visual'
        ? messages.scene.thirdPersonNote.visual(exaggeration > 1 ? String(exaggeration) : null)
        : messages.scene.thirdPersonNote.real;

  return (
    <div className="scene" data-view={mode}>
      {/*
        One canvas for both views: each view brings its own default camera.
        Renders on demand (controls invalidate on change), not every frame.
        The logarithmic depth buffer covers meters to astronomical distances.
      */}
      <Canvas frameloop="demand" dpr={[1, 1.5]} gl={{ logarithmicDepthBuffer: true }}>
        <color attach="background" args={['#000000']} />
        <StarSphere />
        {mode === 'first-person' ? (
          <FirstPersonView data={data} bodies={bodies} controls={controls} />
        ) : (
          <ThirdPersonView data={data} bodies={bodies} controls={controls} />
        )}
      </Canvas>

      <div className="scene__notes">
        <p className="scene__note">{note}</p>
        {nominal.map(({ body }) => (
          <p key={body} className="scene__note scene__note--warning">
            {messages.scene.nominal(messages.bodies[body])}
          </p>
        ))}
        {bodies.missing.map((body) => (
          <p key={body} className="scene__note scene__note--warning">
            {messages.scene.missing(messages.bodies[body])}
          </p>
        ))}
      </div>

      {mode === 'third-person' && (
        <div className="scene__overlay">
          <ScaleToggle scale={scale} onChange={setScale} />
          {visual && showHorizon && <AngleLegend bodies={bodies.placed} />}
        </div>
      )}

      <div className="scene__controls">
        <ZoomControl level={zoom} valueText={zoomText} onChange={setZoom} />
      </div>
    </div>
  );
}

/** Camera distance rounded to two significant digits, in the locale format. */
function formatDistanceKm(distanceKm: number, locale: string): string {
  return Number(distanceKm.toPrecision(2)).toLocaleString(locale);
}
