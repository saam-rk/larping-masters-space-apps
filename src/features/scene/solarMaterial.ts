/** Receiver-local finite-disk shadows. PCSS is a rendering approximation, not ray tracing.
 * One crop-wide depth map; no camera-visibility switch. See docs/LUNAR_LIGHTING_CORRECTION.md.
 */
import { DoubleSide, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, ShaderChunk, Vector3 } from 'three';
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

float lunarCompare(sampler2D map, vec2 uv, float z, vec2 size, vec2 gradient) {
  // Bilinear comparisons, not bilinear depth: continuous sub-texel transitions.
  vec2 p = uv * size - 0.5;
  vec2 f = fract(p);
  vec2 base = (floor(p) + 0.5) / size;
  vec2 t = 1.0 / size;
  float reference = z + dot(gradient, base - uv);
  float a = step(reference, texture2D(map, base).r);
  float b = step(reference + gradient.x * t.x, texture2D(map, base + vec2(t.x, 0.0)).r);
  float c = step(reference + gradient.y * t.y, texture2D(map, base + vec2(0.0, t.y)).r);
  float d = step(reference + dot(gradient, t), texture2D(map, base + t).r);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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
  float centralDepth = texture2D(map, p.xy).r;
  float blockers = centralDepth < p.z - 0.0000001 ? 1.0 : 0.0;
  float nearest = blockers * centralDepth;
  for (int i = 0; i < 16; i++) {
    float theta = float(i) * 2.39996323;
    float scale = (float(i)+0.5)/16.0;
    vec2 offset = vec2(cos(theta), sin(theta)) * scale * scale;
    float z = texture2D(map, p.xy + offset * search).r - dot(gradient, offset * search);
    if (z < p.z - 0.000001) { nearest = max(nearest, z); blockers += 1.0; }
  }
  float blocker = centralDepth < p.z - 0.0000001 ? centralDepth : (blockers > 0.0 ? nearest : p.z);
  float penumbra = tan(lunarSolarRadius) * max(0.0, p.z - blocker) * worldDepth / worldWidth;
  float margin = penumbra + 2.0 / size.x;
  if (localMap && (p.x < margin || p.x > 1.0-margin || p.y < margin || p.y > 1.0-margin)) return -1.0;
  float result = 0.0;
  vec3 directionIntegral = vec3(0.0);
  // 16 exact-area horizontal strips, four midpoint samples per exposed interval.
  // Clipping intervals continuously avoids an on/off full-intensity first contact.
  for (int row = 0; row < 16; row++) {
    float y0 = mix(low, 1.0, float(row) / 16.0);
    float y1 = mix(low, 1.0, float(row+1) / 16.0);
    float y = (y0 + y1) * 0.5;
    float width = sqrt(max(0.0, 1.0 - y*y));
    float weight = lunarSegment(y1) - lunarSegment(y0);
    float leftEnd = width;
    float rightStart = width;
    if (eclipse && abs(y-earth.y) < er) {
      float ew = sqrt(max(0.0, er*er - (y-earth.y)*(y-earth.y)));
      leftEnd = clamp(earth.x-ew, -width, width);
      rightStart = clamp(earth.x+ew, -width, width);
    }
    for (int side = 0; side < 2; side++) {
      float a = side == 0 ? -width : rightStart;
      float b = side == 0 ? leftEnd : width;
      if (b <= a) continue;
      float portion = (b-a) / (2.0*width);
      for (int column = 0; column < 4; column++) {
        float x = mix(a, b, (float(column)+0.5)/4.0);
        vec3 offset = sx*x + sy*y;
        vec3 ray = normalize(lunarSun + offset * tan(lunarSolarRadius));
        if (dot(ray, lunarReceiverNormal) <= 0.0) continue;
        vec2 uv = p.xy + vec2(dot(offset, lunarShadowX), dot(offset, lunarShadowY)) * penumbra;
        // Coverage is fitted to the complete crop; a sample beyond it is only
        // the smooth-interior assumption, never evidence of clear regional sky.
        float visible = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
          ? 1.0 : lunarCompare(map, uv, p.z + dot(gradient, uv - p.xy), size, gradient);
        float contribution = weight * portion * visible * 0.25;
        result += contribution;
        directionIntegral += ray * contribution;
      }
    }
  }
  if (result > 0.0) lunarVisibleDirection = normalize(directionIntegral);
  // Vector magnitude + mean direction preserve the sampled Lambert cosine
  // integral, including a visible upper limb while the center is back-facing.
  return mix(1.0, clamp(length(directionIntegral), 0.0, 1.0), intensity);
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

function solarUniforms(inputs: SolarUniformInputs) {
  const { sun, earth, coverage, detailCoverage = coverage, sphereCenter, sphereRadius } = inputs;
  const inverse = coverage.view.clone().invert();
  return {
    lunarSun: { value: new Vector3(...sun.direction) },
    lunarEarth: { value: new Vector3(...earth.direction) },
    lunarShadowX: { value: new Vector3().setFromMatrixColumn(inverse, 0) },
    lunarShadowY: { value: new Vector3().setFromMatrixColumn(inverse, 1) },
    lunarCenter: { value: sphereCenter },
    lunarRadius: { value: sphereRadius },
    lunarSolarRadius: { value: sun.angularDiameterDeg * Math.PI / 360 },
    lunarEarthRadius: { value: earth.angularDiameterDeg * Math.PI / 360 },
    lunarEarthInFront: { value: earth.rangeKm < sun.rangeKm ? 1 : 0 },
    lunarShadowWidth: { value: coverage.halfSize * 2 },
    lunarShadowDepth: { value: coverage.far - coverage.near },
    lunarDetailWidth: { value: detailCoverage.halfSize * 2 },
    lunarDetailDepth: { value: detailCoverage.far - detailCoverage.near },
  };
}

/** Clone materials so neither GLTF cache nor the alternative view is modified. */
export function installSolarMaterials(roots: readonly Object3D[], inputs: SolarUniformInputs | null, directOnly: boolean): () => void {
  const uniforms = inputs ? solarUniforms(inputs) : null;
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
            .replace('getDirectionalLightInfo( directionalLight, directLight );',
              'getDirectionalLightInfo( directionalLight, directLight );\n'
              + 'lunarReceiverNormal = inverseTransformDirection(geometryNormal, viewMatrix);\nlunarVisibleDirection = lunarSun;')
            .replace('vDirectionalShadowCoord[ i ] ) : 1.0;',
              'vDirectionalShadowCoord[ i ] ) : 1.0;\ndirectLight.direction = transformDirection(lunarVisibleDirection, viewMatrix);'));
      };
      copy.customProgramCacheKey = () => uniforms ? 'lunar-finite-disk-pcss-v1' : 'lunar-no-solar-data-v1';
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
