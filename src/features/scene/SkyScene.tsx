/**
 * 3D local horizon. Two views read the same Sun/Earth placement
 * (`placeBodies`, from the azimuth/elevation shown in the results panel):
 *
 * - `first-person`: eye level next to a 1.70 m astronaut on the LOLA terrain
 *   of Nobile Rim 1, Nobile Rim 2 or Shackleton Rim (only where a terrain
 *   model exists, see
 *   `terrain/models.ts`).
 * - `third-person`: Moon, Earth and Sun to scale around the tangent horizon.
 *
 * Both have a decorative 3D star background. The canvas fills whatever height
 * its box gets; notes and the zoom control are overlaid so the view keeps its
 * full height. Each view keeps its own zoom level (see `zoom.ts`), shared
 * between the slider and the camera controls. `showHorizon` comes from the
 * "Compass" switch in the box title (see `CompassToggle`) and hides the
 * horizon reference in both views.
 */

import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo, useState } from 'react';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { useI18n } from '../../i18n/context';
import { placeBodies } from './bodies';
import { FirstPersonView } from './FirstPersonView';
import { StarSphere } from './StarSphere';
import { ThirdPersonView } from './ThirdPersonView';
import type { ViewMode } from './viewMode';
import { ZoomControl } from './ZoomControl';
import { START_ZOOM, distanceForLevel, fovForLevel } from './zoom';

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
  const [zoomByMode, setZoomByMode] = useState<Record<ViewMode, number>>(START_ZOOM);
  const zoom = zoomByMode[mode];
  const setZoom = useCallback(
    (level: number) => setZoomByMode((current) => (current[mode] === level ? current : { ...current, [mode]: level })),
    [mode],
  );
  const controls = { zoom, onZoomChange: setZoom, showHorizon };
  const zoomText =
    mode === 'first-person'
      ? messages.scene.zoom.fieldOfView(Math.round(fovForLevel(zoom)).toLocaleString(locale))
      : messages.scene.zoom.distance(formatDistanceKm(distanceForLevel(zoom), locale));
  const nominal = bodies.placed.filter((body) => body.nominalSize || (mode === 'third-person' && body.nominalRange));

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
        <p className="scene__note">{mode === 'first-person' ? messages.scene.firstPersonNote : messages.scene.thirdPersonNote}</p>
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
