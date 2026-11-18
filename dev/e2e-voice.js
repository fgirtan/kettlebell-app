const { chromium, devices } = require('playwright');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13']});
const p=await c.newPage();const warns=[],errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().includes('no recorded clip'))warns.push(m.text());if(m.type()==='error')errs.push(m.text())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('#gen');await p.waitForTimeout(400);await p.tap('.sticky-start button');await p.waitForTimeout(800);
for(let i=0;i<80;i++){await p.tap('#pNext');await p.waitForTimeout(40);}
await p.waitForTimeout(500);
const played=await p.evaluate(()=>[...document.querySelectorAll('audio')].length);
await p.tap('#pClose').catch(()=>{});await p.waitForTimeout(300);
await p.tap('[data-tab=boxing]');await p.waitForTimeout(300);
await p.tap('[data-bstep=prep][data-d="-5"]');await p.tap('[data-bstep=prep][data-d="-5"]');
await p.tap('#bStart');await p.waitForTimeout(12000);
const srcPlaying=await p.evaluate(()=>{const a=window.__a;return null});
await p.tap('#bNext');await p.waitForTimeout(800);
console.log('missing clips:',warns.length?warns.slice(0,10).join('\n'):'none','| errors:',errs.join('\n')||'none');await b.close();})();
