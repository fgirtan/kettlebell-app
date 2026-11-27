// Resume: a workout interrupted by a page reload (phone closed the app) can be continued where it stopped
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = []; let fail = 0;
  for (const kind of ['kettlebell', 'boxing']) {
    const c = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    await c.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; window.confirm = () => true; });
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
    if (kind === 'kettlebell') { await p.tap('#gen'); await p.waitForTimeout(400); await p.tap('.sticky-start button'); await p.waitForTimeout(700); await p.tap('[data-skip=skipWarm]'); await p.waitForTimeout(3000); }
    else { await p.tap('[data-tab=boxing]'); await p.waitForTimeout(400); await p.tap('#bStart'); await p.waitForTimeout(13000); }
    const leftBefore = await p.textContent(kind === 'kettlebell' ? '#pLeft' : '#bLeft');
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // state is also saved every 5 s
    await p.reload(); await p.waitForTimeout(800);
    const card = await p.$('.resume-card');
    const cardText = card ? (await card.innerText()).replace(/\n+/g, ' · ') : null;
    if (card) { await p.tap('.resume-card [data-r=go]'); await p.waitForTimeout(700); }
    const leftAfter = await p.textContent(kind === 'kettlebell' ? '#pLeft' : '#bLeft').catch(() => null);
    const l1 = await p.textContent(kind === 'kettlebell' ? '#pLeft' : '#bLeft').catch(() => null); await p.waitForTimeout(2200); const paused = l1 === await p.textContent(kind === 'kettlebell' ? '#pLeft' : '#bLeft').catch(() => null);
    const toSec = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
    const okRes = card && leftAfter && Math.abs(toSec(leftAfter) - toSec(leftBefore)) <= 6;
    out.push(`${okRes ? '✓' : '✗'} ${kind}: before reload ${leftBefore}, card "${cardText}", after Continue ${leftAfter}, paused=${paused} ${errs.join(' | ')}`);
    if (!okRes || errs.length) fail++;
    // after quitting, the card must be gone
    if (leftAfter) { await p.tap(kind === 'kettlebell' ? '#pClose' : '#bClose'); await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(600); if (await p.$('.resume-card')) { out.push(`✗ ${kind}: card still shown after quitting`); fail++; } }
    await c.close();
  }
  console.log(out.join('\n')); process.exitCode = fail ? 1 : 0; await b.close();
})();
