const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const [,, file, out, k] = process.argv;
await p.goto('file://'+file+(k?'?k='+k:''));await p.waitForTimeout(300);
await p.screenshot({path:out,fullPage:true});console.log(errs.join('\n')||'ok');await b.close();})();
