# Presentation video

A 30-second presentation of the CLPS Lunar Mission Browser, built with
[Remotion](https://www.remotion.dev/) from footage of the real app. It has
captions and subtle sound effects but no music; the voice-over is added in
post-production.

Output: `out/clps-presentation.mp4`, 1920 × 1080, 30 fps, 29.8 s, H.264 + AAC.

## Flow shown

1. Landing window: full effects and English, then save.
2. Default Apollo 11 scene.
3. Amundsen Rim from the point list, LIVE, Update view (hyperspace jump while
   the relief loads).
4. Data panel (zoomed in).
5. Third person: visual scale, Guide and Compass on, short camera drag.
6. Interval: start at the Sun's rise (the ~40 s Horizons search is cut and
   flagged on screen as shortened), then Prepare interval.
7. Full screen, first person facing the astronaut, speed 4×, play: the Sun
   crosses behind the astronaut and the lighting and shadows follow it.
8. Advanced mode: inverse search, feasibility and scenario comparison.
9. Outro with the app's landing logo (imported from `../src/features/shell/LandingLogo.tsx`).

## How it is made

| Step | Script | Output (git-ignored) |
| --- | --- | --- |
| Record the app in Microsoft Edge with Playwright, using the Chrome DevTools Protocol screencast. Pointer samples, clicks and named marks are logged. | `capture/record.mjs` | `capture/raw/` (frames + `session.json`, ~2 GB) |
| Encode the frames at a constant 30 fps with Remotion's bundled ffmpeg; export marks, pointer and clicks. | `capture/encode.mjs` | `public/footage/app.mp4`, `src/capture.json` (committed) |
| Synthesise the sound effects (deterministic, no samples). | `sfx/generate.mjs` | `public/sfx/*.wav` (committed) |
| Edit and render. | `src/` | `out/clps-presentation.mp4` |

The edit (`src/timeline.ts`) is a list of slices of the recording with a speed
each; camera zooms, captions and sound cues are placed in source seconds, so
they stay in sync with the footage after the speed changes.

The app draws its interface through a CRT barrel filter and remaps the pointer
to where controls are drawn. The recorder clicks at the drawn position by
inverting the same formula as `src/features/backdrop/curvature.ts`; if that
constant or formula changes, update `record.mjs`.

## Regenerate

From the repository root, start the app (`npm run dev`). Then, in `video/`:

```bash
npm install
node capture/record.mjs http://localhost:5173/
node capture/encode.mjs
node sfx/generate.mjs
npm run render
```

`npm run studio` opens the Remotion editor for previews. A new recording
changes the marks: review the slice boundaries in `src/timeline.ts` (they are
in source seconds) before rendering. Ephemeris data are live JPL Horizons
results at recording time, so the dates and values in the footage depend on
when it was recorded (this cut: 2026-11-15, sunrise found for 2026-12-09).

## Notes

- Fonts: VT323 and Iosevka (SIL Open Font License), copied from `@fontsource`.
- Remotion has its own license: free for individuals and companies with up to
  three employees; larger organizations need a company license.
- The shadow and lighting in the first-person view are the app's illustrative
  rendering of the Sun's direction, not a radiometric simulation.
