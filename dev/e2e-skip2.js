const { chromium, devices } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);await p.tap('#gen');await p.waitForTimeout(400);
await p.tap('.sticky-start button');await p.waitForTimeout(400);await p.tap('[data-skip=skipWarm]');await p.waitForTimeout(200);await p.tap('[data-skip=startNow]');await p.waitForTimeout(300);
const names=[await p.textContent('.p-name')];const left0=await p.textContent('#pLeft');
for(let i=0;i<8;i++){await p.tap('#pNext');await p.waitForTimeout(120);names.push(await p.textContent('.p-name'));}
console.log(names.join(' → '),'| left',left0,'→',await p.textContent('#pLeft'),'| errors',errs.join(';')||'none');await b.close();})();
