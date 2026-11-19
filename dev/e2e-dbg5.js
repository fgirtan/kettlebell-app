const { chromium, devices } = require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8765/');await p.waitForTimeout(600);
console.log('kbMode exists',!!(await p.$('#kbMode')));
await p.tap('#kbMode [data-v=custom]');await p.waitForTimeout(450);
console.log('cwNew',!!(await p.$('#cwNew')), 'cw editing?', !!(await p.$('#cwAdd')));
if(await p.$('#cwNew')){await p.tap('#cwNew');await p.waitForTimeout(450);}
await p.tap('#cwAdd');await p.waitForTimeout(600);
console.log('pkCount',await p.evaluate(()=>{const e=document.querySelector('#pkCount');return e&&e.textContent}),'items',await p.$$eval('#pkList .ex-item',r=>r.length));
console.log('errors',errs.join(';')||'none');await b.close();})();
