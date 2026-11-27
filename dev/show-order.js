// Print generated workouts with category / muscles, to judge the order. Usage: node dev/show-order.js [n] [minutes] [focus]
const path = require('path');
global.window = global; global.self = global;
global.document = { createElementNS: () => ({ setAttribute() {}, appendChild() {}, style: {} }) };
['voice-index', 'photos', 'figure', 'anims', 'exercises', 'exercises-lib', 'generator'].forEach((f) => require(path.join(__dirname, '..', 'js', f + '.js')));
const n = +process.argv[2] || 2, minutes = +process.argv[3] || 30, focus = process.argv[4] || 'full';
for (let k = 0; k < n; k++) {
  const p = Generator.generate({ minutes, level: 1, focus, backSafe: true, lowFloor: true, timing: Generator.DEFAULT_TIMING });
  console.log(`--- workout ${k + 1}`);
  p.main.forEach((id, i) => { const e = EX[id]; console.log(String(i + 1).padStart(2), Generator.groupOf(e).padEnd(9), e.cat.padEnd(9), e.name.padEnd(34), e.muscles.join(',')); });
}
