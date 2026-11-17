const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{const b=await chromium.launch();const dir=path.resolve(__dirname,'../icons');
const jobs=[['icon.svg',192,'icon-192.png'],['icon.svg',512,'icon-512.png'],['maskable.svg',512,'maskable-512.png'],['maskable.svg',180,'apple-touch-icon.png']];
for(const [src,s,out] of jobs){const p=await b.newPage({viewport:{width:s,height:s}});const svg=fs.readFileSync(path.join(dir,src),'utf8');
await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ','<svg width="'+s+'" height="'+s+'" ')}</body></html>`);
await p.screenshot({path:path.join(dir,out),omitBackground:true});await p.close();}
await b.close();console.log('icons ok');})();
