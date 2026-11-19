// QA 2: fuzz the workout / recovery / boxing / custom generators with random settings.
const path = require('path');
global.window = global; global.self = global;
global.document = { createElementNS: () => ({ setAttribute() {}, appendChild() {}, style: {} }) };
['voice-index', 'photos', 'figure', 'anims', 'exercises', 'exercises-lib', 'generator', 'boxing', 'recovery'].forEach((f) => require(path.join(__dirname, '..', 'js', f + '.js')));
const problems = []; const bad = (m) => { if (problems.length < 80) problems.push(m); };
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[r(0, a.length - 1)];
const checkIv = (iv, tag) => {
  iv.forEach((x, i) => {
    if (!EX[x.ex]) bad(`${tag}: interval ${i} unknown exercise ${x.ex}`);
    if (!(Number.isInteger(x.dur) && x.dur > 0)) bad(`${tag}: interval ${i} bad duration ${x.dur}`);
    if (!x.phase) bad(`${tag}: interval ${i} no phase`);
  });
};
let n = 0;
// --- kettlebell generator
for (let k = 0; k < 3000; k++) {
  const timing = {
    work: r(10, 120), rest: pick([0, 10, 30, 45, 90]), restEvery: r(1, 10), prep: pick([0, 3, 5, 10, 30]), switch: pick([0, 2, 5]),
    warmOn: Math.random() < 0.7, warmMin: pick([0, 0, 2, 5, 10]), coolOn: Math.random() < 0.7, coolMin: pick([0, 0, 2, 8]),
  };
  const o = { minutes: r(5, 90), level: r(1, 3), focus: pick(['full', 'lower', 'upper', 'core']), backSafe: Math.random() < 0.5,
    lowFloor: Math.random() < 0.5, twoBells: Math.random() < 0.3, timing };
  const tag = `kb ${JSON.stringify(o)}`;
  let p;
  try { p = Generator.generate(o); } catch (e) { bad(`${tag} THROWS ${e.stack.split('\n').slice(0, 2).join(' ')}`); continue; }
  if (!p.main.length) bad(`${tag}: empty workout`);
  const iv = Generator.buildIntervals(p); checkIv(iv, 'kb');
  const tot = iv.reduce((s, x) => s + x.dur, 0);
  if (tot !== o.minutes * 60) bad(`${tag}: total ${tot} != ${o.minutes * 60}`);
  for (const id of p.main) {
    const e = EX[id];
    if (e.level > o.level) bad(`${tag}: level ${e.level} exercise ${id}`);
    if (!o.twoBells && e.eq === 2) bad(`${tag}: two-bell exercise ${id}`);
    if (o.backSafe && (e.back !== undefined ? e.back : Generator.BACK[id] || 0) >= 2) bad(`${tag}: high back load ${id} in back-safe`);
    if (['warmup', 'stretch', 'recovery', 'flow', 'juggling'].includes(e.cat)) bad(`${tag}: ${e.cat} exercise ${id} in main`);
  }
  // retime + swap + alternative must keep working
  try {
    Generator.retime(p, Object.assign({}, timing, { work: r(15, 60) }));
    const t2 = Generator.totalDuration(p); if (t2 !== o.minutes * 60) bad(`${tag}: after retime total ${t2}`);
    Generator.swap(p, r(0, p.main.length - 1));
    const alt = Generator.alternative(p, pick(p.main), { sameShape: true });
    if (alt && !EX[alt]) bad(`${tag}: alternative unknown ${alt}`);
  } catch (e) { bad(`${tag}: retime/swap THROWS ${e.message}`); }
  n++;
}
// --- custom workouts
const pool = EXERCISES.map((e) => e.id);
for (let k = 0; k < 800; k++) {
  const def = { id: 'x', name: 'T', items: Array.from({ length: r(1, 12) }, () => ({ ex: pick(pool), sec: r(10, 180) })), rounds: r(1, 10),
    restBetween: pick([0, 15, 60]), roundRest: pick([0, 60, 300]), warmOn: Math.random() < 0.5, coolOn: Math.random() < 0.5 };
  try {
    const p = Generator.customPlan(def, Generator.DEFAULT_TIMING);
    const iv = Generator.buildIntervals(p); checkIv(iv, 'custom');
    const works = iv.filter((x) => x.phase === 'work');
    const expectedWork = def.items.reduce((s, it) => s + it.sec, 0) * def.rounds;
    const gotWork = works.reduce((s, x) => s + x.dur, 0);
    if (gotWork !== expectedWork) bad(`custom: work ${gotWork} != ${expectedWork}`);
    if (p.target !== iv.reduce((s, x) => s + x.dur, 0)) bad('custom: target mismatch');
  } catch (e) { bad('custom THROWS ' + e.stack.split('\n').slice(0, 2).join(' ')); }
}
// --- recovery
for (let k = 0; k < 800; k++) {
  const c = { minutes: r(5, 60), focus: pick(Object.keys(Recovery.FOCUS)), hold: pick([0, 0, 30, 45, 60, 90, 120]), prep: r(3, 20), switch: r(0, 10), breath: Math.random() < 0.5 };
  try {
    const p = Recovery.generate(c, new Set());
    const iv = Recovery.buildIntervals(p); checkIv(iv, 'recovery');
    const tot = iv.reduce((s, x) => s + x.dur, 0);
    if (tot !== c.minutes * 60) bad(`recovery ${JSON.stringify(c)}: total ${tot}`);
    if (new Set(p.items).size !== p.items.length) bad(`recovery ${JSON.stringify(c)}: repeated move`);
  } catch (e) { bad('recovery THROWS ' + e.message); }
}
// --- boxing combos
for (let k = 0; k < 5000; k++) {
  const c = Object.assign({}, Boxing.DEFAULTS, { level: r(1, 3), terms: pick(['lr', 'classic']), defense: Math.random() < 0.7, body: Math.random() < 0.7 });
  const combo = Boxing.generateCombo(c);
  if (!combo.length) bad('boxing: empty combo');
  const parts = Boxing.comboParts(combo, c).map((x) => x.text);
  if (parts.some((t) => !t || t.includes('undefined'))) bad('boxing: bad text ' + parts.join(', '));
  if (!c.defense && combo.some((m) => m.kind === 'defense')) bad('boxing: defense while disabled');
  if (!c.body && combo.some((m) => m.body)) bad('boxing: body shot while disabled');
  for (let i = 1; i < combo.length; i++) if (combo[i].kind === 'defense' && combo[i - 1].kind === 'defense') bad('boxing: two defenses in a row');
}
console.log(`fuzz QA: ${n} kettlebell workouts, 800 custom, 800 recovery, 5000 boxing combos`);
console.log(problems.length ? 'PROBLEMS:\n- ' + problems.join('\n- ') : 'no problems found');
process.exitCode = problems.length ? 1 : 0;
