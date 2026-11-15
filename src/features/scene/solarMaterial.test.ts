import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { installSolarMaterials } from './solarMaterial';

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
