import { Composition } from 'remotion';
import { Presentation } from './Presentation';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './timeline';

export function RemotionRoot() {
  return (
    <Composition
      id="Presentation"
      component={Presentation}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
