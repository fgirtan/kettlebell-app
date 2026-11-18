const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'});
const p=await c.newPage();const errs=[],bad=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('response',r=>{if(r.url().includes('/photos/')&&r.status()>=400)bad.push(r.url())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('[data-tab=library]');await p.waitForTimeout(800);
await p.screenshot({path:S+'/p-lib.png'});
await p.fill('.search','goblet squat');await p.waitForTimeout(300);
await p.tap('#libList .ex-item .info');await p.waitForTimeout(1800);
await p.screenshot({path:S+'/p-sheet.png'});
await p.tap('#visSeg [data-v=figure]');await p.waitForTimeout(800);
await p.screenshot({path:S+'/p-sheet-fig.png'});
await p.tap('#visSeg [data-v=photo]');await p.tap('#shClose');
await p.tap('[data-tab=home]');await p.waitForTimeout(200);await p.tap('#gen');await p.waitForTimeout(400);
await p.tap('.sticky-start button');await p.waitForTimeout(600);await p.tap('[data-skip=skipWarm]');await p.waitForTimeout(300);
let shot=false;for(let i=0;i<40&&!shot;i++){const vis=await p.evaluate(()=>!document.querySelector('.p-stage .ph').hidden);if(vis){await p.waitForTimeout(1500);await p.screenshot({path:S+'/p-player.png'});shot=true;}else{await p.tap('#pNext');await p.waitForTimeout(80);}}
console.log('player photo shown:',shot,'| photo 404s:',bad.length,'| errors:',errs.join('\n')||'none');await b.close();})();
