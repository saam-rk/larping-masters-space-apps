/**
 * Stages the Apollo 11 reenactment props (`apollo-11.reenactment.glb`) for a
 * phase of `apolloTimeline.ts`: which of Eagle, the three figures and the
 * flag are shown, the pose of the figure that plants the flag, and which
 * animation tracks play.
 *
 * Before the flag is erected the planting figure stands still in the rest
 * pose of the project's astronaut (arms down) and its flag-pushing tracks are
 * left out; the other figures keep their animation. After the liftoff only the
 * flag remains, at rest. Works on a clone of the cached GLB scene.
 */

import { AnimationClip, PropertyBinding, Quaternion, Vector3, type Object3D } from 'three';
import { prepareApolloFlag } from './apolloFlag';
import type { ApolloScenePhase } from './apolloTimeline';

const EAGLE = 'Eagle | Lunar Module LM-5';
const PLANTER = 'Astronaut | planting the flag';
const FIGURES = ['Astronaut | lunar hop', PLANTER, 'Astronaut | waiting at the hatch'] as const;
const FLAG = 'US flag | Lunar Flag Assembly';

/**
 * Rest pose of the arms of the project's astronaut, local to the figure root
 * (`public/models/nobile-rim-2/astronaut.glb`; the figure waiting at the
 * hatch keeps the same left arm). Position in metres, quaternion as x, y, z, w.
 */
const ARM_REST: Readonly<Record<string, { position: [number, number, number]; quaternion: [number, number, number, number] }>> = {
  arm_L: { position: [-0.33, 1.135, 0.005], quaternion: [0.7283886671066284, -0.09638451039791107, 0.6702144145965576, 0.10475073754787445] },
  arm_R: { position: [0.33, 1.135, 0.005], quaternion: [0.7283886671066284, 0.09638451039791107, -0.6702144145965576, 0.10475073754787445] },
  glove_L: { position: [-0.39, 0.92, 0.01], quaternion: [0, 0, 0, 1] },
  glove_R: { position: [0.39, 0.92, 0.01], quaternion: [0, 0, 0, 1] },
};

/** Name of an authored node once loaded: glTF loading turns spaces into underscores. */
const loaded = (name: string) => PropertyBinding.sanitizeNodeName(name);

function findNamed(root: Object3D, name: string): Object3D | null {
  return root.getObjectByName(loaded(name)) ?? null;
}

interface Pose {
  readonly part?: string;
  readonly object: Object3D;
  readonly position: Vector3;
  readonly quaternion: Quaternion;
}

function poseOf(object: Object3D): Pose {
  return { object, position: object.position.clone(), quaternion: object.quaternion.clone() };
}

function setPose(object: Object3D, position: Vector3, quaternion: Quaternion) {
  object.position.copy(position);
  object.quaternion.copy(quaternion);
}

/** True for tracks that move the planting figure or the flag. */
function plantingTrack(trackName: string): boolean {
  const node = PropertyBinding.parseTrackName(trackName).nodeName ?? '';
  return node.startsWith(loaded(PLANTER)) || node.startsWith(loaded(FLAG));
}

export interface ApolloStage {
  /** Visibility and poses for `phase`; call after stopping the previous animation. */
  readonly apply: (phase: ApolloScenePhase) => void;
  /** Clips to play in `phase` (none when nothing moves). */
  readonly clips: (phase: ApolloScenePhase) => readonly AnimationClip[];
  readonly dispose: () => void;
}

export function stageApolloScene(props: Object3D, animations: readonly AnimationClip[]): ApolloStage {
  const flag = prepareApolloFlag(props);
  const eagle = findNamed(props, EAGLE);
  const figures = FIGURES.map((name) => findNamed(props, name)).filter((object) => object !== null);
  const flagRest = flag.node ? poseOf(flag.node) : null;
  const planterArms = Object.keys(ARM_REST).flatMap((part) => {
    const object = findNamed(props, `${PLANTER} | ${part}`);
    return object ? [{ ...poseOf(object), part }] : [];
  });
  const withoutPlanting = animations.map(
    (clip) => new AnimationClip(clip.name, clip.duration, clip.tracks.filter((track) => !plantingTrack(track.name))),
  );

  return {
    apply(phase) {
      const crew = phase === 'landed' || phase === 'flag-up';
      if (eagle) eagle.visible = crew;
      for (const figure of figures) figure.visible = crew;
      if (flag.node) flag.node.visible = phase === 'flag-up' || phase === 'departed';
      if (flagRest) setPose(flagRest.object, flagRest.position, flagRest.quaternion);
      for (const arm of planterArms) {
        const rest = arm.part ? ARM_REST[arm.part] : undefined;
        if (phase === 'landed' && rest) {
          setPose(arm.object, new Vector3(...rest.position), new Quaternion(...rest.quaternion));
        } else {
          setPose(arm.object, arm.position, arm.quaternion);
        }
      }
    },
    clips(phase) {
      if (phase === 'flag-up') return animations;
      if (phase === 'landed') return withoutPlanting;
      return [];
    },
    dispose: flag.dispose,
  };
}
