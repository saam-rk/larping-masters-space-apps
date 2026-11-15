import { AnimationClip, Group, Object3D, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { APOLLO_11_FLAG_UTC, APOLLO_11_LANDING_UTC, APOLLO_11_LIFTOFF_UTC } from '../../../shared/time';
import { stageApolloScene } from './apolloScene';
import { apolloScenePhase } from './apolloTimeline';

describe('apolloScenePhase', () => {
  it('follows touchdown, flag and liftoff', () => {
    expect(apolloScenePhase('1969-07-20T20:17:39Z')).toBe('before-landing');
    expect(apolloScenePhase(APOLLO_11_LANDING_UTC)).toBe('landed');
    expect(apolloScenePhase('1969-07-21T03:41:42Z')).toBe('landed');
    expect(apolloScenePhase(APOLLO_11_FLAG_UTC)).toBe('flag-up');
    expect(apolloScenePhase('1969-07-21T17:53:59Z')).toBe('flag-up');
    expect(apolloScenePhase(APOLLO_11_LIFTOFF_UTC)).toBe('departed');
    expect(apolloScenePhase('2026-11-15T12:00:00Z')).toBe('departed');
  });
});

/** Same node layout as the GLB once loaded (spaces become underscores). */
function props() {
  const root = new Group();
  const named = (name: string, parent: Object3D = root) => {
    const object = new Object3D();
    object.name = name.replace(/ /g, '_');
    parent.add(object);
    return object;
  };
  const eagle = named('Eagle | Lunar Module LM-5');
  const hop = named('Astronaut | lunar hop');
  const planter = named('Astronaut | planting the flag');
  const hatch = named('Astronaut | waiting at the hatch');
  const flag = named('US flag | Lunar Flag Assembly');
  const arm = named('Astronaut | planting the flag | arm_R', planter);
  arm.position.set(0.23, 1.35, 0.22);
  flag.position.set(-3.35, -0.16, 5.45);
  const track = (node: string) => new VectorKeyframeTrack(`${node.replace(/ /g, '_')}.position`, [0, 1], [0, 0, 0, 0, 1, 0]);
  const clip = new AnimationClip('Surface activity', 1, [
    track('Astronaut | lunar hop'),
    track('Astronaut | planting the flag | arm_R'),
    track('US flag | Lunar Flag Assembly'),
  ]);
  return { root, eagle, crew: [hop, planter, hatch], flag, arm, clip };
}

describe('stageApolloScene', () => {
  it('shows nothing before the touchdown and only the flag after the liftoff', () => {
    const { root, eagle, crew, flag, clip } = props();
    const stage = stageApolloScene(root, [clip]);
    stage.apply('before-landing');
    expect([eagle, ...crew, flag].map((object) => object.visible)).toEqual([false, false, false, false, false]);
    expect(stage.clips('before-landing')).toEqual([]);
    stage.apply('departed');
    expect([eagle, ...crew, flag].map((object) => object.visible)).toEqual([false, false, false, false, true]);
    expect(stage.clips('departed')).toEqual([]);
  });

  it('keeps the planting figure still, arms down, until the flag is up', () => {
    const { root, eagle, crew, flag, arm, clip } = props();
    const stage = stageApolloScene(root, [clip]);
    stage.apply('landed');
    expect([eagle, ...crew, flag].map((object) => object.visible)).toEqual([true, true, true, true, false]);
    expect(arm.position.toArray()).toEqual([0.33, 1.135, 0.005]);
    const [landed] = stage.clips('landed');
    expect(landed!.tracks.map((track) => track.name)).toEqual(['Astronaut_|_lunar_hop.position']);

    stage.apply('flag-up');
    expect(flag.visible).toBe(true);
    expect(arm.position.toArray()).toEqual([0.23, 1.35, 0.22]);
    expect(stage.clips('flag-up')).toEqual([clip]);
  });
});
