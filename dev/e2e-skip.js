const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.text().includes('no recorded clip'))errs.push(m.text())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('#gen');await p.waitForTimeout(500);
await p.evaluate(()=>document.querySelector('#preview').scrollIntoView());await p.waitForTimeout(300);
await p.screenshot({path:S+'/s-preview.png'});
const restRows=await p.$$eval('.rest-row',r=>r.length);
await p.tap('.sticky-start button');await p.waitForTimeout(500);
await p.tap('[data-skip=skipWarm]');await p.waitForTimeout(300);await p.tap('[data-skip=startNow]');await p.waitForTimeout(600);
const get=()=>p.evaluate(()=>({ph:document.querySelector('.p-phase').textContent,name:document.querySelector('.p-name').textContent,left:document.querySelector('#pLeft').textContent,t:document.querySelector('.p-timer').textContent}));
const before=await get();
for(let i=0;i<5;i++){await p.tap('#pNext');await p.waitForTimeout(150);}
const after=await get();
await p.screenshot({path:S+'/s-player.png'});
console.log('rest rows',restRows,'\nbefore',JSON.stringify(before),'\nafter 5 skips',JSON.stringify(after),'\nerrors:',errs.join('\n')||'none');await b.close();})();
