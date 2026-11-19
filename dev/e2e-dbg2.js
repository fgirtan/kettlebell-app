const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
await p.tap('[data-tab=library]');await p.waitForTimeout(300);
await p.tap('#libFilters [data-f=one]');await p.waitForTimeout(400);await p.tap('#libFilters [data-f=stand]');await p.waitForTimeout(400);
console.log('after 2 filters:',await p.evaluate(()=>[document.querySelector('#title').textContent, document.querySelector('.lib-count')&&document.querySelector('.lib-count').textContent, location.hash]));
await p.screenshot({path:S+'/dbg.png'});
console.log('errors',errs.join(';')||'none');await b.close();})();
