// Picker: whole list loads, + keeps the scroll position and marks the row
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPhone 13'] }); const p = await c.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kettlebell.v1')); s.settings.pickFilters = {}; localStorage.setItem('kettlebell.v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(600);
  await p.tap('#kbMode [data-v=custom]'); await p.waitForTimeout(500); await p.tap('#cwNew'); await p.waitForTimeout(500);
  await p.tap('#cwAdd'); await p.waitForTimeout(2000);
  const n = await p.$$eval('#pkList .ex-item', (r) => r.length);
  const more = await p.$$eval('#sheet button', (bs) => bs.some((x) => /Show more/.test(x.textContent)));
  const row = (await p.$$('#pkList .ex-item'))[300];
  await row.scrollIntoViewIfNeeded();
  const scroller = await p.evaluateHandle(() => { let el = document.querySelector('#pkList'); while (el && el.scrollHeight <= el.clientHeight + 1) el = el.parentElement; return el; });
  const before = await scroller.evaluate((el) => el.scrollTop);
  await (await row.$('.icon-btn:last-child')).tap(); await p.waitForTimeout(400);
  await (await row.$('.icon-btn:last-child')).tap(); await p.waitForTimeout(400);
  const after = await scroller.evaluate((el) => el.scrollTop);
  const picked = await row.evaluate((r) => r.classList.contains('picked'));
  const count = await p.textContent('#pkCount');
  await p.tap('#pkDone'); await p.waitForTimeout(400);
  console.log({ rows: n, showMore: more, scrollBefore: before, scrollAfter: after, picked, count, errs });
  const okAll = n > 300 && !more && Math.abs(before - after) < 2 && before > 1000 && picked && /2 added/.test(count) && !errs.length;
  console.log(okAll ? 'picker OK' : 'picker PROBLEM');
  process.exitCode = okAll ? 0 : 1;
  await b.close();
})();
