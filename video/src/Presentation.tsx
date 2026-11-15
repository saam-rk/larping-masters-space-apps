/**
 * 30-second presentation of the CLPS Lunar Mission Browser: real app footage
 * (see capture/), light captions, subtle synthesised sound effects and a short
 * logo outro. No music; the voice-over is added in post-production.
 */

import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { Footage } from './Footage';
import { Outro } from './Outro';
import { Overlay } from './Overlay';
import { CUES, FOOTAGE_FRAMES, OUTRO_FRAMES, outputFrame } from './timeline';
import { COLORS } from './theme';

export function Presentation() {
  const cues = CUES.flatMap((cue) => {
    const at = outputFrame(cue.t);
    return at === null ? [] : [{ ...cue, at: Math.round(at) }];
  });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence durationInFrames={FOOTAGE_FRAMES}>
        <Footage />
        <Overlay />
      </Sequence>
      <Sequence from={FOOTAGE_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Sequence>

      {cues.map((cue, i) => (
        <Sequence key={i} from={cue.at} durationInFrames={45} layout="none">
          <Audio src={staticFile(`sfx/${cue.sound}.wav`)} volume={cue.volume} />
        </Sequence>
      ))}
      <Sequence from={FOOTAGE_FRAMES - 10} durationInFrames={OUTRO_FRAMES + 10} layout="none">
        <Audio src={staticFile('sfx/swell.wav')} volume={0.3} />
      </Sequence>
    </AbsoluteFill>
  );
}
