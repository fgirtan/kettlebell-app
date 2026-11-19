const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => errs.push(m.type() + ': ' + m.text()));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
  await p.tap('#kbMode [data-v=custom]'); await p.waitForTimeout(700);
  await p.tap('#cwNew'); await p.waitForTimeout(700);
  await p.evaluate(() => { window.__clicks = []; document.addEventListener('click', (e) => window.__clicks.push((e.target.id || e.target.className || e.target.tagName) + '@' + Math.round(e.clientY)), true); });
  await p.tap('#cwAdd'); await p.waitForTimeout(800);
  console.log('clicks:', await p.evaluate(() => window.__clicks.join(', ')));
  const view = (await p.evaluate(() => document.querySelector('#view').innerText)).slice(0, 160).replace(/\n/g, ' / ');
  console.log('sheet hidden:', await p.evaluate(() => document.querySelector('#sheet').hidden), '| view now:', view);
  console.log(errs.join('\n') || 'no console'); await b.close();
})();
