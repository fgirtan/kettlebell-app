const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('#kbMode [data-v=custom]');await p.waitForTimeout(300);
await p.tap('#cwNew');await p.waitForTimeout(300);
await p.fill('#cwName','Back day light');
await p.tap('#cwAdd');await p.waitForTimeout(400);
await p.fill('#sheet .search','goblet squat');await p.waitForTimeout(300);await p.tap('#pkList .ex-item .info');
await p.fill('#sheet .search','standing pullover');await p.waitForTimeout(300);await p.tap('#pkList .ex-item .info');
await p.fill('#sheet .search','halo');await p.waitForTimeout(300);await p.tap('#pkList .ex-item .info');
await p.tap('#pkDone');await p.waitForTimeout(300);
const nrows=await p.$$eval('.cw-row',r=>r.map(x=>x.querySelector('.cw-name').textContent));console.log('rows',nrows);if(nrows.length>=3){await p.tap('.cw-row:nth-child(1) [data-sec="5"]');await p.tap('.cw-row:nth-child(3) [data-mv="-1"]');}
await p.screenshot({path:S+'/c-editor.png',fullPage:true});
const total=await p.textContent('#cwTotal');
await p.tap('#cwSave');await p.waitForTimeout(300);
await p.screenshot({path:S+'/c-list.png'});
await p.tap('.cw-item [data-act=start]');await p.waitForTimeout(800);
await p.tap('[data-skip=skipWarm]');await p.waitForTimeout(300);await p.tap('[data-skip=startNow]');await p.waitForTimeout(400);
const ph=await p.evaluate(()=>[document.querySelector('.p-phase').textContent,document.querySelector('.p-label').textContent,document.querySelector('.p-name').textContent,document.querySelector('.p-timer').textContent]);
await p.tap('#pNext');await p.waitForTimeout(300);
const ph2=await p.evaluate(()=>[document.querySelector('.p-phase').textContent,document.querySelector('.p-name').textContent]);
await p.tap('#pClose');await p.waitForTimeout(300);
// save generated as mine
await p.tap('#kbMode [data-v=gen]');await p.waitForTimeout(300);await p.tap('#gen');await p.waitForTimeout(400);await p.tap('#saveAsMine');await p.waitForTimeout(400);
const editorItems=await p.$$eval('.cw-row',r=>r.length);
console.log('total:',total,'\nplayer:',JSON.stringify(ph),'\nafter skip:',JSON.stringify(ph2),'\nsave-as-mine items:',editorItems,'\nerrors:',errs.join('\n')||'none');await b.close();})();
