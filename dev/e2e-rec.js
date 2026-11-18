const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.text().includes('no recorded clip'))errs.push(m.text())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('[data-tab=recovery]');await p.waitForTimeout(300);
await p.tap('[data-rchip="10"]');await p.tap('#rGen');await p.waitForTimeout(600);
await p.screenshot({path:S+'/r-setup.png',fullPage:true});
await p.tap('.sticky-start button');await p.waitForTimeout(1200);
await p.tap('[data-skip=startNow]');await p.waitForTimeout(900);
await p.screenshot({path:S+'/r-player.png'});
const ph=await p.evaluate(()=>[document.querySelector('.p-phase').textContent,document.querySelector('.p-name').textContent,document.querySelector('.p-skips').textContent]);
for(let i=0;i<60;i++){if(!(await p.$('#pNext')))break;await p.tap('#pNext');await p.waitForTimeout(50);}
await p.waitForTimeout(500);
const done=await p.evaluate(()=>document.querySelector('.p-done h2')?.textContent);
const voice=await p.evaluate(()=>JSON.parse(localStorage.getItem('kettlebell.v1')).settings.clipVoice);
console.log(JSON.stringify(ph),'| end:',done,'| voice:',voice,'| errors:',errs.join('\n')||'none');await b.close();})();
