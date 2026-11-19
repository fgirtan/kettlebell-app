const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const W=()=>p.waitForTimeout(450);
await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
const t0=Date.now();await p.tap('[data-tab=library]');await p.waitForSelector('.lib-count');const ms=Date.now()-t0;
const count0=await p.textContent('.lib-count'), rows0=await p.$$eval('#libList .ex-item',r=>r.length);
for(const f of ['one','stand','back']){await p.tap(`#libFilters [data-f=${f}]`);await W();}
const count1=await p.textContent('.lib-count');
await p.fill('.search','clean');await W();const count2=await p.textContent('.lib-count');
await p.screenshot({path:S+'/l-lib.png'});
await p.fill('.search','');await W();
const mb=await p.$('#libList .btn.ghost:not([hidden])');if(mb){await mb.tap();await W();}
const rows1=await p.$$eval('#libList .ex-item',r=>r.length);
await p.tap('[data-tab=home]');await W();await p.tap('#kbMode [data-v=custom]');await W();await p.tap('#cwNew');await W();await p.tap('#cwAdd');await W();
const pk=await p.textContent('#pkCount');await p.fill('#sheet .search','windmill');await W();const pk2=await p.textContent('#pkCount');
await p.screenshot({path:S+'/l-picker.png'});
console.log('open library ms',ms,'|',count0,'rows rendered',rows0,'\nfiltered (1 bell+standing+back):',count1,'| +search "clean":',count2,'| after show more:',rows1,'rows\npicker:',pk,'| "windmill":',pk2,'\nerrors:',errs.join('\n')||'none');await b.close();})();
