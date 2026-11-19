// Builds the list of phrases the app speaks, so they can be pre-recorded as audio clips.
// Usage: node dev/phrases.js > phrases.json
global.window = global;
require('../js/exercises.js');

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const out = new Map();
// add(display text, spoken text, style) – style '!' makes it an energetic call
const add = (text, speak) => { const k = norm(text); if (k && !out.has(k)) out.set(k, { key: k, speak: speak || text }); };

// ---- Kettlebell ----
for (const e of EXERCISES) add(e.name, e.name.replace(/\(.*?\)/g, '').replace('+', 'and').replace('&', 'and').trim() + '.');
[
  'Get ready.', 'First up:', 'Next:', 'Next up:', 'Grab your kettlebell.', 'Great work.', 'Cool-down:', 'Rest.', 'Go!',
  'Right hand first.', 'Right leg first.', 'Right side first.', 'Alternate sides.',
  'Switch hands.', 'Switch legs.', 'Switch sides.', 'Right hand.', 'Left hand.', 'Right leg.', 'Left leg.', 'Right side.', 'Left side.',
  'Take thirty seconds.', 'Back to it.', 'Workout complete.', 'Great job!', 'Paused.', "Let's go!",
  'Begin.', 'Breathe slowly.', 'Relax.', 'Recovery complete.', 'Well done.', 'Heart rate high.', 'Slow down and breathe.',
].forEach((t) => add(t));
for (let n = 1; n <= 10; n++) add(String(n), NUM[n] + '.');

// ---- Boxing ----
const classic = ['jab', 'cross', 'left hook', 'right hook', 'left uppercut', 'right uppercut'];
for (const s of classic) { add(s, s + '!'); add(s + ' to the body', s + ' to the body!'); }
add('double jab', 'double jab!'); add('double jab to the body', 'double jab to the body!');
for (const t of ['short', 'long', 'hook', 'uppercut']) for (const side of ['left', 'right']) {
  const b = `${t} ${side}`;
  add(b, b + '!'); add(b + ' body', b + ' body!'); add('double ' + b, 'double ' + b + '!'); add('double ' + b + ' body', 'double ' + b + ' body!');
}
['duck', 'duck left', 'duck right', 'block', 'step back', 'pivot left', 'pivot right'].forEach((t) => add(t, t + '!'));
for (let n = 1; n <= 20; n++) { add(`Round ${n}`, `Round ${NUM[n]}.`); add(`round ${n} next`, `Round ${NUM[n]} next.`); }
[
  'Box!', 'Get ready.', 'Guard up.', 'Ten seconds!', 'Finish strong!', 'Ten seconds.', 'Halfway.', 'Keep moving.', 'Time!',
  'Great work.', 'Fast hands!', 'Straight punches.', 'Speed bag!', 'Keep it going.', 'Body shots!', 'Stay low.', 'Freestyle!',
  'Move your feet.', 'Hooks only!', 'Turn the hips.', 'Hands up.', 'Chin down.', 'Breathe.', 'Stay on your toes.',
  'Move your head.', 'Snap it back.', 'Light feet.', '8 seconds!', '10 seconds!',
].forEach((t) => add(t, t.replace('8 seconds', 'eight seconds').replace('10 seconds', 'ten seconds')));

process.stdout.write(JSON.stringify([...out.values()], null, 1));
