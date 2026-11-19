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
// minimal-floor check
{ const FL=new Set(['w_inch','w_birddog','w_bridge','s_cobra','s_child','s_seated','s_knees','s_dog','s_hipflex']);
  const POS={}; let worst=0, wcFloor=0, early=0;
  const isFloor=id=>{const e=EX[id];return e.floor||['halfKneelPress','haloKneel','pushup','plankRow','plankDrag','plank','russianTwist','vsit','tgu','birdDog','floorPress','floorPress2','pullover','skull','situp','crunch','deadbug','hollow','legRaise','bridge','bridge1','deadbugPull'].includes(e.anim)};
  for(const lvl of [1,2,3])for(const m of [10,20,30,45,60])for(let k=0;k<20;k++){const p=Generator.generate({minutes:m,level:lvl,focus:'full',timing:Generator.LEVEL_TIMING[lvl]});
    const fl=p.main.map((id,i)=>[id,i]).filter(([id])=>isFloor(id)); worst=Math.max(worst,fl.length);
    fl.forEach(([id,i])=>{ if(p.main.slice(i+1).some(x=>!isFloor(x))) early++; });
    wcFloor+=p.warm.concat(p.cool).filter(id=>FL.has(id)).length; if(Generator.totalDuration(p)!==m*60) console.log('TIME!');}
  console.log('minimal floor: max floor moves in a workout',worst,'| floor moves followed by standing ones',early,'| floor warm/cool moves',wcFloor);
  const p=Generator.generate({minutes:30,level:1,focus:'full',timing:Generator.LEVEL_TIMING[1]});
  console.log('L1 30min:',p.main.map(id=>EX[id].name).join(' > '));console.log('warm:',p.warm.map(id=>EX[id].name).join(', '),'| cool:',p.cool.map(id=>EX[id].name).join(', '));}
