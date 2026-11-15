/**
 * US flag of the Apollo 11 surface reenactment (`apollo-11.reenactment.glb`,
 * built by `tools/lunar-terrain/build_apollo_reenactment.py`). When it is shown
 * is decided by `apolloScene.ts`.
 *
 * Canton repair: the exported blue canton is a single strip of quads between
 * its top and bottom edges, while the 50 star polygons follow the curved cloth
 * surface 2 mm in front of it. Between the edges the flat strip sits up to
 * several millimetres in front of the stars, so most of them are buried and
 * the field shows broken white fragments. At load time the stars and the old
 * strip are replaced by a finely tessellated canton that follows the same
 * cloth surface, with the 50 stars painted on its texture.
 *
 * Star layout from Executive Order 10834 (1959), the standard 50-star flag:
 * nine rows, alternately six and five stars, centers on a grid of twelfths of
 * the canton width and tenths of its height; star diameter 0.0616 of the hoist
 * for a canton 0.5385 of the hoist tall. The model keeps its own 3-by-5-foot
 * proportions (canton 0.4 of the fly), so the stars are laid out on its canton.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PropertyBinding,
  SRGBColorSpace,
  type Object3D,
} from 'three';

/** Cloth dimensions of the builder script, metres in the flag's local frame. */
const FLAG_HEIGHT_M = 0.9144;
const FLAG_WIDTH_M = 1.524;
const FLAG_TOP_M = 2.19;
export const CANTON_WIDTH_M = FLAG_WIDTH_M * 0.4;
export const CANTON_HEIGHT_M = (FLAG_HEIGHT_M * 7) / 13;

/**
 * Cloth surface of the builder (`fabric`), in the flag's glTF frame: `u` along
 * the crossbar from the staff, `v` down from the top edge.
 */
export function clothPoint(u: number, v: number): [number, number, number] {
  const wave = 0.045 * Math.sin(14 * u + 2 * v) * Math.pow(v / 0.92, 0.62);
  return [u, FLAG_TOP_M - v, -wave];
}

/** Star diameter as a fraction of the canton height (Executive Order 10834: 0.0616 / 0.5385). */
export const STAR_DIAMETER_PER_CANTON_HEIGHT = 0.0616 / 0.5385;

/** Star centers as fractions of the canton: `x` from the staff, `y` from the top. */
export function flagStarCenters(): { x: number; y: number }[] {
  const centers: { x: number; y: number }[] = [];
  for (let row = 0; row < 9; row += 1) {
    const long = row % 2 === 0;
    for (let column = 0; column < (long ? 6 : 5); column += 1) {
      centers.push({ x: (2 * column + (long ? 1 : 2)) / 12, y: (row + 1) / 10 });
    }
  }
  return centers;
}

const U_SEGMENTS = 48;
const V_SEGMENTS = 24;
const TEXTURE_WIDTH = 1024;
/** Inner to outer radius of a regular five-pointed star. */
const STAR_INNER_RATIO = (3 - Math.sqrt(5)) / 2;

function cantonGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= V_SEGMENTS; j += 1) {
    for (let i = 0; i <= U_SEGMENTS; i += 1) {
      const s = i / U_SEGMENTS;
      const t = j / V_SEGMENTS;
      positions.push(...clothPoint(s * CANTON_WIDTH_M, t * CANTON_HEIGHT_M));
      uvs.push(s, 1 - t);
    }
  }
  const row = U_SEGMENTS + 1;
  for (let j = 0; j < V_SEGMENTS; j += 1) {
    for (let i = 0; i < U_SEGMENTS; i += 1) {
      const a = j * row + i;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function cantonTexture(blue: Color, white: Color): CanvasTexture {
  const width = TEXTURE_WIDTH;
  const height = Math.round((width * CANTON_HEIGHT_M) / CANTON_WIDTH_M);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = blue.getStyle();
    context.fillRect(0, 0, width, height);
    context.fillStyle = white.getStyle();
    const outer = (STAR_DIAMETER_PER_CANTON_HEIGHT * height) / 2;
    for (const { x, y } of flagStarCenters()) {
      context.beginPath();
      for (let k = 0; k < 10; k += 1) {
        // One point straight up, then alternating inner and outer vertices.
        const angle = -Math.PI / 2 + (k * Math.PI) / 5;
        const radius = k % 2 === 0 ? outer : outer * STAR_INNER_RATIO;
        context.lineTo(x * width + radius * Math.cos(angle), y * height + radius * Math.sin(angle));
      }
      context.closePath();
      context.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Objects whose name starts with `name`; glTF loading turns spaces in node names into underscores. */
function findByName(root: Object3D, name: string): Object3D[] {
  const found: Object3D[] = [];
  root.traverse((object) => {
    if (object.name.startsWith(PropertyBinding.sanitizeNodeName(name))) found.push(object);
  });
  return found;
}

export interface ApolloFlag {
  /** The flag assembly (staff, crossbar and cloth), or null when the model has none. */
  readonly node: Object3D | null;
  readonly dispose: () => void;
}

/**
 * Finds the flag in a clone of the reenactment props and repairs its canton
 * in place (the cached GLB is untouched: geometry and material are replaced on
 * the clone's mesh). Without a 2D canvas the canton stays plain blue.
 */
export function prepareApolloFlag(props: Object3D): ApolloFlag {
  const node = findByName(props, 'US flag | Lunar Flag Assembly')[0] ?? null;
  const canton = findByName(props, 'Blue canton').find((object): object is Mesh => object instanceof Mesh);
  const stars = findByName(props, '50 embroidered stars');
  if (!node || !canton || !(canton.material instanceof MeshStandardMaterial)) {
    return { node, dispose: () => {} };
  }
  const starMaterial = stars.find((object): object is Mesh => object instanceof Mesh)?.material;
  const white = starMaterial instanceof MeshStandardMaterial ? starMaterial.color : new Color(0.92, 0.9, 0.84);

  const geometry = cantonGeometry();
  const texture = cantonTexture(canton.material.color, white);
  const material = canton.material.clone();
  material.color = new Color('#ffffff');
  material.map = texture;
  material.side = DoubleSide;
  canton.geometry = geometry;
  canton.material = material;
  for (const star of stars) star.visible = false;

  return {
    node,
    dispose: () => {
      geometry.dispose();
      texture.dispose();
      material.dispose();
    },
  };
}
