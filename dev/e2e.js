const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13'], colorScheme:'dark'});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.click('[data-l="2"]');await p.waitForTimeout(200);
await p.click('#gen');await p.waitForTimeout(600);
await p.click('#tToggle');
await p.click('[data-step=prep][data-d="-1"]'); // 5 -> 4
await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('#preview').scrollIntoView());await p.waitForTimeout(200);
await p.screenshot({path:S+'/c-preview.png'});
await p.click('.sticky-start button');await p.waitForTimeout(600);
await p.click('[data-skip=skipWarm]');await p.waitForTimeout(300);
const grab=await p.textContent('.p-timer');
await p.click('[data-skip=startNow]');await p.waitForTimeout(300);
await p.click('[data-skip=rest30]');await p.waitForTimeout(400);
await p.screenshot({path:S+'/c-rest30.png'});
const r30=await p.evaluate(()=>[document.querySelector('.p-phase').textContent,document.querySelector('.p-label').textContent,document.querySelector('.p-timer').textContent]);
await p.click('#pNext');await p.waitForTimeout(200);
const back=await p.evaluate(()=>[document.querySelector('.p-phase').textContent,document.querySelector('.p-timer').textContent]);
// find get ready + switch
let prepT=null, sw=null;
for(let i=0;i<60 && (!prepT||!sw);i++){await p.click('#pNext');await p.waitForTimeout(60);
 const ph=await p.textContent('.p-phase');
 if(ph==='Get ready'&&!prepT)prepT=await p.textContent('.p-timer');
 if(ph==='Switch'&&!sw){sw=[await p.textContent('.p-timer'),await p.textContent('.p-name')];await p.screenshot({path:S+'/c-switch.png'});}}
console.log('grab',grab,'rest30',r30,'after',back,'prep',prepT,'switch',sw,'errors:',errs.join('\n')||'none');await b.close();})();
