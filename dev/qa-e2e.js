// QA 3: run whole sessions in a phone-sized browser with a fast-forwarded clock, click through every screen,
// old-data migration and offline start. Usage: node dev/qa-e2e.js  (needs a server on :8765)
const { chromium, devices } = require('playwright');
const URL = 'http://localhost:8765/';
const SPEED = 60;
const results = [], problems = [];
const ok = (m) => results.push('✓ ' + m), bad = (m) => problems.push('✗ ' + m);

async function newPage(b, opts = {}) {
  const c = await b.newContext({ ...devices['iPhone 13'], colorScheme: 'dark', serviceWorkers: opts.sw ? 'allow' : 'block' });
  await c.addInitScript((speed) => {
    const real = performance.now.bind(performance), t0 = real();
    performance.now = () => t0 + (real() - t0) * speed;              // fast-forward the workout clocks
    const st = window.setInterval; window.setInterval = (f, ms, ...a) => st(f, Math.max(10, ms / 4), ...a);
    window.speechSynthesis && (window.speechSynthesis.speak = () => {});
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    window.confirm = () => true;
  }, opts.speed || SPEED);
  if (opts.storage) await c.addInitScript((s) => { if (!sessionStorage.__seeded) { localStorage.setItem('kettlebell.v1', s); sessionStorage.__seeded = 1; } }, opts.storage);
  const p = await c.newPage();
  p._errs = [];
  p.on('pageerror', (e) => p._errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') p._errs.push(m.text()); });
  return p;
}
const W = (p, ms = 500) => p.waitForTimeout(ms);
const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('kettlebell.v1') || '{}'));
async function waitDone(p, maxMs) {
  const t = Date.now();
  while (Date.now() - t < maxMs) { if (await p.$('.p-done')) return true; await W(p, 300); }
  return false;
}

(async () => {
  const b = await chromium.launch();

  // A. generated kettlebell workout, 10 min, run to the end
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.settings.minutes = 10; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
    await p.reload(); await W(p);
    await p.tap('#gen'); await W(p);
    await p.tap('.sticky-start button'); await W(p);
    const done = await waitDone(p, 30000);
    const h = (await store(p)).history || [];
    const last = h[h.length - 1];
    if (done && last && last.done && Math.abs(last.sec - 600) <= 3) ok(`kettlebell 10 min ran to the end, history ${last.sec}s`);
    else bad(`kettlebell run: done=${done} history=${JSON.stringify(last)}`);
    if (p._errs.length) bad('kettlebell run errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // B. skipping 15 times must not shorten the session; Rest 30s adds 30 s
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.settings.minutes = 10; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
    await p.reload(); await W(p); await p.tap('#gen'); await W(p);
    await p.tap('.sticky-start button'); await W(p, 300);
    for (let i = 0; i < 15; i++) { await p.tap('#pNext').catch(() => {}); await W(p, 120); }
    let r30 = null; for (let i = 0; i < 60 && !r30; i++) { r30 = await p.$('[data-skip=rest30]'); if (!r30) await W(p, 150); }
    if (r30) await r30.tap();
    const done = await waitDone(p, 35000);
    const last = ((await store(p)).history || []).slice(-1)[0];
    const want = 600 + (r30 ? 30 : 0);
    if (done && last && Math.abs(last.sec - want) <= 3) ok(`skip x15 + Rest 30s keeps the full time: ${last.sec}s (expected ${want})`);
    else bad(`skip run: done=${done} sec=${last && last.sec} expected ${want}`);
    if (p._errs.length) bad('skip run errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // C. custom workout
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.tap('#kbMode [data-v=custom]'); await W(p, 700); await p.tap('#cwNew'); await W(p, 700);
    await p.tap('#cwAdd'); await W(p, 700);
    for (const q of ['goblet squat', 'halo', 'supported']) { await p.fill('#sheet .search', q); await W(p, 500); await p.tap('#pkList .ex-item .icon-btn'); await W(p, 500); }
    await p.tap('#pkDone'); await W(p, 600);
    const tot = await p.textContent('#cwTotal');
    await p.tap('#cwStart'); await W(p);
    const done = await waitDone(p, 30000);
    const s = await store(p); const last = (s.history || []).slice(-1)[0];
    if (done && last && last.name && s.custom && s.custom.length === 1) ok(`custom workout saved and ran to the end (${tot.trim()}, history ${last.sec}s "${last.name}")`);
    else bad(`custom run: done=${done} last=${JSON.stringify(last)} custom=${s.custom && s.custom.length}`);
    if (p._errs.length) bad('custom errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // D. recovery 5 min
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.tap('[data-tab=recovery]'); await W(p); await p.tap('[data-rchip="5"]'); await W(p); await p.tap('#rGen'); await W(p);
    await p.tap('#rPreview .sticky-start button'); await W(p);
    const done = await waitDone(p, 20000);
    const last = ((await store(p)).history || []).slice(-1)[0];
    if (done && last && last.type === 'recovery' && Math.abs(last.sec - 300) <= 3) ok(`recovery 5 min ran to the end, history ${last.sec}s`);
    else bad(`recovery: done=${done} last=${JSON.stringify(last)}`);
    if (p._errs.length) bad('recovery errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // E. boxing 2 x 1 min rounds
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.settings.boxing = { mode: 'rounds', rounds: 2, roundSec: 60, restSec: 15, prep: 5, level: 2, terms: 'classic', defense: true, body: true, bursts: true, pace: 0, v2: true }; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
    await p.reload(); await W(p);
    await p.tap('[data-tab=boxing]'); await W(p); await p.tap('#bStart'); await W(p, 1500);
    const combo = await p.textContent('#bxCombo');
    const done = await waitDone(p, 20000);
    const last = ((await store(p)).history || []).slice(-1)[0];
    if (done && last && last.type === 'boxing' && last.combos > 0) ok(`boxing 2×1 min ran to the end, ${last.combos} combos (e.g. "${combo.replace(/›/g, ', ')}")`);
    else bad(`boxing: done=${done} last=${JSON.stringify(last)}`);
    if (p._errs.length) bad('boxing errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // E2. Skip during the main part moves to a different muscle group each time, time left unchanged
  {
    const p = await newPage(b, { speed: 1 });
    await p.goto(URL); await W(p); await p.tap('#gen'); await W(p); await p.tap('.sticky-start button'); await W(p, 600);
    await p.tap('[data-skip=skipWarm]'); await W(p, 400);
    await p.tap('#pPlay'); await W(p, 200); // pause so the clock doesn't move
    const grp = () => p.evaluate(() => { const n = document.querySelector('.p-name').textContent.replace(/^Next:\s*/, ''); const e = EXERCISES.find((x) => x.name === n); return e ? Generator.groupOf(e) : '?' + n; });
    const left0 = await p.textContent('#pLeft');
    const seen = [await grp()];
    for (let i = 0; i < 3; i++) { await p.tap('#pNext'); await W(p, 300); seen.push(await grp()); }
    const left1 = await p.textContent('#pLeft');
    const allDiff = seen.every((g, i) => i === 0 || g !== seen[i - 1]) && !seen.some((g) => g.startsWith('?'));
    if (allDiff && left0 === left1) ok(`skip changes the muscle group: ${seen.join(' → ')} (time left ${left1} unchanged)`);
    else bad(`skip groups: ${seen.join(' → ')} time ${left0} → ${left1}`);
    if (p._errs.length) bad('skip-group errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // F. pause really pauses
  {
    const p = await newPage(b, { speed: 1 });
    await p.goto(URL); await W(p); await p.tap('#gen'); await W(p); await p.tap('.sticky-start button'); await W(p);
    await p.tap('#pPlay'); const t1 = await p.textContent('#pLeft'); await W(p, 2500); const t2 = await p.textContent('#pLeft');
    await p.tap('#pPlay'); await W(p, 2200); const t3 = await p.textContent('#pLeft');
    if (t1 === t2 && t3 !== t2) ok(`pause/resume (paused at ${t1}, resumed → ${t3})`); else bad(`pause: ${t1} ${t2} ${t3}`);
    await p.context().close();
  }
  // G. click through every screen and setting
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    for (const t of ['library', 'history', 'settings', 'boxing', 'recovery', 'home']) { await p.tap(`[data-tab=${t}]`); await W(p, 400); }
    await p.tap('[data-tab=settings]'); await W(p);
    for (const sel of ['#theme [data-t=light]', '#theme [data-t=dark]', '#theme [data-t=auto]', '#visual [data-v=figure]', '#visual [data-v=photo]', '#vEngine [data-v=f]', '#vEngine [data-v=m]', '#prepCue [data-v=count]', '#prepCue [data-v=ticks]']) {
      const el = await p.$(sel); if (!el) { bad('settings: missing ' + sel); continue; } await el.tap(); await W(p, 250);
    }
    for (const k of ['sound', 'voice', 'vibrate', 'silentMode']) { const el = await p.$(`input[data-k=${k}]`); if (el) { await el.evaluate((i) => i.click()); await W(p, 150); await el.evaluate((i) => i.click()); } }
    await p.tap('#testVoice').catch(() => {}); await W(p, 300);
    await p.tap('[data-tab=home]'); await W(p); await p.tap('#tToggle'); await W(p, 300);
    for (const k of ['work', 'prep', 'rest', 'restEvery', 'switch']) { await p.tap(`[data-step=${k}][data-d^="-"]`).catch(() => bad('timing stepper ' + k)); await W(p, 200); }
    await p.tap('#tReset'); await W(p);
    for (const f of ['lower', 'upper', 'core', 'full']) { await p.tap(`#focus [data-f=${f}]`); await W(p, 150); }
    for (const l of [3, 2, 1]) { await p.tap(`#lvl [data-l="${l}"]`); await W(p, 300); }
    await p.tap('#gen'); await W(p);
    await p.tap('#preview .pv-block >> nth=1'); await W(p, 300);
    await p.tap('#preview .ex-item .icon-btn'); await W(p, 300);
    await p.tap('#preview .ex-item .info'); await W(p, 600); await p.tap('#shClose'); await W(p, 300);
    await p.tap('#saveAsMine'); await W(p, 600); await p.tap('#cwBack'); await W(p, 400);
    if (p._errs.length) bad('click-through errors: ' + p._errs.join(' | ')); else ok('clicked through every tab, setting, stepper, focus/level, swap, detail sheet, save-as-mine');
    await p.context().close();
  }
  // G2. new settings + history goal + backup round trip
  {
    const p = await newPage(b);
    await p.goto(URL); await W(p);
    await p.tap('[data-tab=settings]'); await W(p);
    for (const sel of ['#thumbs [data-v=photo]', '#thumbs [data-v=figure]', '#figView [data-v=side]', '#figView [data-v=angle]']) { const el = await p.$(sel); if (!el) bad('settings: missing ' + sel); else { await el.tap(); await W(p, 200); } }
    // backup: export file, change data, import it back
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.history = [{ date: Date.now(), sec: 900, minutes: 15, focus: 'full', level: 1, ex: ['goblet'], done: true, kg: 10, feel: 2 }]; s.custom = [{ id: 'c1', name: 'Mine', items: [{ ex: 'goblet', sec: 40 }], rounds: 2 }]; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
    await p.reload(); await W(p); await p.tap('[data-tab=settings]'); await W(p);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.tap('#bkExport')]);
    const file = dl ? await dl.path() : null;
    if (!file) bad('backup: no file was produced');
    else {
      await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.history = []; s.custom = []; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
      await p.setInputFiles('#bkFile', file); await W(p, 1500);
      const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kettlebell.v1')));
      if (st.history.length === 1 && st.custom.length === 1 && st.history[0].kg === 10) ok('backup: exported, wiped and restored (history + own workouts)');
      else bad(`backup restore: history ${st.history.length}, custom ${st.custom && st.custom.length}`);
    }
    await p.tap('[data-tab=history]'); await W(p);
    await p.tap('[data-goal="1"]'); await W(p, 300);
    const goal = await p.evaluate(() => JSON.parse(localStorage.getItem('kettlebell.v1')).settings.weekGoal);
    const week = await p.textContent('.week-card');
    await p.tap('.wk-chart .wk >> nth=7'); await W(p, 200);
    const tip = await p.textContent('.chart-tip');
    if (goal === 4 && /1 of 4 workouts/.test(week) && /This week/.test(tip)) ok(`history: weekly goal ${goal}, "${week.match(/\d of \d workouts/)[0]}", chart tip "${tip}"`);
    else bad(`history goal=${goal} week="${week}" tip="${tip}"`);
    if (p._errs.length) bad('G2 errors: ' + p._errs.join(' | '));
    await p.context().close();
  }
  // H. data from older app versions must not crash
  {
    const old = JSON.stringify({ settings: { minutes: 20, level: 2, focus: 'full', sound: true, voice: true, custom: { enabled: true, work: 40, rest: 20, roundRest: 30 } },
      plan: { v: 3, segments: [['goblet', 'press']], warm: [], cool: [], timing: {} },
      history: [{ date: Date.now() - 864e5, sec: 1200, minutes: 20, focus: 'full', level: 2, ex: ['goblet'], done: true },
        { type: 'boxing', date: Date.now(), sec: 600, mode: 'rounds', rounds: 3, roundSec: 180, level: 2, combos: 40, done: true },
        { type: 'recovery', date: Date.now(), sec: 900, focus: 'calm', ex: ['s_fold', 'gone_exercise'], done: false }] });
    const p = await newPage(b, { storage: old });
    await p.goto(URL); await W(p, 800);
    for (const t of ['home', 'history', 'settings', 'library']) { await p.tap(`[data-tab=${t}]`); await W(p, 400); }
    const histCards = await p.$$eval('#hl .card', (c) => c.length).catch(() => 0);
    await p.tap('[data-tab=history]'); await W(p, 400);
    const cards = await p.$$eval('#hl .card', (c) => c.length);
    if (p._errs.length) bad('old data errors: ' + p._errs.join(' | ')); else ok(`old saved data loads fine (history shows ${cards} entries)`);
    await p.context().close();
  }
  // I. offline start (service worker)
  {
    const p = await newPage(b, { sw: true, speed: 1 });
    await p.goto(URL); await W(p, 4000); await p.reload(); await W(p, 1500);
    await p.context().setOffline(true);
    await p.reload(); await W(p, 1500);
    const title = await p.textContent('#title').catch(() => null);
    await p.tap('#gen').catch(() => {}); await W(p, 500);
    const gen = await p.$('#preview .pv-block');
    if (title && gen) ok('starts and generates offline'); else bad(`offline: title=${title} preview=${!!gen}`);
    await p.context().close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log(problems.length ? problems.join('\n') : 'no problems found');
  process.exitCode = problems.length ? 1 : 0;
})();
