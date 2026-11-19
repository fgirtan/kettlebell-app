const { chromium, devices } = require('playwright');
(async()=>{const S=process.argv[2];const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const c=await b.newContext({...devices['Pixel 7'],colorScheme:'dark'});
await c.addInitScript(()=>{ // fake Polar H10
  window.__hr=118; const listeners=[];
  const chr={addEventListener:(t,f)=>listeners.push(f),startNotifications:async()=>{setInterval(()=>{const dv=new DataView(new ArrayBuffer(2));dv.setUint8(0,0);dv.setUint8(1,window.__hr);listeners.forEach(f=>f({target:{value:dv}}));},500);}};
  const dev={name:'Polar H10 ABC123',addEventListener(){},gatt:{connected:false,connect:async function(){this.connected=true;return {getPrimaryService:async()=>({getCharacteristic:async()=>chr})};},disconnect(){this.connected=false;}}};
  Object.defineProperty(navigator,'bluetooth',{value:{requestDevice:async()=>dev}});
});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
await p.tap('[data-tab=settings]');await p.waitForTimeout(300);
await p.tap('#hrBtn');await p.waitForTimeout(1500);
await p.screenshot({path:S+'/h-settings.png'});
const status=await p.textContent('#hrStatus'), live=await p.textContent('#hrLive');
await p.tap('[data-tab=home]');await p.waitForTimeout(200);await p.tap('#gen');await p.waitForTimeout(400);
await p.tap('.sticky-start button');await p.waitForTimeout(1500);
const badge1=await p.evaluate(()=>{const e=document.querySelector('#pHr');return [e.hidden,e.textContent.trim(),e.className]});
await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>{const t=document.querySelector('#toast');if(!t.hidden)window.__toasts.push(t.textContent)}).observe(document.querySelector('#toast'),{attributes:true,childList:true,characterData:true,subtree:true});window.__hr=175;});await p.waitForTimeout(12500);
const toast=await p.evaluate(()=>[...new Set(window.__toasts)].join(' | '));
const badge2=await p.evaluate(()=>{const e=document.querySelector('#pHr');return [e.textContent.trim(),e.className]});
await p.screenshot({path:S+'/h-player.png'});
await p.evaluate(()=>{window.__hr=130;});
// let some time accrue then quit
await p.evaluate(()=>{});await p.waitForTimeout(500);
await p.tap('#pClose');await p.waitForTimeout(400);
const hist=await p.evaluate(()=>JSON.parse(localStorage.getItem('kettlebell.v1')).history.slice(-1)[0]||null);
console.log('status:',status,'| live:',live,'\nbadge start:',JSON.stringify(badge1),'\nbadge high:',JSON.stringify(badge2),'| warning toast:',toast,'\nhistory:',hist?JSON.stringify(hist.hr):'(session <2min, not saved)','\nerrors:',errs.join('\n')||'none');await b.close();})();
