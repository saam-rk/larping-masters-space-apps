/** Receiver-local finite-disk shadows. PCSS is a rendering approximation, not ray tracing.
 * One crop-wide depth map; no camera-visibility switch. See docs/LUNAR_LIGHTING_CORRECTION.md.
 *
 * Frame cost: the 64 disk samples are compared against the depth map only where the
 * filter footprint is mixed. Receivers facing away from the whole disk, footprints
 * inside one texel cell and footprints that nine probes find uniformly clear or
 * blocked skip those comparisons. Snapshots rewrite uniform values in place, so a new
 * instant never recompiles the program, and the depth maps are redrawn on request.
 */
import { DoubleSide, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, ShaderChunk, Vector3, type WebGLRenderer } from 'three';
import type { SceneBody } from './bodies';
import type { shadowCoverage } from './solarExposure';

export interface SolarUniformInputs {
  sun: SceneBody;
  earth: SceneBody;
  coverage: ReturnType<typeof shadowCoverage>;
  detailCoverage?: ReturnType<typeof shadowCoverage>;
  /** Center and conservative inner radius of the assumed smooth lunar interior. */
  sphereCenter: Vector3;
  sphereRadius: number;
}

const solarShader = /* glsl */ `
varying vec3 vLunarPosition;
uniform vec3 lunarSun;
uniform vec3 lunarEarth;
uniform vec3 lunarShadowX;
uniform vec3 lunarShadowY;
uniform vec3 lunarCenter;
uniform float lunarRadius;
uniform float lunarSolarRadius;
uniform float lunarCompleteDisk;
uniform float lunarEarthRadius;
uniform float lunarEarthInFront;
uniform float lunarShadowWidth;
uniform float lunarShadowDepth;
uniform float lunarDetailWidth;
uniform float lunarDetailDepth;
vec3 lunarReceiverNormal;
vec3 lunarVisibleDirection;

float lunarSegment(float q) {
  q = clamp(q, -1.0, 1.0);
  return (acos(-q) + q * sqrt(max(0.0, 1.0-q*q))) / PI;
}

float lunarDepth(sampler2D map, vec2 uv) {
  // Explicit level: no screen-space derivatives, so the early exits stay real branches.
  return textureLod(map, uv, 0.0).r;
}

float lunarCompare(sampler2D map, vec2 uv, float z, vec2 size, vec2 gradient) {
  // Bilinear comparisons, not bilinear depth: continuous sub-texel transitions.
  vec2 p = uv * size - 0.5;
  vec2 f = fract(p);
  vec2 base = (floor(p) + 0.5) / size;
  vec2 t = 1.0 / size;
  float reference = z + dot(gradient, base - uv);
  float a = step(reference, lunarDepth(map, base));
  float b = step(reference + gradient.x * t.x, lunarDepth(map, base + vec2(t.x, 0.0)));
  float c = step(reference + gradient.y * t.y, lunarDepth(map, base + vec2(0.0, t.y)));
  float d = step(reference + dot(gradient, t), lunarDepth(map, base + t));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float lunarVisible(sampler2D map, vec2 uv, vec3 p, vec2 size, vec2 gradient) {
  // Coverage is fitted to the complete crop; a sample beyond it is only
  // the smooth-interior assumption, never evidence of clear regional sky.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 1.0;
  return lunarCompare(map, uv, p.z + dot(gradient, uv - p.xy), size, gradient);
}

// Disk strip above the clipped horizon: midpoint height, half width, exact area.
vec3 lunarStrip(float low, int row) {
  float y0 = mix(low, 1.0, float(row) / 16.0);
  float y1 = mix(low, 1.0, float(row+1) / 16.0);
  float y = (y0 + y1) * 0.5;
  return vec3(y, sqrt(max(0.0, 1.0 - y*y)), lunarSegment(y1) - lunarSegment(y0));
}

// End of the left and start of the right exposed interval of a strip.
// Clipping intervals continuously avoids an on/off full-intensity first contact.
vec2 lunarExposed(vec3 strip, vec2 earth, float er, bool eclipse) {
  if (eclipse && abs(strip.x-earth.y) < er) {
    float ew = sqrt(max(0.0, er*er - (strip.x-earth.y)*(strip.x-earth.y)));
    return vec2(clamp(earth.x-ew, -strip.y, strip.y), clamp(earth.x+ew, -strip.y, strip.y));
  }
  return vec2(strip.y);
}

// 16 exact-area horizontal strips, four midpoint samples per exposed interval,
// evaluated four columns at a time. shared >= 0 is one visibility for the whole
// footprint; otherwise each sample is compared against the depth map.
vec3 lunarSampledDisk(sampler2D map, vec2 size, vec3 p, vec2 gradient, float penumbra, float low,
    vec3 sx, vec3 sy, vec2 earth, float er, bool eclipse, float shared) {
  float spread = tan(lunarSolarRadius);
  // Disk axes in map coordinates, and the facing of a ray as a function of its disk position.
  vec2 ux = vec2(dot(sx, lunarShadowX), dot(sx, lunarShadowY)) * penumbra;
  vec2 uy = vec2(dot(sy, lunarShadowX), dot(sy, lunarShadowY)) * penumbra;
  vec3 facing = vec3(dot(lunarSun, lunarReceiverNormal), dot(sx, lunarReceiverNormal) * spread, dot(sy, lunarReceiverNormal) * spread);
  vec3 sums = vec3(0.0);
  for (int row = 0; row < 16; row++) {
    vec3 strip = lunarStrip(low, row);
    vec2 exposed = lunarExposed(strip, earth, er, eclipse);
    for (int side = 0; side < 2; side++) {
      float a = side == 0 ? -strip.y : exposed.y;
      float b = side == 0 ? exposed.x : strip.y;
      if (b <= a) continue;
      vec4 xs = mix(vec4(a), vec4(b), vec4(0.125, 0.375, 0.625, 0.875));
      // sx, sy and lunarSun are orthonormal: |lunarSun + offset * spread|^2 = 1 + |offset|^2 * spread^2.
      vec4 inverseLength = inversesqrt(1.0 + (xs*xs + strip.x*strip.x) * spread*spread);
      vec4 visible = vec4(shared);
      if (shared < 0.0) {
        vec2 origin = p.xy + uy * strip.x;
        visible = vec4(lunarVisible(map, origin + ux * xs.x, p, size, gradient), lunarVisible(map, origin + ux * xs.y, p, size, gradient),
          lunarVisible(map, origin + ux * xs.z, p, size, gradient), lunarVisible(map, origin + ux * xs.w, p, size, gradient));
      }
      // Rays behind the receiver contribute nothing.
      vec4 weights = vec4(greaterThan(facing.x + facing.y * xs + facing.z * strip.x, vec4(0.0)))
        * visible * inverseLength * (strip.z * (b-a) / (2.0*strip.y) * 0.25);
      float total = dot(weights, vec4(1.0));
      sums += vec3(total, dot(weights, xs), total * strip.x);
    }
  }
  return lunarSun * sums.x + (sx * sums.y + sy * sums.z) * spread;
}

// The same strips, midpoints and weights for a receiver that faces the whole disk
// with one shared visibility: no comparison or facing test is left per sample, so
// the four columns of an interval reduce to one vector operation. A complete disk
// needs no loop at all: its sum is lunarSun * lunarCompleteDisk (see completeDiskIntegral).
vec3 lunarClearDisk(float low, vec3 sx, vec3 sy, vec2 earth, float er, bool eclipse) {
  float spread = tan(lunarSolarRadius);
  vec3 integral = vec3(0.0);
  for (int row = 0; row < 16; row++) {
    vec3 strip = lunarStrip(low, row);
    vec2 exposed = lunarExposed(strip, earth, er, eclipse);
    for (int side = 0; side < 2; side++) {
      float a = side == 0 ? -strip.y : exposed.y;
      float b = side == 0 ? exposed.x : strip.y;
      if (b <= a) continue;
      vec4 xs = mix(vec4(a), vec4(b), vec4(0.125, 0.375, 0.625, 0.875));
      // sx, sy and lunarSun are orthonormal: |lunarSun + offset * spread|^2 = 1 + |offset|^2 * spread^2.
      vec4 inverseLength = inversesqrt(1.0 + (xs*xs + strip.x*strip.x) * spread*spread);
      float columns = dot(inverseLength, vec4(1.0));
      integral += (strip.z * (b-a) / (2.0*strip.y) * 0.25)
        * ((lunarSun + sy * (strip.x*spread)) * columns + sx * (spread * dot(xs, inverseLength)));
    }
  }
  return integral;
}

float lunarDiskShadow(sampler2D map, vec2 size, float intensity, float bias, vec4 coord, float worldWidth, float worldDepth, bool localMap) {
  vec3 p = coord.xyz / coord.w;
  p.z += bias;
  // Receiver-plane depth correction prevents the filter from mistaking a
  // sun-facing slope's neighboring texels for a blocking ridge.
  vec3 dx = dFdx(p);
  vec3 dy = dFdy(p);
  float determinant = dx.x * dy.y - dx.y * dy.x;
  vec2 gradient = abs(determinant) > 1e-20
    ? vec2(dx.z * dy.y - dy.z * dx.y, dx.x * dy.z - dy.x * dx.z) / determinant
    : vec2(0.0);
  vec3 radial = vLunarPosition - lunarCenter;
  float distanceToCenter = length(radial);
  vec3 up = radial / distanceToCenter;
  // Conservative smooth interior, not fabricated regional terrain.
  float depression = acos(clamp(lunarRadius / distanceToCenter, 0.0, 1.0));
  float elevation = asin(clamp(dot(up, lunarSun), -1.0, 1.0));
  float low = clamp((-depression - elevation) / lunarSolarRadius, -1.0, 1.0);
  if (low >= 1.0) return 0.0;
  // Every ray of the disk is behind this receiver: the integral below is exactly zero.
  float facing = dot(lunarSun, lunarReceiverNormal);
  if (facing <= -sin(lunarSolarRadius)) return mix(1.0, 0.0, intensity);
  vec3 sx = cross(lunarSun, up);
  if (length(sx) < 0.00001) sx = lunarShadowX;
  sx = normalize(sx);
  vec3 sy = normalize(cross(sx, lunarSun));
  vec2 earth = vec2(atan(dot(lunarEarth, sx), dot(lunarEarth, lunarSun)), atan(dot(lunarEarth, sy), dot(lunarEarth, lunarSun))) / lunarSolarRadius;
  float er = lunarEarthRadius / lunarSolarRadius;
  bool eclipse = lunarEarthInFront > 0.5 && length(earth) < er + 1.0;
  // PCSS blocker search over the maximum source cone in this orthographic volume.
  float search = tan(lunarSolarRadius) * p.z * worldDepth / worldWidth;
  search = min(search, 0.45);
  float centralDepth = lunarDepth(map, p.xy);
  float blockers = centralDepth < p.z - 0.0000001 ? 1.0 : 0.0;
  float nearest = blockers * centralDepth;
  for (int i = 0; i < 16; i++) {
    float theta = float(i) * 2.39996323;
    float scale = (float(i)+0.5)/16.0;
    vec2 offset = vec2(cos(theta), sin(theta)) * scale * scale;
    float z = lunarDepth(map, p.xy + offset * search) - dot(gradient, offset * search);
    if (z < p.z - 0.000001) { nearest = max(nearest, z); blockers += 1.0; }
  }
  float blocker = centralDepth < p.z - 0.0000001 ? centralDepth : (blockers > 0.0 ? nearest : p.z);
  float penumbra = tan(lunarSolarRadius) * max(0.0, p.z - blocker) * worldDepth / worldWidth;
  float margin = penumbra + 2.0 / size.x;
  if (localMap && (p.x < margin || p.x > 1.0-margin || p.y < margin || p.y > 1.0-margin)) return -1.0;
  // Classify the filter footprint before integrating: shared is its single
  // visibility where it is uniform and -1 where it is mixed. Without a blocker
  // every sample is the center point, so its comparison is the exact value.
  bool frontal = facing >= sin(lunarSolarRadius);
  bool complete = low <= -1.0 && !eclipse;
  float shared = lunarVisible(map, p.xy, p, size, gradient);
  if (penumbra > 0.0) {
    // The comparison is bilinear inside a texel cell and the complete disk is
    // sampled symmetrically, so a footprint within one cell averages to its
    // center value (the 16x4 quadrature differs by under 0.5%). The mean
    // direction stays at the disk center: under a quarter of the solar radius off.
    vec2 cell = fract(p.xy * size - 0.5);
    float inset = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
    bool oneCell = frontal && complete && inset >= penumbra * max(size.x, size.y)
      && all(greaterThanEqual(p.xy, vec2(penumbra))) && all(lessThanEqual(p.xy, vec2(1.0 - penumbra)));
    if (!oneCell) {
      // Center and eight rim probes. A straight shadow edge that avoids all of
      // them cuts off less than 1.2% of the disk.
      float lowest = shared;
      float highest = shared;
      for (int i = 0; i < 8; i++) {
        float theta = float(i) * 0.78539816;
        float probe = lunarVisible(map, p.xy + vec2(cos(theta), sin(theta)) * penumbra, p, size, gradient);
        lowest = min(lowest, probe);
        highest = max(highest, probe);
      }
      if (lowest < 1.0 && highest > 0.0) shared = -1.0;
    }
  }
  if (shared == 0.0) return mix(1.0, 0.0, intensity);
  vec3 integral;
  if (shared >= 0.0 && frontal && complete) {
    integral = lunarSun * (shared * lunarCompleteDisk);
  } else if (shared >= 0.0 && frontal) {
    integral = shared * lunarClearDisk(low, sx, sy, earth, er, eclipse);
  } else {
    integral = lunarSampledDisk(map, size, p, gradient, penumbra, low, sx, sy, earth, er, eclipse, shared);
  }
  // Vector magnitude + mean direction preserve the sampled Lambert cosine
  // integral, including a visible upper limb while the center is back-facing.
  float exposure = length(integral);
  if (exposure > 0.0) lunarVisibleDirection = integral / exposure;
  return mix(1.0, clamp(exposure, 0.0, 1.0), intensity);
}

float getShadow(sampler2D map, vec2 size, float intensity, float bias, float unusedRadius, vec4 coord) {
  if (intensity <= 0.0) return 1.0;
  #if NUM_DIR_LIGHT_SHADOWS > 1
    vec4 detail = vDirectionalShadowCoord[1];
    vec3 p = detail.xyz / detail.w;
    if (p.x > 0.05 && p.x < 0.95 && p.y > 0.05 && p.y < 0.95 && p.z > 0.0 && p.z < 1.0) {
      float localResult = lunarDiskShadow(directionalShadowMap[1], directionalLightShadows[1].shadowMapSize,
        intensity, directionalLightShadows[1].shadowBias, detail, lunarDetailWidth, lunarDetailDepth, true);
      if (localResult >= 0.0) return localResult;
    }
  #endif
  return lunarDiskShadow(map, size, intensity, bias, coord, lunarShadowWidth, lunarShadowDepth, false);
}
`;

/** The shader's 16x4 midpoint quadrature over an unclipped, unoccluded disk.
 * Its lateral terms cancel by symmetry, so the sum is this factor along the Sun direction.
 */
export function completeDiskIntegral(solarRadiusRad: number): number {
  const segment = (q: number) => (Math.acos(-q) + q * Math.sqrt(Math.max(0, 1 - q * q))) / Math.PI;
  const spread = Math.tan(solarRadiusRad);
  let sum = 0;
  for (let row = 0; row < 16; row++) {
    const y0 = -1 + row / 8;
    const y1 = -1 + (row + 1) / 8;
    const y = (y0 + y1) / 2;
    for (const column of [0.125, 0.375, 0.625, 0.875]) {
      const x = (2 * column - 1) * Math.sqrt(Math.max(0, 1 - y * y));
      sum += (segment(y1) - segment(y0)) * 0.25 / Math.sqrt(1 + (x * x + y * y) * spread * spread);
    }
  }
  return sum;
}

export type SolarUniforms = ReturnType<typeof emptyUniforms>;

const emptyUniforms = () => ({
  lunarSun: { value: new Vector3(0, 1, 0) },
  lunarEarth: { value: new Vector3(0, -1, 0) },
  lunarShadowX: { value: new Vector3(1, 0, 0) },
  lunarShadowY: { value: new Vector3(0, 0, 1) },
  lunarCenter: { value: new Vector3() },
  lunarRadius: { value: 0 },
  lunarSolarRadius: { value: 0 },
  lunarCompleteDisk: { value: 1 },
  lunarEarthRadius: { value: 0 },
  lunarEarthInFront: { value: 0 },
  lunarShadowWidth: { value: 1 },
  lunarShadowDepth: { value: 1 },
  lunarDetailWidth: { value: 1 },
  lunarDetailDepth: { value: 1 },
});

/** Rewrites the shared uniform values in place: a new snapshot costs no program compilation. */
export function updateSolarUniforms(uniforms: SolarUniforms, inputs: SolarUniformInputs): void {
  const { sun, earth, coverage, detailCoverage = coverage, sphereCenter, sphereRadius } = inputs;
  const inverse = coverage.view.clone().invert();
  uniforms.lunarSun.value.set(...sun.direction);
  uniforms.lunarEarth.value.set(...earth.direction);
  uniforms.lunarShadowX.value.setFromMatrixColumn(inverse, 0);
  uniforms.lunarShadowY.value.setFromMatrixColumn(inverse, 1);
  uniforms.lunarCenter.value.copy(sphereCenter);
  uniforms.lunarRadius.value = sphereRadius;
  uniforms.lunarSolarRadius.value = sun.angularDiameterDeg * Math.PI / 360;
  uniforms.lunarCompleteDisk.value = completeDiskIntegral(uniforms.lunarSolarRadius.value);
  uniforms.lunarEarthRadius.value = earth.angularDiameterDeg * Math.PI / 360;
  uniforms.lunarEarthInFront.value = earth.rangeKm < sun.rangeKm ? 1 : 0;
  uniforms.lunarShadowWidth.value = coverage.halfSize * 2;
  uniforms.lunarShadowDepth.value = coverage.far - coverage.near;
  uniforms.lunarDetailWidth.value = detailCoverage.halfSize * 2;
  uniforms.lunarDetailDepth.value = detailCoverage.far - detailCoverage.near;
}

/** Uniform holders shared by every patched material of a scene. */
export function solarUniforms(inputs?: SolarUniformInputs): SolarUniforms {
  const uniforms = emptyUniforms();
  if (inputs) updateSolarUniforms(uniforms, inputs);
  return uniforms;
}

/** Stops the per-frame depth-map redraw; the returned cleanup restores it. */
export function holdShadowMaps(renderer: WebGLRenderer): () => void {
  const automatic = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  return () => {
    renderer.shadowMap.autoUpdate = automatic;
    renderer.shadowMap.needsUpdate = true;
  };
}

/** Redraws the held depth maps on the next frame: call after any caster or the Sun moves. */
export function requestShadowUpdate(renderer: WebGLRenderer): void {
  renderer.shadowMap.needsUpdate = true;
}

/** Clone materials so neither GLTF cache nor the alternative view is modified. */
export function installSolarMaterials(roots: readonly Object3D[], uniforms: SolarUniforms | null, directOnly: boolean): () => void {
  const restore: (() => void)[] = [];
  for (const root of roots) root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const original = object.material;
    const patch = (material: Material) => {
      const copy = directOnly && material instanceof MeshBasicMaterial
        ? new MeshStandardMaterial({ color: material.color, map: material.map, opacity: material.opacity,
          transparent: material.transparent, side: material.side, alphaTest: material.alphaTest,
          depthTest: material.depthTest, depthWrite: material.depthWrite, roughness: 1 })
        : material.clone();
      copy.shadowSide = DoubleSide;
      // Emission in illustrative materials must not survive the direct-only mode.
      if (directOnly && 'emissiveIntensity' in copy) copy.emissiveIntensity = 0;
      copy.onBeforeCompile = (shader) => {
        if (!uniforms) return;
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLunarPosition;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvLunarPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',
          ShaderChunk.shadowmap_pars_fragment.replaceAll('float getShadow(', 'float originalShadow(') + '\n#ifdef USE_SHADOWMAP\n' + solarShader + '\n#endif\n');
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>',
          ShaderChunk.lights_fragment_begin
            // Only the first directional light is the Sun; the second one just carries the local map.
            .replace('UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS', 'UNROLLED_LOOP_INDEX == 0')
            .replace('getDirectionalLightInfo( directionalLight, directLight );',
              'getDirectionalLightInfo( directionalLight, directLight );\n'
              // A zero-energy source (unknown inputs, total eclipse, map carrier) integrates nothing.
              + 'directLight.visible = directLight.color != vec3(0.0);\n'
              + 'lunarReceiverNormal = inverseTransformDirection(geometryNormal, viewMatrix);\nlunarVisibleDirection = lunarSun;')
            .replace('vDirectionalShadowCoord[ i ] ) : 1.0;',
              'vDirectionalShadowCoord[ i ] ) : 1.0;\ndirectLight.direction = transformDirection(lunarVisibleDirection, viewMatrix);'));
      };
      copy.customProgramCacheKey = () => uniforms ? 'lunar-finite-disk-pcss-v2' : 'lunar-no-solar-data-v1';
      return copy;
    };
    const copies = Array.isArray(original) ? original.map(patch) : patch(original);
    object.material = copies;
    restore.push(() => {
      object.material = original;
      for (const material of Array.isArray(copies) ? copies : [copies]) material.dispose();
    });
  });
  return () => { for (const cleanup of restore) cleanup(); };
}
