# Kettlebell App

A Progressive Web App for kettlebell training. Install it on your phone's home screen and it works offline, with no server or account needed.

## Features

- **Workouts built around your time.** Pick 5–90 minutes. The selected time is the **total**, to the second: warm-up, work, rests, get-ready countdowns and cool-down are all included.
- **An animation for every exercise.** Each move has an animated side-view figure holding the kettlebell.
- **94 exercises.** That's 72 main exercises (swings, cleans, snatches, squats, deadlifts, lunges, presses, rows, arms, core, Turkish get-up, carries), 11 warm-up moves and 11 stretches. Each one has coaching cues and a common mistake to avoid.
- **A logical full-body flow.** Each circuit covers the basic movement patterns (hinge, squat, push, pull, lunge, core, total body), then the order is optimised so that:
  - explosive and technical lifts come first, while you're fresh;
  - lower and upper body alternate, so the same muscle group is never hit twice in a row;
  - core and floor work are grouped at the end, so you're not constantly getting up and down.
- **Configurable timing** (Workout tab → Timing):
  - Work time
  - Rest between exercises
  - Rest after every *N* exercises (1 = after each, 2 = supersets, …)
  - Get-ready countdown before each exercise
  - Rest between rounds and between blocks
  - Warm-up on/off with a duration (Auto or 2–10 min)
  - Cool-down on/off with a duration (Auto or 2–8 min)
- **Interval player:**
  - English voice coach, beeps in the last 3 seconds, vibration, and a "switch sides" cue for one-sided exercises.
  - The screen stays awake.
  - **Skip** controls: skip the exercise, skip the rest, start now, +15s of rest, skip the warm-up, skip to the cool-down, finish now.
- **Swap any exercise** for another one from the same category; the order is recalculated.
- **History** with total workouts, total minutes and your day streak, stored on the device.

## Hosting

The app is a static site: plain HTML, CSS and JS, with no build step.

- **Render:** New → Static Site → this repo, branch `main`, Build Command empty, Publish Directory `.`
- **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / `(root)`

Open the URL on your phone, then:

- **Android (Chrome):** ⋮ → *Install app*
- **iPhone (Safari):** Share → *Add to Home Screen*

## Run locally

```bash
python3 -m http.server 8000
```

## Structure

| File | Purpose |
| --- | --- |
| `js/exercises.js` | Exercise database (category, region, muscles, level, cues) |
| `js/generator.js` | Time budget, exercise selection, flow ordering, exact-time interval timeline |
| `js/figure.js` | SVG stick-figure animation engine (forward and inverse kinematics) |
| `js/anims.js` | Keyframes for each movement pattern |
| `js/app.js` | UI: generator, timing panel, player, library, history, settings |
| `sw.js` | Offline service worker (bump `VERSION` whenever files change) |
| `dev/` | Dev tools: animation grid, generator test, icon builder, UI walkthrough |
