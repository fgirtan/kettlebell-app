global.window=global;require('../js/exercises.js');require('../js/generator.js');
const cfgs=[{},{prep:10,restEvery:2,rest:45},{warmOn:false,coolOn:false},{warmMin:8,coolMin:5},{prep:0,rest:0,roundRest:60},{work:60,rest:30,restEvery:3,prep:15}];
let bad=0;
for(const c of cfgs)for(const lvl of [1,2,3])for(const m of [5,10,15,20,25,30,45,60,90]){
  const p=Generator.generate({minutes:m,level:lvl,focus:'full',timing:Object.assign({},Generator.LEVEL_TIMING[lvl],c)});
  const iv=Generator.buildIntervals(p);const tot=iv.reduce((s,x)=>s+x.dur,0);
  const w=iv.filter(x=>x.phase==='work');const wd=[...new Set(w.map(x=>x.side&&x.side.includes('side')?'u':x.dur))];
  if(tot!==m*60){bad++;console.log('MISMATCH',JSON.stringify(c),lvl,m,tot);}
  if(lvl===2&&[10,30,60].includes(m))console.log(JSON.stringify(c).padEnd(48),m,'min ok | warm',p.warm.length,'cool',p.cool.length,'| blocks',p.blocks.map(b=>b.rounds+'x'+b.ex.length).join(' '),'| work durs',wd.slice(0,6).join(','));
}
console.log('mismatches',bad);
