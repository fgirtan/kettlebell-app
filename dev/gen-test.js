global.window=global;global.self=global;require('../js/exercises.js');require('../js/generator.js');
const B=Generator.BACK, back=id=>B[id]||0;
let bad=0,consecBack=0,highInSafe=0,nonStapleRep=0,total=0;
for(const backSafe of [true,false])for(const lvl of [1,2,3])for(const f of ['full','lower','upper','core'])for(const m of [5,10,15,20,30,45,60]){
  const p=Generator.generate({minutes:m,level:lvl,focus:f,backSafe,timing:Generator.LEVEL_TIMING[lvl]});
  const tot=Generator.totalDuration(p); if(tot!==m*60){bad++;}
  for(let i=1;i<p.main.length;i++){total++; if(backSafe&&back(p.main[i])>=1&&back(p.main[i-1])>=1)consecBack++;}
  if(backSafe) highInSafe+=p.main.filter(id=>back(id)>=2).length;
  const c={};p.main.forEach(id=>c[id]=(c[id]||0)+1);for(const[id,n]of Object.entries(c))if(n>1&&!EX[id].staple&&m<=30)nonStapleRep++;
}
console.log('time mismatches',bad,'| consecutive back-load pairs (back-safe)',consecBack,'of',total,'| high-load in back-safe',highInSafe,'| non-staple repeats (<=30min)',nonStapleRep);
for(const lvl of [1,2]){const p=Generator.generate({minutes:30,level:lvl,focus:'full',backSafe:true,timing:Generator.LEVEL_TIMING[lvl]});
 console.log(`\nL${lvl} 30min back-safe (${p.main.length} ex):`);console.log(p.main.map((id,i)=>`${i+1}. ${EX[id].name} [back ${back(id)}]`).join('\n'));}
const p=Generator.generate({minutes:30,level:2,focus:'full',backSafe:false,timing:Generator.LEVEL_TIMING[2]});
console.log('\nL2 30min normal:',p.main.map(id=>EX[id].name+'('+back(id)+')').join(' > '));
