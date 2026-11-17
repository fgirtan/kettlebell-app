const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13'], colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
// double-tap the + button: should add 10 min, no zoom
await p.tap('#dPlus');await p.tap('#dPlus');await p.waitForTimeout(200);
const mins=await p.textContent('#dNum'); const scale=await p.evaluate(()=>window.visualViewport.scale);
await p.tap('[data-tab=settings]');await p.waitForTimeout(300);
await p.screenshot({path:S+'/d-settings.png',fullPage:true});
await p.tap('#testVoice');await p.waitForTimeout(300);
await p.tap('[data-tab=home]');await p.waitForTimeout(200);
await p.tap('#gen');await p.waitForTimeout(500);
await p.tap('.sticky-start button');await p.waitForTimeout(2500);
const ph=await p.textContent('.p-phase');
await p.screenshot({path:S+'/d-player.png'});
console.log('mins',mins,'scale',scale,'phase',ph,'errors:',errs.join('\n')||'none');await b.close();})();
