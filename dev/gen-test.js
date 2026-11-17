global.window=global;require('../js/exercises.js');require('../js/generator.js');
const cfgs=[{},{prep:10,rest:60,restEvery:4},{warmOn:false,coolOn:false},{warmMin:8,coolMin:5},{prep:0,rest:0},{work:60,restEvery:8,prep:15,switch:5},{restEvery:1}];
let bad=0,badRepeat=0;
for(const c of cfgs)for(const lvl of [1,2,3])for(const f of ['full','lower','upper','core'])for(const m of [5,10,15,20,30,45,60,90]){
  const p=Generator.generate({minutes:m,level:lvl,focus:f,timing:Object.assign({},Generator.LEVEL_TIMING[lvl],c)});
  const tot=Generator.totalDuration(p); if(tot!==m*60){bad++;console.log('MISMATCH',JSON.stringify(c),lvl,f,m,tot);}
  const all=p.segments.flat();const cnt={};all.forEach(id=>cnt[id]=(cnt[id]||0)+1);
  for(const [id,n] of Object.entries(cnt)) if(n>1&&!EX[id].staple&&m<=45){badRepeat++; if(badRepeat<6)console.log('non-staple repeat',id,n,lvl,f,m);}
}
console.log('time mismatches',bad,'non-staple repeats',badRepeat);
for(const lvl of [1,2]){ let prev=null;
 for(let k=0;k<3;k++){const p=Generator.generate({minutes:30,level:lvl,focus:'full',timing:Generator.LEVEL_TIMING[lvl],recent:prev||[]});
  const all=p.segments.flat(); prev=(prev||[]).concat(all);
  const iv=Generator.buildIntervals(p);const work=iv.filter(x=>x.phase==='work').reduce((s,x)=>s+x.dur,0);
  console.log(`L${lvl} #${k+1}: ${all.length} ex, ${new Set(all).size} unique, work ${(work/60).toFixed(1)}min`);
  p.segments.forEach((s,i)=>console.log('   C'+(i+1)+': '+s.map(id=>EX[id].name).join(' > ')));}
}
