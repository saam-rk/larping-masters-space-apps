# Horizon playback

User request (2026-11-15): add a player centered on the lower edge of the local
horizon, with a user-defined time interval. The user explicitly clarified that
the moving bodies are the Sun and Earth, observed from the Moon.

## Behavior

- Open **Interval**, set start/end in UTC, choose 25, 61 or 121 samples, and
  prepare the sequence. Both endpoints are included. Inputs use the existing
  application range, 1969 inclusive through 2099 inclusive.
- Preparation reports progress and can be cancelled, including by closing the
  dialog. Loading is serial and stops at the first failed or incomplete frame.
  A previous successful sequence remains available on failure.
- Play/pause, restart, seek with pointer or keyboard, and choose 0.5×–4× speed.
  At 1×, two samples are shown per wall-clock second. Playback stops at the end;
  pressing play again restarts. Hiding the browser tab pauses playback.
- The scene and results use the same frame, labeled **PLAYBACK**, with its UTC
  instant and original source metadata. Exit restores the ordinary result.
  Changing the main site/time or updating cancels the previous player session.
  The main configuration remains the selection to return to after playback.
- The player is inside the horizon box, including full screen. The event
  countdown is hidden while preparing or showing playback, preventing an
  inverse-search request for every sample. Ordinary duplicate-update behavior
  from D-020 remains unchanged.

## Data and limits

Uses the existing `/api/ephemeris` endpoint and its unmodified Sun/Earth
observations, sizes, distances, presence markers, frame, units and provenance.
There is no new scientific formula or interpolated position. Intermediate
instants between samples are not calculated; a long interval with few samples
can miss events and is a discrete time-lapse, not a continuous prediction.
Whole-second rounding can vary adjacent step lengths by one second. Very short
intervals reduce the sample count to avoid duplicated instants.

Up to 121 sequential endpoint calls are made per preparation (each endpoint
may query both bodies). Preparation depends on Horizons availability and can
take time. Playback and seeking use memory only. Partial responses and saved
samples cannot masquerade as a prepared live sequence. Terrain visibility,
energy, communications and landing suitability are not evaluated.

## Review

Run `npm run check` and `npm run build`. In the browser, prepare a one-day
interval, play/pause, seek to the endpoint, replay, exit, and change the main
selection. Check Spanish/English, narrow layout, and horizon full screen.
Review the diff with the integrator before committing or publishing.
