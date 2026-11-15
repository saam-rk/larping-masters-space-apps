/**
 * 3D local horizon. Two views read the same Sun/Earth placement
 * (`placeBodies`, from the azimuth/elevation shown in the results panel):
 *
 * - `first-person`: the Apollo 11 surface reenactment, or eye level next to a
 *   1.70 m astronaut on the LOLA terrain of Nobile Rim 1, Nobile Rim 2,
 *   Shackleton Rim, Amundsen Rim, Haworth, Shoemaker Rim A or Faustini Rim A
 *   (only where a terrain model exists, see `terrain/models.ts`).
 * - `third-person`: at visual scale (default), a schematic sky dome with the
 *   true directions and labeled azimuth/elevation guides; at real scale,
 *   Moon, Earth and Sun to scale around the tangent horizon (see
 *   `sceneScale.ts`). The "Scale" switch over the view picks one.
 *
 * Both have a decorative 3D star background. The canvas fills whatever height
 * its box gets; notes and the zoom control are overlaid so the view keeps its
 * full height. Each view keeps its own zoom level (see `zoom.ts`), shared
 * between the slider and the camera controls (the two third-person scales
 * keep separate levels, since their distances differ). The top-right corner
 * shows the time left until the Sun and the Earth set or rise after the
 * shown instant (see `HorizonCountdown`), also while an interval plays.
 * `showHorizon` comes from the "Compass" switch in the box title (see
 * `CompassToggle`) and hides the horizon reference in both views;
 * `showGuides` comes from the "Guide" switch (see `GuideToggle`) and hides
 * the straight paths toward the Sun and the Earth.
 *
 * During playback the starting camera (and the first-person standing point)
 * stays where the last ordinary result put it (`anchor`), instead of
 * resetting on every frame; `follow` keeps the camera centered on one body;
 * with the guides on, `course` (every frame of the sequence) is drawn as a
 * dotted line per body. At visual scale the vertical exaggeration then also
 * accounts for the whole course, so it does not change between frames.
 */

import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo, useState } from 'react';
import type { BodyId } from '../../../shared/ephemeris';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { APOLLO_11_SITE_ID } from '../../../shared/sites';
import { useI18n } from '../../i18n/context';
import { AngleLegend } from './AngleLegend';
import { elevationExaggeration } from './angles';
import { bodyCourses, placeBodies } from './bodies';
import { FirstPersonView } from './FirstPersonView';
import { HorizonCountdown } from './HorizonCountdown';
import { ScaleToggle } from './ScaleToggle';
import { DEFAULT_SCENE_SCALE, type SceneScale } from './sceneScale';
import { StarSphere } from './StarSphere';
import { APOLLO_11_REENACTMENT } from './terrain/apollo11';
import { terrainForSite } from './terrain/models';
import { ThirdPersonView } from './ThirdPersonView';
import type { ViewMode } from './viewMode';
import { ZoomControl } from './ZoomControl';
import { START_VISUAL_ZOOM, START_ZOOM, distanceForLevel, fovForLevel, levelForFov } from './zoom';

/** Zoom kept per view, and per scale in third person. */
type ZoomKey = 'first-person' | 'apollo-11' | 'third-person-real' | 'third-person-visual';
const START_ZOOM_BY_KEY: Readonly<Record<ZoomKey, number>> = {
  'first-person': START_ZOOM['first-person'],
  'apollo-11': levelForFov(APOLLO_11_REENACTMENT.fov),
  'third-person-real': START_ZOOM['third-person'],
  'third-person-visual': START_VISUAL_ZOOM,
};

/** Size of the site's relief crop, e.g. `10 × 10` (the view only offers first person where a model exists). */
function cropSizeText(siteId: EphemerisResponse['site']['id'], locale: string): string {
  const [eastWestKm, northSouthKm] = terrainForSite(siteId)?.cropSizeKm ?? [10, 10];
  return `${eastWestKm.toLocaleString(locale)} × ${northSouthKm.toLocaleString(locale)}`;
}

export default function SkyScene({
  data,
  mode,
  showHorizon,
  animateReenactment = false,
  busy = false,
  playback = false,
  showGuides = true,
  follow = null,
  course = null,
}: {
  data: EphemerisResponse;
  mode: ViewMode;
  /** Horizon line (first person) and grid (third person). */
  showHorizon: boolean;
  animateReenactment?: boolean;
  /** A new result is being queried: the set/rise countdown waits (see `HorizonCountdown`). */
  busy?: boolean;
  playback?: boolean;
  /** Straight paths toward the Sun and the Earth (both views). */
  showGuides?: boolean;
  /** Body the camera stays centered on (playback only), or null. */
  follow?: BodyId | null;
  /** Every frame of the playback sequence (each body's course), or null. */
  course?: readonly EphemerisResponse[] | null;
}) {
  const { messages, locale } = useI18n();
  const bodies = useMemo(() => placeBodies(data), [data]);
  // Starting camera: from the shown result, held while an interval is prepared or played.
  const [anchor, setAnchor] = useState(bodies);
  if (!playback && anchor !== bodies) setAnchor(bodies);
  const [scale, setScale] = useState<SceneScale>(DEFAULT_SCENE_SCALE);
  const visual = mode === 'third-person' && scale === 'visual';
  const apollo = mode === 'first-person' && data.site.id === APOLLO_11_SITE_ID;
  const zoomKey: ZoomKey = apollo ? 'apollo-11' : mode === 'first-person' ? 'first-person' : `third-person-${scale}`;
  const [zoomByKey, setZoomByKey] = useState<Record<ZoomKey, number>>(START_ZOOM_BY_KEY);
  const zoom = zoomByKey[zoomKey];
  const setZoom = useCallback(
    (level: number) => setZoomByKey((current) => (current[zoomKey] === level ? current : { ...current, [zoomKey]: level })),
    [zoomKey],
  );
  const courses = useMemo(() => (course ? bodyCourses(course) : null), [course]);
  const courseElevations = useMemo(
    () => (courses ? [...courses.sun, ...courses.earth].map((body) => body.elevationDeg) : []),
    [courses],
  );
  const exaggeration = elevationExaggeration([...bodies.placed.map((body) => body.elevationDeg), ...courseElevations]);
  const followed = follow ? (bodies.placed.find((body) => body.body === follow) ?? null) : null;
  const controls = {
    zoom, onZoomChange: setZoom, showHorizon, showGuides, scale, animateReenactment, anchor, follow: followed,
    courses: showGuides ? courses : null, exaggeration,
  };
  const zoomText =
    mode === 'first-person'
      ? apollo
        ? messages.scene.zoom.level(Math.round(zoom * 100).toLocaleString(locale))
        : messages.scene.zoom.fieldOfView(Math.round(fovForLevel(zoom)).toLocaleString(locale))
      : visual
        ? messages.scene.zoom.level(Math.round(zoom * 100).toLocaleString(locale))
        : messages.scene.zoom.distance(formatDistanceKm(distanceForLevel(zoom), locale));
  // At visual scale sizes and distances are not drawn from Horizons, so nominal values do not show.
  const nominal = visual ? [] : bodies.placed.filter((body) => body.nominalSize || (mode === 'third-person' && body.nominalRange));
  const note =
    mode === 'first-person'
      ? apollo ? messages.scene.apolloReenactmentNote : messages.scene.firstPersonNote(cropSizeText(data.site.id, locale))
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
      <Canvas frameloop="demand" dpr={[1, 1.5]} shadows={apollo ? 'percentage' : false} gl={{ logarithmicDepthBuffer: true }}>
        <color attach="background" args={['#000000']} />
        {!apollo && <StarSphere />}
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

      <HorizonCountdown data={data} bodies={bodies} paused={busy} />

      {mode === 'third-person' && (
        <div className="scene__overlay">
          <ScaleToggle scale={scale} onChange={setScale} />
          {visual && showGuides && <AngleLegend bodies={bodies.placed} exaggeration={exaggeration} />}
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
