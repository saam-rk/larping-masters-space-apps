/**
 * Scale of the third-person view, chosen from the "Scale" switch over the
 * view (see `ScaleToggle`):
 *
 * - `visual` (default): a schematic local sky. Directions keep the true
 *   azimuth and elevation, but the Sun and the Earth sit on a sky dome of a
 *   fixed radius around the site, enlarged, with labeled angle guides.
 * - `real`: Moon, Earth and Sun to scale in kilometers.
 *
 * Kept free of three.js imports so DOM controls can use it.
 */

export const SCENE_SCALES = ['visual', 'real'] as const;
export type SceneScale = (typeof SCENE_SCALES)[number];
export const DEFAULT_SCENE_SCALE: SceneScale = 'visual';
