// Simulates an installed old version, then a deploy: the new version must show without extra reopenings.
const { chromium, devices } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/');await p.waitForTimeout(1500);
await p.reload();await p.waitForTimeout(800);   // now controlled by the SW
const ctl=await p.evaluate(()=>!!navigator.serviceWorker.controller);
// "deploy": change a visible string in app.js
const f='/home/user/kettlebell-app/js/app.js';const orig=fs.readFileSync(f,'utf8');fs.writeFileSync(f,orig.replace("['custom', 'My workouts']","['custom', 'My workouts NEW']"));
await p.reload();await p.waitForTimeout(800);
const txt=await p.textContent('#kbMode');
fs.writeFileSync(f,orig);
await p.tap('[data-tab=settings]');await p.waitForTimeout(300);const ver=await p.textContent('.card:has(#forceUpdate) b');
console.log('controlled by SW:',ctl,'| after deploy + 1 reload shows:',txt.trim(),'| version:',ver,'| errors:',errs.join(';')||'none');await b.close();})();
