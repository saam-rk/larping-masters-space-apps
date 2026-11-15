import { useEffect, useLayoutEffect, useMemo } from 'react';
import { Box3, Object3D, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import type { EphemerisResponse } from '../../../shared/ephemeris';
import { LUNAR_REFERENCE_RADIUS_M, terrainObserver } from '../../../shared/observer';
import type { PlacedBodies } from './bodies';
import { shadowCoverage, solarLightingState, surfaceSnapshotReady } from './solarExposure';
import { holdShadowMaps, installSolarMaterials, requestShadowUpdate, solarUniforms, updateSolarUniforms, type SolarUniformInputs } from './solarMaterial';

export type LightingMode = 'direct' | 'illustrative';

export function SurfaceLighting({ terrain, foreground, bodies, data, mode }: {
  terrain: Object3D;
  foreground: Object3D;
  bodies: PlacedBodies;
  data: EphemerisResponse;
  mode: LightingMode;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  const state = solarLightingState(bodies.placed);
  const direction = state.sun?.direction;
  const bounds = useMemo(() => new Box3().setFromObject(terrain), [terrain]);
  const coverage = useMemo(() => shadowCoverage(bounds, new Vector3(...(direction ?? [0, 1, 0]))), [bounds, direction]);
  const detailCoverage = useMemo(() => shadowCoverage(bounds, new Vector3(...(direction ?? [0, 1, 0])), true), [bounds, direction]);
  const detailTarget = useMemo(() => new Object3D(), []);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.copy(coverage.center);
    return object;
  }, [coverage]);
  const ground = terrainObserver(data.site)?.groundElevationM ?? 0;
  const { known, sun, earth } = state;
  const inputs = useMemo<SolarUniformInputs | null>(() => known && sun && earth ? {
    sun, earth, coverage, detailCoverage,
    sphereCenter: new Vector3(0, -LUNAR_REFERENCE_RADIUS_M - ground, 0),
    // Interior below the entire known crop. Outside coverage is explicitly unknown.
    sphereRadius: LUNAR_REFERENCE_RADIUS_M + ground + Math.min(0, bounds.min.y) - 1,
  } : null, [known, sun, earth, coverage, detailCoverage, ground, bounds]);
  // The holders outlive snapshots: a new instant rewrites their values, and the
  // patched materials (and their compiled program) stay installed.
  const solar = inputs !== null;
  const uniforms = useMemo(() => solar ? solarUniforms() : null, [solar]);
  useLayoutEffect(() => {
    if (uniforms && inputs) updateSolarUniforms(uniforms, inputs);
  }, [uniforms, inputs]);
  useEffect(() => installSolarMaterials([terrain, foreground], uniforms, mode === 'direct'), [terrain, foreground, uniforms, mode]);
  // Casters only move with a new snapshot, model or mode: the two depth maps
  // are drawn on request (see requestShadowUpdate) instead of on every frame.
  useLayoutEffect(() => holdShadowMaps(gl), [gl]);
  useEffect(() => {
    requestShadowUpdate(gl);
    invalidate();
  }, [gl, invalidate, terrain, foreground, uniforms, inputs, mode]);
  const intensity = surfaceSnapshotReady(data) ? state.intensity : 0;
  return <>
    <ambientLight intensity={mode === 'illustrative' ? 0.3 : 0} />
    <primitive object={target} />
    <directionalLight position={coverage.position} target={target} intensity={intensity}
      castShadow shadow-mapSize={[coverage.mapSize, coverage.mapSize]}
      shadow-camera-left={-coverage.halfSize} shadow-camera-right={coverage.halfSize}
      shadow-camera-top={coverage.halfSize} shadow-camera-bottom={-coverage.halfSize}
      shadow-camera-near={coverage.near} shadow-camera-far={coverage.far}
      shadow-normalBias={0.03} shadow-bias={-0.0000002} />
    {/* Zero-energy light carries a second, fine receiver map; it adds no fill.
        Its depth still includes distant ridges along the entire crop. */}
    <primitive object={detailTarget} />
    <directionalLight position={detailCoverage.position} target={detailTarget} intensity={0}
      castShadow shadow-mapSize={[detailCoverage.mapSize, detailCoverage.mapSize]}
      shadow-camera-left={-detailCoverage.halfSize} shadow-camera-right={detailCoverage.halfSize}
      shadow-camera-top={detailCoverage.halfSize} shadow-camera-bottom={-detailCoverage.halfSize}
      shadow-camera-near={detailCoverage.near} shadow-camera-far={detailCoverage.far}
      shadow-normalBias={0.005} shadow-bias={-0.00000002} shadow-intensity={0} />
  </>;
}
