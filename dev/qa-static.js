// QA 1: syntax, files, service-worker coverage, data integrity, animations, voice coverage.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const problems = [];
const bad = (m) => problems.push(m);

// --- syntax of every JS file
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  try { new Function(fs.readFileSync(path.join(root, 'js', f), 'utf8')); } catch (e) { bad(`syntax ${f}: ${e.message}`); }
}
try { new Function(fs.readFileSync(path.join(root, 'sw.js'), 'utf8')); } catch (e) { bad('syntax sw.js: ' + e.message); }

// --- index.html references exist and are precached
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const r of refs) {
  if (!fs.existsSync(path.join(root, r))) bad(`index.html references missing file ${r}`);
  if (!sw.includes(`'${r}'`)) bad(`sw.js does not precache ${r}`);
}
const swAssets = [...sw.matchAll(/'((?:js|css|icons|photos)\/[^']+)'/g)].map((m) => m[1]);
for (const a of swAssets) if (!fs.existsSync(path.join(root, a))) bad(`sw.js precaches missing file ${a}`);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const i of manifest.icons) if (!fs.existsSync(path.join(root, i.src))) bad(`manifest icon missing ${i.src}`);

// --- load data in node
global.window = global; global.self = global;
global.document = { createElementNS: () => ({ setAttribute() {}, appendChild() {}, style: {} }) };
['voice-index', 'photos', 'figure', 'anims', 'exercises', 'exercises-lib', 'generator', 'boxing', 'recovery'].forEach((f) => require(path.join(root, 'js', f + '.js')));

// --- exercise integrity
const ids = new Set(), names = new Map();
const CATS = Object.keys(CAT_LABEL);
for (const e of EXERCISES) {
  if (ids.has(e.id)) bad(`duplicate id ${e.id}`); ids.add(e.id);
  const n = e.name.toLowerCase(); if (names.has(n)) bad(`duplicate name "${e.name}" (${names.get(n)} / ${e.id})`); names.set(n, e.id);
  for (const k of ['id', 'name', 'cat', 'region', 'muscles', 'level', 'anim', 'cues']) if (e[k] === undefined || e[k] === '') bad(`${e.id} missing ${k}`);
  if (!CATS.includes(e.cat)) bad(`${e.id} unknown category ${e.cat}`);
  if (!['lower', 'upper', 'core', 'total'].includes(e.region)) bad(`${e.id} bad region ${e.region}`);
  if (![1, 2, 3].includes(e.level)) bad(`${e.id} bad level ${e.level}`);
  if (!ANIMS[e.anim]) bad(`${e.id} anim ${e.anim} missing`);
  if (!Array.isArray(e.cues) || !e.cues.length) bad(`${e.id} has no cues`);
  if (e.uni && e.alt) bad(`${e.id} is both uni and alt`);
  if (EX[e.id] !== e) bad(`${e.id} not in EX map`);
}
// --- photos
for (const [id, key] of Object.entries(self.PHOTOS)) {
  if (!EX[id]) bad(`photo mapped to unknown exercise ${id}`);
  for (const i of [0, 1]) if (!fs.existsSync(path.join(root, 'photos', `${key}_${i}.jpg`))) bad(`photo file missing ${key}_${i}`);
}
// --- every animation keyframe resolves to finite coordinates
for (const key of Object.keys(ANIMS)) {
  let fr;
  try { fr = Figure.frames(key); } catch (e) { bad(`anim ${key} throws: ${e.message}`); continue; }
  fr.forEach((f, i) => {
    for (const [k, v] of Object.entries(f.p)) if (typeof v === 'number' && !Number.isFinite(v)) bad(`anim ${key}[${i}].${k} = ${v}`);
    if (!(f.d >= 0)) bad(`anim ${key}[${i}] bad duration`);
  });
}
// --- recovery stages point to real exercises
for (const id of Object.keys(Recovery.STAGE)) if (!EX[id]) bad(`recovery stage references unknown ${id}`);

// --- voice: every exercise name + every hard-coded spoken phrase has a clip
const clips = new Set(self.VOICE_CLIPS);
const norm = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const keysOf = (t) => t.split(/[.,:!?]+/).map((x) => x.trim()).filter(Boolean).map(norm).filter(Boolean);
for (const e of EXERCISES) if (!clips.has(norm(e.name))) bad(`no voice clip for "${e.name}"`);
for (const v of ['m', 'f']) for (const k of clips) if (!fs.existsSync(path.join(root, 'audio', v, k + '.mp3'))) bad(`clip file missing audio/${v}/${k}.mp3`);
// literal strings passed to Fx.say / say( in the source
for (const f of ['app.js', 'boxing.js']) {
  const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  for (const m of src.matchAll(/say\(\s*'([^'$`]+)'/g)) for (const k of keysOf(m[1])) if (!clips.has(k)) bad(`${f}: phrase "${m[1]}" – no clip for "${k}"`);
}

console.log(`static QA: ${EXERCISES.length} exercises, ${Object.keys(ANIMS).length} animations, ${clips.size} clips`);
console.log(problems.length ? 'PROBLEMS:\n- ' + problems.slice(0, 60).join('\n- ') + (problems.length > 60 ? `\n… +${problems.length - 60} more` : '') : 'no problems found');
process.exitCode = problems.length ? 1 : 0;
