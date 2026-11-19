const { chromium, devices } = require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
await p.tap('[data-tab=library]');await p.waitForTimeout(300);
await p.fill('.search','clean');await p.waitForTimeout(300);
await p.tap('#libList .ex-item .info');await p.waitForTimeout(600);
const t=Date.now(); const r=await p.evaluate(()=>1+1); console.log('eval ms',Date.now()-t);
try{await p.tap('#shClose',{timeout:5000});console.log('tap ok');}catch(e){console.log('tap failed');}
try{await p.click('#shClose',{timeout:5000});console.log('click ok');}catch(e){console.log('click failed');}
console.log('sheet hidden:',await p.evaluate(()=>document.querySelector('#sheet').hidden),'errors',errs.join(';')||'none');await b.close();})();
