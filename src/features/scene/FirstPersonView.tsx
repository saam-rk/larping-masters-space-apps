/** Fixed-coordinate, 1.7 m surface observer. Terrain is embedded on the lunar sphere
 * once; no fabricated terrain continuation or camera-based solar-light gate.
 * Locator ghosts and decorative contact shadows belong only to illustrative mode.
 */
import { Html, Line, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import { AnimationMixer, GreaterDepth, Group, Mesh, SphereGeometry, Vector3, type Material, type Object3D } from 'three';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { APOLLO_11_SITE_ID } from '../../../shared/sites';
import { OBSERVER_EYE_HEIGHT_M, terrainObserver } from '../../../shared/observer';
import { useI18n } from '../../i18n/context';
import { stageApolloScene } from './apolloScene';
import { apolloScenePhase, type ApolloScenePhase } from './apolloTimeline';
import { blobShadowTexture } from './blobShadow';
import { radiusForAngularDiameter, type PlacedBodies, type SceneBody } from './bodies';
import { EyeLevelRig } from './EyeLevelRig';
import { horizontalToPosition, type Vector3Tuple } from './geometry';
import { glowTexture } from './glow';
import { SurfaceLighting, type LightingMode } from './SurfaceLighting';
import { APOLLO_11_REENACTMENT, APOLLO_11_TERRAIN } from './terrain/apollo11';
import { polarTerrainForSite } from './terrain/models';
import { curvedTerrain, disposeTerrain, surfacePoint, terrainGround } from './terrain/curvedTerrain';
import { ASTRONAUT_HEIGHT_M, type PolarTerrain } from './terrain/siteTerrain';
import { DEFAULT_FOV_DEG } from './zoom';

const BODY_DISTANCE_M = 80_000;
const HORIZON_RADIUS_M = 60_000;
const GHOST_RENDER_ORDER = 5;
const HORIZON_RENDER_ORDER = 10;
const FOREGROUND_RENDER_ORDER = 20;
const REENACTMENT_FPS = 30;
const EYE: Vector3Tuple = [0, OBSERVER_EYE_HEIGHT_M, 0];

/** Keep foreground models in front of the optional zero-elevation overlay. */
function drawAfterHorizon(root: Object3D): () => void {
  const clones: Material[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.renderOrder = FOREGROUND_RENDER_ORDER;
    object.castShadow = true;
    object.receiveShadow = true;
    const inFront = (material: Material) => {
      const copy = material.clone();
      copy.transparent = true;
      copy.depthWrite = true;
      clones.push(copy);
      return copy;
    };
    object.material = Array.isArray(object.material) ? object.material.map(inFront) : inFront(object.material);
  });
  return () => { for (const material of clones) material.dispose(); };
}

export interface FirstPersonControls {
  readonly zoom: number;
  readonly onZoomChange: (level: number) => void;
  readonly showHorizon: boolean;
  readonly animateReenactment?: boolean;
  readonly lightingMode?: LightingMode;
}

function Terrain({ data, bodies, controls, model }: {
  data: EphemerisResponse; bodies: PlacedBodies; controls: FirstPersonControls; model: PolarTerrain;
}) {
  const { messages, locale } = useI18n();
  const terrainGltf = useGLTF(model.terrainUrl, false, false);
  const astronautGltf = useGLTF(model.astronautUrl, false, false);
  const height = terrainObserver(data.site)?.groundElevationM;
  const site = useMemo(() => ({ latitudeDeg: data.site.latitudeDeg, longitudeEastDeg: data.site.longitudeEastDeg }),
    [data.site.latitudeDeg, data.site.longitudeEastDeg]);
  const terrain = useMemo(() => height === undefined ? null : curvedTerrain(terrainGltf.scene, model, site, height),
    [terrainGltf.scene, model, site, height]);
  const figure = useMemo(() => {
    const clone = astronautGltf.scene.clone();
    for (const root of clone.children) { root.position.set(0, 0, 0); root.quaternion.identity(); }
    const dispose = drawAfterHorizon(clone);
    return { clone, dispose };
  }, [astronautGltf.scene]);
  const position = useMemo(() => {
    if (!terrain || height === undefined) return null;
    const point = surfacePoint(model, site, new Vector3(...model.astronautGlbPosition), height);
    const y = terrainGround(terrain, point.x, point.z);
    return y === null ? null : new Vector3(point.x, y, point.z);
  }, [terrain, height, model, site]);
  useEffect(() => () => { if (terrain) disposeTerrain(terrain); }, [terrain]);
  useEffect(() => () => figure.dispose(), [figure]);
  const foreground = useRef<Group>(null);
  const mode = controls.lightingMode ?? 'direct';
  const heading = bodies.placed.find((body) => body.body === 'sun')?.azimuthDeg ?? 0;
  if (!terrain || !position) return <Html center className="scene__label">{messages.scene.terrainMissing}</Html>;
  const yaw = Math.atan2(-position.x, -position.z);
  return <>
    <primitive object={terrain} />
    {mode === 'illustrative' && <mesh position={[position.x, position.y + 0.03, position.z]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[0.6, 48]} />
      <meshBasicMaterial map={blobShadowTexture()} transparent depthWrite={false} toneMapped={false} />
    </mesh>}
    <group ref={foreground} position={position} rotation-y={yaw}>
      <primitive object={figure.clone} />
      <Html position={[0, ASTRONAUT_HEIGHT_M + 0.35, 0]} center className="scene__label scene__label--small">
        {`${ASTRONAUT_HEIGHT_M.toLocaleString(locale, { minimumFractionDigits: 2 })} m`}
      </Html>
    </group>
    <EyeLevelRig eye={EYE} initialHeadingDeg={heading} initialPitchDeg={-8} zoom={controls.zoom} onZoomChange={controls.onZoomChange} />
    <SurfaceLighting terrain={terrain} foreground={figure.clone} bodies={bodies} data={data} mode={mode} />
    <Sky bodies={bodies} showHorizon={controls.showHorizon} occluder={foreground} mode={mode} />
  </>;
}

function ApolloTerrain({ data, bodies, controls, phase }: {
  data: EphemerisResponse; bodies: PlacedBodies; controls: FirstPersonControls; phase: ApolloScenePhase;
}) {
  const { messages } = useI18n();
  const { heading, pitch, url } = APOLLO_11_REENACTMENT;
  const terrainGltf = useGLTF(APOLLO_11_TERRAIN.terrainUrl, false, false);
  const propsGltf = useGLTF(url, false, false);
  const height = terrainObserver(data.site)?.groundElevationM;
  const site = useMemo(() => ({ latitudeDeg: data.site.latitudeDeg, longitudeEastDeg: data.site.longitudeEastDeg }),
    [data.site.latitudeDeg, data.site.longitudeEastDeg]);
  const terrain = useMemo(() => height === undefined ? null : curvedTerrain(terrainGltf.scene, APOLLO_11_TERRAIN, site, height), [terrainGltf.scene, site, height]);
  const { props, stage, disposeForeground } = useMemo(() => {
    const clone = propsGltf.scene.clone();
    const stage = stageApolloScene(clone, propsGltf.animations);
    const disposeForeground = drawAfterHorizon(clone);
    return { props: clone, stage, disposeForeground };
  }, [propsGltf.scene, propsGltf.animations]);
  useEffect(() => () => { stage.dispose(); disposeForeground(); }, [stage, disposeForeground]);
  useEffect(() => () => { if (terrain) disposeTerrain(terrain); }, [terrain]);
  const clips = stage.clips(phase);
  const moving = controls.animateReenactment && clips.length > 0;
  const mixer = useMemo(() => new AnimationMixer(props), [props]);
  const occluder = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    mixer.stopAllAction();
    stage.apply(phase);
    for (const clip of clips) mixer.clipAction(clip).play();
    mixer.setTime(0);
    invalidate();
    return () => { mixer.stopAllAction(); };
  }, [mixer, stage, phase, clips, invalidate]);
  useEffect(() => {
    if (!controls.animateReenactment) mixer.setTime(0);
    invalidate();
  }, [controls.animateReenactment, mixer, invalidate]);
  useEffect(() => {
    if (!moving) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      mixer.update(Math.min((now - last) / 1000, 1 / 15));
      last = now;
      invalidate();
    }, 1000 / REENACTMENT_FPS);
    return () => window.clearInterval(timer);
  }, [moving, mixer, invalidate]);
  const mode = controls.lightingMode ?? 'direct';
  if (!terrain) return <Html center className="scene__label">{messages.scene.terrainMissing}</Html>;
  return <>
    <primitive object={terrain} />
    <group ref={occluder}><primitive object={props} /></group>
    <EyeLevelRig eye={EYE} initialHeadingDeg={heading} initialPitchDeg={pitch} zoom={controls.zoom} onZoomChange={controls.onZoomChange} />
    <SurfaceLighting terrain={terrain} foreground={props} bodies={bodies} data={data} mode={mode} />
    <Sky bodies={bodies} showHorizon={controls.showHorizon} occluder={occluder} mode={mode} />
  </>;
}

/** Reference overlays never participate in shadows or visibility calculations. */
function Sky({ bodies, showHorizon, occluder, mode }: {
  bodies: PlacedBodies; showHorizon: boolean; occluder: RefObject<Object3D | null>; mode: LightingMode;
}) {
  const { messages } = useI18n();
  const ring = useMemo(() => Array.from({ length: 181 }, (_, i) => horizontalToPosition(i * 2, 0, HORIZON_RADIUS_M * 0.98)), []);
  const ticks = useMemo(() => Array.from({ length: 36 }, (_, i) => [
    horizontalToPosition(i * 10, 0, HORIZON_RADIUS_M * 0.98),
    horizontalToPosition(i * 10, i % 9 === 0 ? 1.2 : 0.5, HORIZON_RADIUS_M * 0.98),
  ]), []);
  const compass = [
    { label: messages.compass.north, az: 0 }, { label: messages.compass.east, az: 90 },
    { label: messages.compass.south, az: 180 }, { label: messages.compass.west, az: 270 },
  ];
  return <group position={EYE}>
    {showHorizon && <>
      <Line points={ring} color="#39ff88" lineWidth={1.2} transparent opacity={0.7} depthTest={false} renderOrder={HORIZON_RENDER_ORDER} />
      {ticks.map((points, i) => <Line key={i} points={points} color="#39ff88" lineWidth={1} transparent opacity={0.5} depthTest={false} renderOrder={HORIZON_RENDER_ORDER} />)}
      {compass.map(({ label, az }) => <Html key={label} position={horizontalToPosition(az, 1.6, HORIZON_RADIUS_M * 0.98)} center
        occlude={[occluder as RefObject<Object3D>]} className="scene__compass">{label}</Html>)}
    </>}
    {bodies.placed.map((body) => <FarBody key={body.body} body={body} label={messages.bodies[body.body]} ghosts={mode === 'illustrative'} />)}
  </group>;
}

function FarBody({ body, label, ghosts }: { body: SceneBody; label: string; ghosts: boolean }) {
  const position = horizontalToPosition(body.azimuthDeg, body.elevationDeg, BODY_DISTANCE_M);
  const radius = radiusForAngularDiameter(body.angularDiameterDeg, BODY_DISTANCE_M);
  const isSun = body.body === 'sun';
  const geometry = useMemo(() => new SphereGeometry(radius, 32, 16), [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={position}>
    <mesh geometry={geometry}>
      <meshBasicMaterial color={isSun ? '#fff6d8' : '#3d7fd6'} toneMapped={false} />
    </mesh>
    {ghosts && <mesh geometry={geometry} renderOrder={GHOST_RENDER_ORDER}>
      <meshBasicMaterial color={isSun ? '#ffd970' : '#5a9cf0'} transparent opacity={0.35} depthWrite={false} depthFunc={GreaterDepth} toneMapped={false} />
    </mesh>}
    {isSun && ghosts && <sprite scale={[0.09, 0.09, 1]}>
      <spriteMaterial map={glowTexture()} color="#ffd970" sizeAttenuation={false} transparent depthWrite={false} toneMapped={false} />
    </sprite>}
    <Html center className="scene__label" style={{ transform: 'translateY(-1.8rem)' }}>{label}</Html>
  </group>;
}

function TerrainLoading() {
  const { messages } = useI18n();
  const parent = useThree((state) => state.gl.domElement.parentElement);
  const portal = useMemo(() => (parent ? { current: parent } : undefined), [parent]);
  if (!portal) return null;
  return <Html portal={portal} center className="scene__label">{messages.scene.terrainLoading}</Html>;
}

export function FirstPersonView({ data, bodies, controls }: {
  data: EphemerisResponse; bodies: PlacedBodies; controls: FirstPersonControls;
}) {
  const { messages } = useI18n();
  const apollo = data.site.id === APOLLO_11_SITE_ID;
  const model = polarTerrainForSite(data.site.id);
  return <>
    <PerspectiveCamera makeDefault fov={DEFAULT_FOV_DEG} near={0.05} far={400_000} />
    <Suspense fallback={<TerrainLoading />}>
      {apollo ? <ApolloTerrain data={data} bodies={bodies} controls={controls} phase={apolloScenePhase(data.requestedUtc)} /> : model ?
        <Terrain key={model.siteId} data={data} bodies={bodies} controls={controls} model={model} /> :
        <Html center className="scene__label">{messages.scene.terrainMissing}</Html>}
    </Suspense>
  </>;
}
