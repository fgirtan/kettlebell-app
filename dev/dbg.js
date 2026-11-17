global.window=global;require('../js/figure.js');require('../js/anims.js');
const k=process.argv[2], i=+process.argv[3]||0;
const fr=Figure.frames(k)[i].p; console.log(JSON.stringify(fr));
