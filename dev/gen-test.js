global.window=global;require('../js/exercises.js');require('../js/generator.js');
console.log('exercises:',EXERCISES.length, Object.entries(EXERCISES.reduce((a,e)=>(a[e.cat]=(a[e.cat]||0)+1,a),{})).map(x=>x.join(':')).join(' '));
for(const lvl of [1,2,3])for(const m of [5,10,15,20,30,45,60]){
  const p=Generator.generate({minutes:m,level:lvl,focus:'full'});
  const tot=Generator.totalDuration(p);
  console.log(`L${lvl} ${m}min -> ${(tot/60).toFixed(1)}min warm ${p.warm.length}x${p.warmDur} cool ${p.cool.length}x${p.coolDur} | `+p.blocks.map(b=>`${b.rounds}x[`+b.ex.map(id=>EX[id].ro.split(' (')[0]+'('+EX[id].region[0]+')').join(' > ')+']').join(' || '));
}
for(const f of ['lower','upper','core']){const p=Generator.generate({minutes:30,level:2,focus:f});console.log(f, p.blocks.map(b=>b.ex.join(',')).join(' || '));}
