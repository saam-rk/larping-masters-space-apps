import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3, type WebGLRenderer } from 'three';
import type { SceneBody } from './bodies';
import { horizontalToDirection } from './geometry';
import { shadowCoverage } from './solarExposure';
import { completeDiskIntegral, holdShadowMaps, installSolarMaterials, requestShadowUpdate, solarUniforms, updateSolarUniforms } from './solarMaterial';

function body(name: SceneBody['body'], azimuthDeg: number, elevationDeg: number, angularDiameterDeg: number, rangeKm: number): SceneBody {
  return { body: name, azimuthDeg, elevationDeg, direction: horizontalToDirection(azimuthDeg, elevationDeg), angularDiameterDeg, rangeKm, nominalSize: false, nominalRange: false };
}

function inputs(sunAzimuthDeg: number) {
  const sun = body('sun', sunAzimuthDeg, 5, 0.54, 149_000_000);
  const bounds = new Box3(new Vector3(-50, -5, -50), new Vector3(50, 5, 50));
  const direction = new Vector3(...sun.direction);
  return { sun, earth: body('earth', 200, 20, 1.8, 400_000), coverage: shadowCoverage(bounds, direction),
    detailCoverage: shadowCoverage(bounds, direction, true), sphereCenter: new Vector3(0, -1_737_400, 0), sphereRadius: 1_737_390 };
}

describe('direct-only material policy', () => {
  it('removes emission and unlit surface materials even when solar data are absent', () => {
    const emissive = new MeshStandardMaterial({ emissive: 'white', emissiveIntensity: 0.7 });
    const basic = new MeshBasicMaterial({ color: 'white' });
    const root = new Group();
    const a = new Mesh(new BoxGeometry(), emissive);
    const b = new Mesh(new BoxGeometry(), basic);
    root.add(a, b);
    const cleanup = installSolarMaterials([root], null, true);
    expect(a.material.emissiveIntensity).toBe(0);
    expect(b.material).toBeInstanceOf(MeshStandardMaterial);
    expect(emissive.emissiveIntensity).toBe(0.7);
    cleanup();
    expect(a.material).toBe(emissive);
    expect(b.material).toBe(basic);
  });
  it('keeps illustrative emission isolated from cached source materials', () => {
    const source = new MeshStandardMaterial({ emissiveIntensity: 0.6 });
    const mesh = new Mesh(new BoxGeometry(), source);
    const cleanup = installSolarMaterials([mesh], null, false);
    expect(mesh.material).not.toBe(source);
    expect(mesh.material.emissiveIntensity).toBe(0.6);
    cleanup();
    expect(mesh.material).toBe(source);
  });
});

describe('frame cost', () => {
  it('reproduces the shader quadrature of a complete disk', () => {
    // Area weights sum to one; each ray lies at most one solar radius from the center.
    const radius = 0.27 * Math.PI / 180;
    const integral = completeDiskIntegral(radius);
    expect(integral).toBeLessThan(1);
    expect(integral).toBeGreaterThan(Math.cos(radius));
    expect(completeDiskIntegral(1e-9)).toBeCloseTo(1, 12);
  });
  it('rewrites a new snapshot in place without reinstalling materials', () => {
    const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
    const uniforms = solarUniforms(inputs(30));
    const cleanup = installSolarMaterials([mesh], uniforms, true);
    const installed = mesh.material;
    const holder = uniforms.lunarSun;
    const before = holder.value.clone();
    updateSolarUniforms(uniforms, inputs(120));
    expect(mesh.material).toBe(installed);
    expect(uniforms.lunarSun).toBe(holder);
    expect(holder.value.equals(before)).toBe(false);
    expect(holder.value.toArray()).toEqual(horizontalToDirection(120, 5));
    expect(uniforms.lunarCompleteDisk.value).toBe(completeDiskIntegral(0.27 * Math.PI / 180));
    cleanup();
  });
  it('holds the depth maps until a caster or the Sun moves', () => {
    const renderer = { shadowMap: { autoUpdate: true, needsUpdate: false } } as WebGLRenderer;
    const release = holdShadowMaps(renderer);
    expect(renderer.shadowMap).toMatchObject({ autoUpdate: false, needsUpdate: true });
    renderer.shadowMap.needsUpdate = false;
    requestShadowUpdate(renderer);
    expect(renderer.shadowMap).toMatchObject({ autoUpdate: false, needsUpdate: true });
    release();
    expect(renderer.shadowMap.autoUpdate).toBe(true);
  });
});
