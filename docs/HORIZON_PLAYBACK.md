# Horizon playback

User requests (2026-11-15): a player for the local horizon with a
user-defined time interval; the moving bodies are the Sun and Earth, observed
from the Moon. Second round (same day): interval button in the box toolbar,
player laid over the view, shared date/time wheels, 16 samples by default,
time per sample with Sun/Earth presets or a custom step, camera centered on a
body, and faster loading. Third round (same day): 24 samples by default,
half-course presets, "start at the rise of", a dotted course per body, a
two-column dialog with the Horizons details behind an "i", and centered
custom step wheels.

## Behavior

- **Interval** sits in the title rule of the local horizon box, next to
  **Guide**, **Compass**, the view switch and full screen. It opens the
  interval dialog and is filled while a sequence is loaded.
- The dialog has two columns (no scrolling on desktop; one column below
  760 px). Left: the UTC start with the same date and time wheels as the main
  form (`DateTimeWheels`), **Start at the rise of** Sun / Earth, and the number
  of samples (typed, 24 by default to mirror the hours of an Earth day,
  2–500). Right: the **time per sample** and the derived end:
  - **Sun**: the samples cover half a mean synodic month (29.530589 d / 2),
    about one lunar daytime: half the Sun's course.
  - **Earth**: the samples cover half a mean draconic month
    (27.212220 d / 2), half the libration-in-latitude cycle that raises and
    lowers the Earth over a polar horizon.
  - **Custom**: hours (0–240) and minutes wheels, centered under the presets.
  Presets are rounded to the minute. The end follows as
  start + (samples − 1) × step and must be before 2100. The details on the
  JPL Horizons queries, the month lengths and the limits are in the dialog's
  "i".
- **Start at the rise of** (`nextRise.ts`) moves the start to the first rise
  of that body after the chosen start and selects that body's preset (unless
  the step is custom), so the samples follow about half its course from the
  rise. Same definition and method as the countdown: upper limb crossing the
  reference horizon, inverse search with JPL Horizons at 1 s resolution, with
  the body's apparent radius at the chosen start (one `/api/ephemeris` query).
  When the body is up, its set is found first and the rise is searched from
  one minute after it. The wheels have minute precision, so the interval
  starts at the minute after the rise. It reports when the body never rises
  or never sets at the site. In the browser an Earthrise at Shackleton Rim
  took about 13 s (two to three serial Horizons-backed requests).
- Once loaded, the player lies over the bottom of the view (inside the box,
  also in full screen), like the zoom control: restart, play/pause, timeline,
  speed (0.5×–4×; 1× shows two samples per second), **camera** (free, Sun or
  Earth) and exit. Centering keeps the chosen body in the middle of the
  first-person view; in third person the camera turns around the site to the
  opposite azimuth, keeping its distance and height angle.
- During playback the starting camera and the first-person standing point
  stay where the last ordinary result put them instead of resetting on every
  frame.
- With **Guide** on, each body's course over the whole sequence is drawn as a
  dotted line in its color, in both views (first person: over the relief like
  the horizon line; visual scale: on each body's dome, with a vertical
  exaggeration chosen for the whole course so it stays fixed while playing;
  real scale: at each sample's range). Samples are joined by straight
  segments: positions between them are not calculated.
- The set/rise countdown stays visible during playback (see below).
- Loading reports progress, can be cancelled (also by closing the dialog) and
  stops at the first failed or incomplete frame, keeping a previous sequence.
  Changing the main site/time or updating discards the session.

## Data and method

`GET /api/ephemeris-series?site=…&start=…&step=<minutes>&count=<n>`
(`shared/ephemerisSeries.ts`, `server/ephemeris/series.ts`) returns the same
observations as `/api/ephemeris`: Horizons observer table, quantities 4, 13
and 20, airless, UT, height 0 km, DE441 and MEAN_ME as reported by Horizons.
The only change is the time selection: one START/STOP/STEP request per body
(unitless step = equal intervals, both ends included) instead of one TLIST
request per body and sample. Every row is parsed exactly like a single row and
must fall on a requested instant; otherwise that body fails (`UPSTREAM_FORMAT`)
rather than being matched by guesswork. Up to 100 samples per request; longer
intervals load in consecutive, serial chunks (JPL asks for one request at a
time).

Checked on 2026-11-15 against Horizons for Nobile Rim 1: the 12:00 row of a
6 h range request for the Sun is identical to the saved single-instant fixture
(az 83.301542°, el 2.094722°, 1941.825″, 0.98796880248943 au). In the browser,
16 samples loaded in about 0.75 s and 200 samples in about 1 s, compared with
one serial request per sample before.

Month lengths: NASA GSFC, F. Espenak, "Eclipses and the Moon's Orbit"
(https://eclipse.gsfc.nasa.gov/SEhelp/moonorbit.html). They are means; a real
month differs by hours, so the first and last frames are only approximately at
the same point of the cycle.

## Countdown during playback

The countdown reads each body's side of the horizon from the shown frame, so
after a body goes below its threshold the row switches from set (↓) to rise
(↑) and back. A search answers every later instant before its event (the
first crossing after the searched instant is also the first after any later
instant before it), so a playback needs a new inverse search only after an
event, not per frame (16 Sun-preset frames at Apollo 11 needed 4 searches).
As for single results, the threshold uses the radius at the searched instant.

## Limits

Positions between samples are not calculated: a long step can miss events and
the result is a discrete time-lapse, not a continuous prediction. Terrain
visibility, energy, communications and landing suitability are not evaluated.
The guide lines show directions, not walkable routes over the terrain.

## Review

Run `npm run check` and `npm run build`. In the browser: prepare the Sun and
Earth presets and a custom step, type a sample count, play/pause, seek, change
the camera option, exit, and change the main selection. Check the countdown
switching between set and rise, Spanish/English, a narrow layout and full
screen.
