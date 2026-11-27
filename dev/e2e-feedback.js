// Finish screen feedback: feeling + kettlebell weight are saved, "Too easy" adapts the next generated workout
const { chromium, devices } = require('playwright');
const SHOT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', colorScheme: 'dark' });
  await c.addInitScript(() => {
    const real = performance.now.bind(performance), t0 = real(); performance.now = () => t0 + (real() - t0) * 60;
    const st = window.setInterval; window.setInterval = (f, ms, ...a) => st(f, Math.max(10, ms / 4), ...a);
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.settings.minutes = 10; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(500);
  const before = await p.evaluate(() => JSON.parse(localStorage.getItem('kettlebell.v1')).settings.timing);
  await p.tap('#gen'); await p.waitForTimeout(400); await p.tap('.sticky-start button');
  await p.waitForSelector('.p-done', { timeout: 30000 });
  await p.tap('[data-kg="1"]'); await p.tap('[data-kg="1"]');
  await p.tap('#fbFeel [data-v="1"]'); await p.waitForTimeout(300);
  const msg = await p.textContent('#fbMsg');
  if (SHOT) await p.screenshot({ path: SHOT });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('kettlebell.v1')));
  const last = st.history[st.history.length - 1];
  const ok = last.feel === 1 && last.kg === 12 && st.settings.timing.work === before.work + 5 && st.settings.timing.rest === before.rest - 5 && !errs.length;
  console.log({ feel: last.feel, kg: last.kg, work: `${before.work}→${st.settings.timing.work}`, rest: `${before.rest}→${st.settings.timing.rest}`, msg, errs });
  console.log(ok ? 'feedback OK' : 'feedback PROBLEM'); process.exitCode = ok ? 0 : 1;
  await b.close();
})();
