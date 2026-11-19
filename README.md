# Kettlebell App

A Progressive Web App for kettlebell training. Install it on your phone's home screen and it works offline, with no server or account needed.

## Features

- **Workouts built around your time.** Pick 5–90 minutes. The selected time is the **total**, to the second: warm-up, work, rests, get-ready countdowns and cool-down are all included.
- **An animation for every exercise.** Each move has an animated side-view figure holding the kettlebell.
- **94 exercises.** That's 72 main exercises (swings, cleans, snatches, squats, deadlifts, lunges, presses, rows, arms, core, Turkish get-up, carries), 11 warm-up moves and 11 stretches. Each one has coaching cues and a common mistake to avoid.
- **One continuous sequence (no circuits).** You choose the total time; the app builds a run of exercises with a rest after every *N* exercises (your setting).
  - **Natural order:** a repeating pattern of squat/lunge → press → hinge → row/pullover → core, so you go from legs to upper body to hips to back to trunk, and every area rests before it's used again. Each move also starts where the last one ended (bell at the hips → chest → racked → overhead → floor).
  - **Back-friendly mode (on by default):**
    - Every exercise has a lower-back load rating.
    - High-load moves (swings, cleans, snatches, good mornings, bent-over two-hand rows, windmills…) are left out.
    - Two back-loading moves are never placed one after the other.
    - The back is strengthened with deadlifts, glute bridges, bird dogs, dead bugs and supported rows.
  - **Minimal floor work (on by default):** almost everything is done standing. At most 1–3 floor moves (about one per 15 min) are placed at the very end, so you get down once and stay down. The warm-up and cool-down use standing moves only.
  - **Gradual intensity:** controlled basics first, the more demanding moves in the middle, calmer floor/core work at the end.
  - **Repeats only where it makes sense:** fundamentals can come back (spaced out); recent exercises are avoided so workouts differ.
- **Skip swaps, it doesn't cut time.** Skip during an exercise (or its get-ready) replaces it with a similar move from the same movement group, with the same one-/two-sided structure, and the clock keeps running. Skip during a rest ends the rest.
- **Configurable timing** (Workout tab → Timing):
  - Work time
  - Get-ready countdown between exercises
  - Rest length, and rest after every *N* exercises
  - Side-switch time
  - Warm-up on/off with a duration (Auto or 2–10 min)
  - Cool-down on/off with a duration (Auto or 2–8 min)

  Changing the timing updates the current workout right away.
- **One-arm exercises are split in two:** right side, a short switch, then left side. For example, 30 s becomes 15 s + 2 s + 15 s = 32 s.
- **Interval player:**
  - English voice coach, beeps in the last 3 seconds, vibration, and a "switch sides" cue for one-sided exercises.
  - The screen stays awake.
  - **Skip** controls: skip the exercise, skip the rest, start now, +15s of rest, skip the warm-up, skip to the cool-down, finish now.
  - **Rest 30s** button: take a break in the middle of any exercise, then continue it where you left off.
- **Swap any exercise** for another one from the same category; the order is recalculated.
- **History** with total workouts, total minutes and your day streak, stored on the device.

## Shadowboxing module

A separate **Boxing** tab:

- **Format:** rounds (number of rounds, round length, rest) or one continuous session (1–90 min), plus a get-ready countdown.
- **Spoken combos in English:** e.g. *"short left, long right"*, *"long right, uppercut left"*, *"duck left, hook left"*, *"double short left, long right body"*. Default wording is **Jab / cross** (jab, cross, left/right hook, left/right uppercut, "double jab", "cross to the body"); **Short / long** is also available. Orthodox stance for now.
- **Level:** sets combo length (1–3, 2–4 or 3–6 moves), how often defense and power shots appear, and the pace. The pace can also be set by hand.
- **Natural combos:**
  - Hands mostly alternate; repeated punches become "double…".
  - A duck to one side is followed by a counter from that side; step back or pivot ends a combo.
  - Classic combinations are mixed in.
- **Ring cues:** bell at the start and end of each round, a 10-second clapper, optional short freestyle bursts and tips ("hands up", "chin down").
- **History:** sessions are saved to History.

## Recovery module

A separate **Recovery** tab for quiet, equipment-free sessions (fine for an apartment: no jumps, nothing that thuds on the floor).

- **Settings:** pick 5–60 min, a focus (Full body, Hips & legs, Back & shoulders, Wind-down), hold time (auto 45 s, 60 s for wind-down), get-ready and side-switch time, and an optional breathing opener. The session fits the chosen time exactly.
- **Flow:** gentle standing mobility (neck, shoulders, hips) and standing stretches first, then down to the floor once: all fours (cat-cow, thread the needle) → kneeling (hip flexor, lizard, pigeon) → seated (butterfly, spinal twist) → on the belly (cobra, sphinx) → on the back (figure-four, happy baby, supine twist, legs up the wall). It ends with relaxed breathing.
- **Calm voice:** "Next…", "Begin", "Switch sides", a "Breathe slowly" reminder halfway through long holds, and soft chimes instead of loud beeps.
- **History:** sessions are saved to History; moves from your last session are less likely to come up again.

## Exercise visuals

- **Real photos:** 41 exercises show photos of a real person in the start and end position, cross-fading. They come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), which is public domain (Unlicense), and are stored in `photos/`, mapped in `js/photos.js`. Only entries that clearly match the movement and equipment were used.
- **Animated figure:** every other exercise uses an animated figure with skin, shirt, pants, shoes and a face showing which way the person looks; far-side limbs are faded.
- **Switching:** Settings → Exercise visuals, or the toggle on each exercise page, switches between photos and the animation.
- **Watch real demo:** a button on every exercise page opens real demonstration videos on YouTube (needs internet).
- **Your own video or photo:** attach one to any exercise (*＋ Add my video/photo*). It is stored on the device (IndexedDB), works offline, and replaces the photo or animation in the list, the exercise page and the player.

## Voice

The coach uses **recorded voice clips** generated with the open-source **Kokoro** TTS: a male voice ("Michael", `audio/m/`, default) and a female voice ("Heart", `audio/f/`). They play like music, so you hear them **even when an iPhone is on silent**. Settings → Voice lets you pick *Female*, *Male* or *Phone*; the phone voice uses the built-in speech, which is muted on silent.

To regenerate the clips after adding exercises or phrases:

```bash
node dev/phrases.js > phrases.json
python dev/make_voice_kokoro.py kokoro-v1.0.onnx voices-v1.0.bin phrases.json audio
```

Then rebuild `js/voice-index.js` (the list of clip keys) and bump `VERSION` in `sw.js`.

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
