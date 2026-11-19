const { chromium, devices } = require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+e.stack));p.on('console',m=>errs.push(m.type()+': '+m.text()));
await p.goto('http://localhost:8765/');await p.waitForTimeout(600);
await p.tap('#kbMode [data-v=custom]');await p.waitForTimeout(600);
await p.tap('#cwNew');await p.waitForTimeout(600);
console.log('after cwNew: cwAdd?',!!(await p.$('#cwAdd')),'| view starts:',(await p.evaluate(()=>document.querySelector('#view').innerText)).slice(0,120).replace(/\n/g,' / '));
console.log(errs.join('\n')||'no console');await b.close();})();
