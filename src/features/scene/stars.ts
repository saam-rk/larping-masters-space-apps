/**
 * Decorative star directions for the 3D background. Deterministic (seeded)
 * so the sky does not change between renders. Not a star catalog: positions
 * and brightness are illustrative and do not match the real sky.
 */

export interface StarBuffers {
  /** xyz of unit vectors, uniformly distributed on the sphere. */
  readonly positions: Float32Array;
  /** rgb per star, already scaled by brightness. */
  readonly colors: Float32Array;
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 1],
  [0.8, 0.88, 1],
  [1, 0.93, 0.8],
  [0.85, 1, 0.9],
];

export function createStars(count: number, seed = 20261114): StarBuffers {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // Uniform on the sphere: z uniform in [-1, 1], longitude uniform.
    const z = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    positions.set([r * Math.cos(theta), z, r * Math.sin(theta)], i * 3);
    // Many faint stars, few bright ones.
    const brightness = 0.25 + 0.75 * random() ** 3;
    const tint = TINTS[Math.floor(random() * TINTS.length)] ?? TINTS[0]!;
    colors.set([tint[0] * brightness, tint[1] * brightness, tint[2] * brightness], i * 3);
  }
  return { positions, colors };
}
