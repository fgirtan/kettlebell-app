// Keyframe library for exercise animations. See figure.js for angle conventions.
(function (global) {
  const G = 188;
  const m = (...o) => Object.assign({}, ...o);
  // Arm holds relative to torso angle a
  const gob = (a = 0) => ({ u1: 12 + a, f1: 165 + a, kb: 'both', km: 'hang' });
  const rack = (a = 0) => ({ u1: 18 + a, f1: 158 + a, u2: 5, f2: 5, kb: 'near', km: 'rack' });
  const OH = { u1: 178, f1: 180, u2: 5, f2: 5, kb: 'near', km: 'top' };
  const OH2 = { u1: 175, f1: 178, kb: 'both', km: 'top' };
  const hang2 = { u1: 4, f1: 4, kb: 'both', km: 'hang' };
  const side1 = { u1: 0, f1: 0, u2: 3, f2: 3, kb: 'near', km: 'hang' };
  const free = { u1: 8, f1: 12, u2: -6, f2: 0 };
  const HINGE = { s1: -10, t1: 35, a: 70 };
  const DEEP = { s1: -18, t1: 62, a: 52 };
  const SQUAT = { s1: -35, t1: 98, a: 32 };
  const LUNGE = { t1: 84, s1: -6, t2: -10, s2: -92 };
  const SPLIT = { t1: 22, s1: -2, t2: -22, s2: -24 };
  const KNEEL = { root: 'hip', hx: 92, hy: G - 37, t1: 88, s1: 0, t2: -23, s2: -90, a: 0 };
  const SUP = { root: 'hip', hx: 108, hy: G - 9, a: -90, lk1: [150, G] };
  const SUPF = { root: 'hip', hx: 110, hy: G - 9, a: -90, t1: 90, s1: 90 };
  const PLANK = { fx: 32, t1: -64, s1: -64, a: 64 };
  const SIT = { root: 'hip', hx: 92, hy: G - 7, a: -35, t1: 128, s1: 60 };
  const STANDH = { root: 'hip', hx: 100, hy: G - 74 };
  const QUAD = { root: 'hip', hx: 78, hy: G - 38, t1: 0, s1: -90, a: 72, u1: 0, f1: 0 };

  const A = {
    stand: [{ p: free }],

    // ---------- Ballistic hinge ----------
    swing2: [
      { p: m(HINGE, { u1: -25, f1: -25, kb: 'both', km: 'float' }), d: 550 },
      { p: { a: -4, u1: 92, f1: 92, kb: 'both', km: 'float' }, d: 650 },
    ],
    swing1: [
      { p: m(HINGE, { u1: -25, f1: -25, u2: 10, f2: 10, kb: 'near', km: 'float' }), d: 550 },
      { p: { a: -4, u1: 92, f1: 92, u2: 20, f2: 20, kb: 'near', km: 'float' }, d: 650 },
    ],
    swingAlt: [
      { p: m(HINGE, { u1: -25, f1: -25, u2: 10, f2: 10, kb: 'near', km: 'float' }), d: 550 },
      { p: { a: -4, u1: 92, f1: 92, u2: 88, f2: 88, kb: 'near', km: 'float' }, d: 120 },
      { p: { a: -4, u1: 92, f1: 92, u2: 88, f2: 88, kb: 'far', km: 'float' }, d: 650 },
      { p: m(HINGE, { u2: -25, f2: -25, u1: 10, f1: 10, kb: 'far', km: 'float' }), d: 550 },
      { p: { a: -4, u1: 88, f1: 88, u2: 92, f2: 92, kb: 'far', km: 'float' }, d: 120 },
      { p: { a: -4, u1: 88, f1: 88, u2: 92, f2: 92, kb: 'near', km: 'float' }, d: 650 },
    ],
    swingAm: [
      { p: m(HINGE, { u1: -25, f1: -25, kb: 'both', km: 'float' }), d: 650 },
      { p: { a: -6, u1: 178, f1: 178, kb: 'both', km: 'float' }, d: 750 },
    ],
    deadStop: [
      { p: m(DEEP, { ik1: [150, G - 12], kb: 'both', km: 'hang' }), d: 500 },
      { p: m(HINGE, { u1: -25, f1: -25, kb: 'both', km: 'float' }), d: 550 },
      { p: { a: -4, u1: 92, f1: 92, kb: 'both', km: 'float' }, d: 650 },
      { p: m(HINGE, { u1: -25, f1: -25, kb: 'both', km: 'float' }), d: 700 },
    ],
    clean: [
      { p: m(HINGE, { u1: -25, f1: -25, u2: 10, f2: 10, kb: 'near', km: 'float' }), d: 600 },
      { p: m({ a: 0 }, rack()), d: 450 },
      { p: m({ a: 0 }, rack()), d: 400 },
    ],
    deadClean: [
      { p: m(DEEP, { u1: 0, f1: 0, u2: 10, f2: 10, kb: 'near', km: 'hang' }), d: 600 },
      { p: m({ a: 0 }, rack()), d: 450 },
      { p: m({ a: 0 }, rack()), d: 500 },
    ],
    snatch: [
      { p: m(HINGE, { u1: -25, f1: -25, u2: 10, f2: 10, kb: 'near', km: 'float' }), d: 700 },
      { p: m({ a: 0 }, OH), d: 400 },
      { p: m({ a: 0 }, OH), d: 500 },
    ],
    cleanPress: [
      { p: m(HINGE, { u1: -25, f1: -25, u2: 10, f2: 10, kb: 'near', km: 'float' }), d: 600 },
      { p: m({ a: 0 }, rack()), d: 600 },
      { p: m({ a: 0 }, OH), d: 600 },
      { p: m({ a: 0 }, rack()), d: 450 },
    ],

    // ---------- Hinge strength ----------
    deadlift: [
      { p: hang2, d: 900 },
      { p: m(DEEP, { u1: 0, f1: 0, kb: 'both', km: 'hang' }), d: 900 },
    ],
    suitcaseDL: [
      { p: side1, d: 900 },
      { p: m(DEEP, { a: 45, s1: -24, t1: 70 }, side1), d: 900 },
    ],
    rdl: [
      { p: hang2, d: 1000 },
      { p: m({ s1: -6, t1: 32, a: 78 }, { u1: 0, f1: 0, kb: 'both', km: 'hang' }), d: 1000 },
    ],
    sldl: [
      { p: side1, d: 1000 },
      { p: m({ s1: -8, t1: 8, a: 82, t2: -82, s2: -82 }, { u1: 0, f1: 0, u2: 0, f2: 0, kb: 'near', km: 'hang' }), d: 1000 },
    ],
    kickstand: [
      { p: m({ t2: -12, s2: -12 }, hang2), d: 1000 },
      { p: m({ s1: -8, t1: 28, a: 78, t2: -40, s2: -50 }, { u1: 0, f1: 0, kb: 'both', km: 'hang' }), d: 1000 },
    ],
    goodMorning: [
      { p: m({ a: 0 }, gob(0)), d: 1000 },
      { p: m({ s1: -8, t1: 28, a: 72 }, gob(72)), d: 1000 },
    ],
    bridge: [
      { p: m(SUP, { hx: 95, lk1: [136, G], ik1: [96, G - 13], b1: 1, kb: 'both', km: 'on' }), d: 800 },
      { p: { root: 'hip', hx: 84, hy: G - 40, a: -130, lk1: [136, G], ik1: [86, G - 44], b1: 1, kb: 'both', km: 'on' }, d: 800 },
    ],
    bridge1: [
      { p: m(SUP, { hx: 95, lk1: [136, G], t2: 120, s2: 120, ik1: [96, G - 13], ik2: [96, G - 13], kb: 'both', km: 'on' }), d: 800 },
      { p: { root: 'hip', hx: 84, hy: G - 40, a: -130, lk1: [136, G], t2: 120, s2: 120, ik1: [86, G - 44], ik2: [86, G - 44], kb: 'both', km: 'on' }, d: 800 },
    ],

    // ---------- Squat ----------
    goblet: [
      { p: m({ a: 0 }, gob(0)), d: 900 },
      { p: m(SQUAT, gob(32)), d: 900 },
    ],
    gobletPause: [
      { p: m({ a: 0 }, gob(0)), d: 1000 },
      { p: m(SQUAT, gob(32)), d: 900 },
      { p: m(SQUAT, gob(32)), d: 900 },
    ],
    rackSquat: [
      { p: m({ a: 0 }, rack(0)), d: 900 },
      { p: m(SQUAT, rack(32)), d: 900 },
    ],
    sumoSquat: [
      { p: hang2, d: 900 },
      { p: { s1: -22, t1: 88, a: 14, u1: 0, f1: 0, kb: 'both', km: 'hang' }, d: 900 },
    ],
    squatPulse: [
      { p: m(SQUAT, gob(32)), d: 350 },
      { p: m({ s1: -28, t1: 72, a: 26 }, gob(26)), d: 350 },
    ],
    cossack: [
      { p: m({ a: 0 }, gob(0)), d: 900 },
      { p: m({ s1: -35, t1: 100, a: 30, t2: 72, s2: 78 }, gob(30)), d: 900 },
    ],

    // ---------- Lunge ----------
    lunge: [
      { p: m({ a: 0 }, gob(0)), d: 900 },
      { p: m(LUNGE, { a: 4 }, gob(4)), d: 900 },
    ],
    lungeRack: [
      { p: m({ a: 0 }, rack(0)), d: 900 },
      { p: m(LUNGE, { a: 4 }, rack(4)), d: 900 },
    ],
    lungeSuit: [
      { p: side1, d: 900 },
      { p: m(LUNGE, { a: 4 }, side1), d: 900 },
    ],
    lungeOH: [
      { p: m({ a: 0 }, OH), d: 900 },
      { p: m(LUNGE, { a: 2 }, OH), d: 900 },
    ],
    splitSquat: [
      { p: m(SPLIT, { a: 0 }, gob(0)), d: 900 },
      { p: m(LUNGE, { a: 3 }, gob(3)), d: 900 },
    ],
    lungeKnee: [
      { p: m(LUNGE, { a: 6 }, gob(6)), d: 700 },
      { p: m({ a: 0, t2: 95, s2: 5 }, gob(0)), d: 500 },
      { p: m({ a: 0, t2: 95, s2: 5 }, gob(0)), d: 400 },
    ],

    // ---------- Push ----------
    press: [
      { p: m({ a: 0 }, rack()), d: 800 },
      { p: m({ a: 0 }, OH), d: 800 },
    ],
    press2: [
      { p: m({ a: 0 }, gob(0)), d: 800 },
      { p: m({ a: -2 }, OH2), d: 800 },
    ],
    pushPress: [
      { p: m({ a: 0 }, rack()), d: 300 },
      { p: m({ s1: -12, t1: 18, a: 3 }, rack(3)), d: 250 },
      { p: m({ a: 0 }, OH), d: 700 },
      { p: m({ a: 0 }, OH), d: 500 },
    ],
    halfKneelPress: [
      { p: m(KNEEL, rack()), d: 800 },
      { p: m(KNEEL, OH), d: 800 },
    ],
    bottomsUp: [
      { p: m({ a: 0 }, rack(), { km: 'up' }), d: 1000 },
      { p: m({ a: 0 }, OH, { km: 'up' }), d: 1000 },
    ],
    floorPress: [
      { p: m(SUP, { u1: 92, f1: 180, u2: 80, f2: 80, kb: 'near', km: 'top' }), d: 800 },
      { p: m(SUP, { u1: 180, f1: 180, u2: 80, f2: 80, kb: 'near', km: 'top' }), d: 800 },
    ],
    floorPress2: [
      { p: m(SUP, { u1: 100, f1: 175, kb: 'both', km: 'top' }), d: 800 },
      { p: m(SUP, { u1: 178, f1: 178, kb: 'both', km: 'top' }), d: 800 },
    ],
    pushup: [
      { p: m(PLANK, { ik1: [141, G], b1: -1 }), d: 800 },
      { p: { fx: 32, t1: -70, s1: -70, a: 70, ik1: [141, G], b1: -1 }, d: 800 },
    ],

    // ---------- Pull ----------
    row: [
      { p: m({ s1: -12, t1: 42, a: 65 }, { u1: 0, f1: 0, u2: 40, f2: 40, kb: 'near', km: 'hang' }), d: 800 },
      { p: m({ s1: -12, t1: 42, a: 65 }, { u1: -60, f1: 0, u2: 40, f2: 40, kb: 'near', km: 'hang' }), d: 800 },
    ],
    row2: [
      { p: m({ s1: -12, t1: 42, a: 65 }, { u1: 0, f1: 0, kb: 'both', km: 'hang' }), d: 800 },
      { p: m({ s1: -12, t1: 42, a: 65 }, { u1: -55, f1: 5, kb: 'both', km: 'hang' }), d: 800 },
    ],
    plankRow: [
      { p: m(PLANK, { ik1: [141, G - 12], ik2: [141, G], b1: -1, b2: -1, kb: 'near', km: 'under' }), d: 800 },
      { p: m(PLANK, { ik2: [141, G], b2: -1, u1: -150, f1: 0, kb: 'near', km: 'hang' }), d: 800 },
    ],
    highPull: [
      { p: m(DEEP, { a: 45, s1: -22, t1: 65, u1: 0, f1: 0, kb: 'both', km: 'hang' }), d: 600 },
      { p: { a: -2, u1: 80, f1: 215, kb: 'both', km: 'hang' }, d: 600 },
    ],
    uprightRow: [
      { p: hang2, d: 800 },
      { p: { u1: 80, f1: 215, kb: 'both', km: 'hang' }, d: 800 },
    ],
    pullover: [
      { p: m(SUP, { u1: -78, f1: -78, kb: 'both', km: 'float' }), d: 1000 },
      { p: m(SUP, { u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 1000 },
    ],

    // ---------- Arms ----------
    curl: [
      { p: { u1: 4, f1: 4, kb: 'both', km: 'hang' }, d: 800 },
      { p: { u1: 8, f1: 160, kb: 'both', km: 'hang' }, d: 800 },
    ],
    curl1: [
      { p: side1, d: 800 },
      { p: { u1: 6, f1: 160, u2: 3, f2: 3, kb: 'near', km: 'hang' }, d: 800 },
    ],
    triExt: [
      { p: { u1: 172, f1: 178, kb: 'both', km: 'top' }, d: 900 },
      { p: { u1: 168, f1: 10, kb: 'both', km: 'hang' }, d: 900 },
    ],
    skull: [
      { p: m(SUP, { u1: 175, f1: 175, kb: 'both', km: 'top' }), d: 900 },
      { p: m(SUP, { u1: 165, f1: 290, kb: 'both', km: 'hang' }), d: 900 },
    ],
    frontRaise: [
      { p: hang2, d: 900 },
      { p: { u1: 92, f1: 92, kb: 'both', km: 'float' }, d: 900 },
    ],

    // ---------- Core ----------
    russianTwist: [
      { p: m(SIT, { u1: 40, f1: 80, kb: 'both', km: 'hang' }), d: 600 },
      { p: m(SIT, { a: -30, u1: 75, f1: 130, kb: 'both', km: 'hang' }), d: 600 },
    ],
    situp: [
      { p: m(SUP, { u1: 172, f1: 172, kb: 'both', km: 'float' }), d: 900 },
      { p: m(SUP, { a: -18, u1: 110, f1: 110, kb: 'both', km: 'float' }), d: 900 },
    ],
    crunch: [
      { p: m(SUP, { u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 700 },
      { p: m(SUP, { a: -62, u1: 165, f1: 165, kb: 'both', km: 'float' }), d: 700 },
    ],
    halo: [
      { p: { u1: 30, f1: 160, kb: 'both', km: 'hang' }, d: 450 },
      { p: { u1: 150, f1: 225, kb: 'both', km: 'hang' }, d: 450 },
      { p: { u1: 172, f1: 255, kb: 'both', km: 'hang' }, d: 450 },
      { p: { u1: 140, f1: 140, kb: 'both', km: 'hang' }, d: 450 },
    ],
    aroundWorld: [
      { p: { u1: 22, f1: 22, kb: 'both', km: 'hang' }, d: 600 },
      { p: { u1: -22, f1: -22, kb: 'both', km: 'hang' }, d: 600 },
    ],
    fig8: [
      { p: { s1: -15, t1: 48, a: 52, u1: 25, f1: 25, kb: 'both', km: 'hang' }, d: 600 },
      { p: { s1: -15, t1: 48, a: 52, u1: -30, f1: -30, kb: 'both', km: 'hang' }, d: 600 },
    ],
    deadbug: [
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 700 },
      { p: m(SUPF, { t1: 98, s1: 96, t2: 180, s2: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 700 },
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 700 },
      { p: m(SUPF, { t2: 98, s2: 96, t1: 180, s1: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 700 },
    ],
    hollow: [
      { p: m(SUPF, { a: -72, t1: 76, s1: 76, u1: -105, f1: -105, kb: 'both', km: 'float' }), d: 1200 },
      { p: m(SUPF, { a: -76, t1: 80, s1: 80, u1: -100, f1: -100, kb: 'both', km: 'float' }), d: 1200 },
    ],
    vsit: [
      { p: m(SIT, { a: -40, t1: 135, s1: 125, u1: 70, f1: 80, kb: 'both', km: 'hang' }), d: 1200 },
      { p: m(SIT, { a: -45, t1: 130, s1: 120, u1: 75, f1: 85, kb: 'both', km: 'hang' }), d: 1200 },
    ],
    legRaise: [
      { p: m(SUPF, { u1: -90, f1: -90, kb: 'both', km: 'float' }), d: 900 },
      { p: m(SUPF, { t1: 172, s1: 172, u1: -90, f1: -90, kb: 'both', km: 'float' }), d: 900 },
    ],
    plankDrag: [
      { p: m(PLANK, { ik1: [141, G], ik2: [141, G - 2], b1: -1, b2: -1, kb: 'far', km: 'hang' }), d: 800 },
      { p: m(PLANK, { ik2: [141, G], b2: -1, ik1: [112, G - 6], b1: -1, kb: 'near', km: 'hang' }), d: 800 },
    ],
    plank: [
      { p: m(PLANK, { ik1: [141, G], b1: -1 }), d: 1500 },
      { p: m(PLANK, { a: 66, t1: -66, s1: -66, ik1: [141, G], b1: -1 }), d: 1500 },
    ],
    woodchop: [
      { p: { s1: -25, t1: 62, a: 42, u1: 15, f1: 15, kb: 'both', km: 'float' }, d: 700 },
      { p: { a: -5, u1: 160, f1: 160, kb: 'both', km: 'float' }, d: 700 },
    ],
    windmill: [
      { p: { u1: 180, f1: 180, u2: 3, f2: 3, kb: 'near', km: 'top' }, d: 1100 },
      { p: { s1: 0, t1: 22, a: 82, t2: 20, s2: -5, u1: 180, f1: 180, u2: 0, f2: 0, kb: 'near', km: 'top' }, d: 1100 },
    ],

    // ---------- Total body / carries ----------
    thruster: [
      { p: m(SQUAT, rack(32)), d: 650 },
      { p: m({ a: 0 }, OH), d: 500 },
      { p: m({ a: 0 }, rack()), d: 450 },
    ],
    thruster2: [
      { p: m(SQUAT, gob(32)), d: 650 },
      { p: m({ a: -2 }, OH2), d: 500 },
      { p: m({ a: 0 }, gob(0)), d: 450 },
    ],
    carry: [
      { p: m(STANDH, { t1: 55, s1: 0 }, side1), d: 400 },
      { p: m(STANDH, side1), d: 400 },
      { p: m(STANDH, { t2: 55, s2: 0 }, side1), d: 400 },
      { p: m(STANDH, side1), d: 400 },
    ],
    rackMarch: [
      { p: m(STANDH, { t1: 70, s1: 0 }, rack()), d: 450 },
      { p: m(STANDH, rack()), d: 450 },
      { p: m(STANDH, { t2: 70, s2: 0 }, rack()), d: 450 },
      { p: m(STANDH, rack()), d: 450 },
    ],
    ohMarch: [
      { p: m(STANDH, { t1: 60, s1: 0 }, OH), d: 450 },
      { p: m(STANDH, OH), d: 450 },
      { p: m(STANDH, { t2: 60, s2: 0 }, OH), d: 450 },
      { p: m(STANDH, OH), d: 450 },
    ],
    tgu: [
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -90, lk1: [148, G], t2: 88, s2: 88, u1: 180, f1: 180, u2: 80, f2: 80, kb: 'near', km: 'top' }, d: 900 },
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -55, lk1: [148, G], t2: 88, s2: 88, u1: 180, f1: 180, ik2: [70, G - 2], b2: 1, kb: 'near', km: 'top' }, d: 800 },
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -28, lk1: [148, G], t2: 88, s2: 88, u1: 180, f1: 180, ik2: [72, G], b2: 1, kb: 'near', km: 'top' }, d: 800 },
      { p: { root: 'hip', hx: 112, hy: G - 42, a: -68, lk1: [150, G], t2: 62, s2: 72, u1: 180, f1: 180, ik2: [68, G], b2: 1, kb: 'near', km: 'top' }, d: 900 },
      { p: { root: 'hip', hx: 112, hy: G - 37, a: -30, lk1: [150, G], lk2: [80, G - 2], lb2: -1, u1: 180, f1: 180, ik2: [72, G], b2: 1, kb: 'near', km: 'top' }, d: 800 },
      { p: { root: 'hip', hx: 112, hy: G - 37, a: 0, lk1: [150, G], lk2: [76, G - 2], lb2: -1, u1: 180, f1: 180, u2: 5, f2: 5, kb: 'near', km: 'top' }, d: 800 },
      { p: { root: 'hip', hx: 130, hy: G - 74, a: 0, t1: 0, s1: 0, u1: 180, f1: 180, u2: 5, f2: 5, kb: 'near', km: 'top' }, d: 900 },
    ],

    // ---------- Warm-up (body weight) ----------
    armCircles: [
      { p: { u1: 0, f1: 0, u2: 0, f2: 0 }, d: 500 },
      { p: { u1: 120, f1: 120 }, d: 500 },
      { p: { u1: 240, f1: 240 }, d: 500 },
      { p: { u1: 360, f1: 360 }, d: 0 },
    ],
    haloBW: [
      { p: { u1: 30, f1: 160 }, d: 450 },
      { p: { u1: 150, f1: 225 }, d: 450 },
      { p: { u1: 172, f1: 255 }, d: 450 },
      { p: { u1: 140, f1: 140 }, d: 450 },
    ],
    hipCircles: [
      { p: { t1: 8, s1: -8, a: -6, u1: -25, f1: 70 }, d: 600 },
      { p: { t1: -6, s1: 6, a: 8, u1: -25, f1: 70 }, d: 600 },
    ],
    bwSquat: [
      { p: { u1: 10, f1: 10 }, d: 900 },
      { p: m(SQUAT, { u1: 90, f1: 90 }), d: 900 },
    ],
    goodMorningBW: [
      { p: { u1: 20, f1: 155 }, d: 1000 },
      { p: { s1: -8, t1: 28, a: 72, u1: 92, f1: 227 }, d: 1000 },
    ],
    bwLunge: [
      { p: { u1: -25, f1: 70 }, d: 900 },
      { p: m(LUNGE, { a: 3, u1: -22, f1: 73 }), d: 900 },
    ],
    worldsGreatest: [
      { p: { u1: 5, f1: 5 }, d: 900 },
      { p: { t1: 92, s1: -20, t2: -62, s2: -62, a: 55, u1: 0, f1: 0, u2: 0, f2: 0 }, d: 800 },
      { p: { t1: 92, s1: -20, t2: -62, s2: -62, a: 55, u1: 165, f1: 165, u2: 0, f2: 0 }, d: 900 },
      { p: { t1: 92, s1: -20, t2: -62, s2: -62, a: 55, u1: 0, f1: 0, u2: 0, f2: 0 }, d: 800 },
    ],
    march: [
      { p: m(STANDH, { t1: 80, s1: 0, u1: -30, f1: 60, u2: 30, f2: 120 }), d: 350 },
      { p: m(STANDH, { u1: 0, f1: 60, u2: 0, f2: 60 }), d: 350 },
      { p: m(STANDH, { t2: 80, s2: 0, u2: -30, f2: 60, u1: 30, f1: 120 }), d: 350 },
      { p: m(STANDH, { u1: 0, f1: 60, u2: 0, f2: 60 }), d: 350 },
    ],
    inchworm: [
      { p: { fx: 40, u1: 0, f1: 0 }, d: 800 },
      { p: { fx: 40, s1: 0, t1: 0, a: 125, ik1: [92, G], b1: 1 }, d: 900 },
      { p: { fx: 40, t1: -64, s1: -64, a: 64, ik1: [147, G], b1: -1 }, d: 900 },
      { p: { fx: 40, s1: 0, t1: 0, a: 125, ik1: [92, G], b1: 1 }, d: 800 },
    ],
    birdDog: [
      { p: QUAD, d: 700 },
      { p: m(QUAD, { u1: 92, f1: 92, t2: -88, s2: -88 }), d: 900 },
      { p: QUAD, d: 700 },
      { p: m(QUAD, { u2: 92, f2: 92, u1: 0, f1: 0, t1: -88, s1: -88, t2: 0, s2: -90 }), d: 900 },
    ],
    bwBridge: [
      { p: m(SUP, { hx: 95, lk1: [136, G], u1: 90, f1: 90 }), d: 800 },
      { p: { root: 'hip', hx: 84, hy: G - 40, a: -130, lk1: [136, G], u1: 50, f1: 50 }, d: 800 },
    ],

    // ---------- Stretches ----------
    fold: [
      { p: { s1: 0, t1: 6, a: 112, u1: 0, f1: 0 }, d: 2000 },
      { p: { s1: 0, t1: 8, a: 120, u1: -5, f1: -5 }, d: 2000 },
    ],
    childPose: [
      { p: { root: 'hip', hx: 72, hy: G - 16, lk1: [78, G - 2], lb1: 1, a: 100, u1: 88, f1: 92 }, d: 2200 },
      { p: { root: 'hip', hx: 72, hy: G - 19, lk1: [78, G - 2], lb1: 1, a: 96, u1: 86, f1: 92 }, d: 2200 },
    ],
    cobra: [
      { p: { root: 'hip', hx: 80, hy: G - 6, t1: -90, s1: -90, a: 68, ik1: [118, G], b1: -1 }, d: 1800 },
      { p: { root: 'hip', hx: 80, hy: G - 6, t1: -90, s1: -90, a: 42, ik1: [118, G], b1: -1 }, d: 1800 },
    ],
    downDog: [
      { p: { fx: 52, s1: -35, t1: -35, a: 125, u1: 55, f1: 55 }, d: 2000 },
      { p: { fx: 52, s1: -38, t1: -36, a: 128, u1: 52, f1: 52 }, d: 2000 },
    ],
    hipFlexor: [
      { p: m(KNEEL, { u1: 170, f1: 172 }), d: 2000 },
      { p: m(KNEEL, { hx: 96, a: -6, u1: 172, f1: 176 }), d: 2000 },
    ],
    quadStretch: [
      { p: m(STANDH, { s2: -168, ik2: [93, G - 70], b2: -1, u1: 10, f1: 10 }), d: 2000 },
      { p: m(STANDH, { t2: -6, s2: -172, ik2: [90, G - 70], b2: -1, u1: 12, f1: 12 }), d: 2000 },
    ],
    chestStretch: [
      { p: { u1: -38, f1: -38 }, d: 1800 },
      { p: { u1: -50, f1: -50, a: -3 }, d: 1800 },
    ],
    seatedFold: [
      { p: { root: 'hip', hx: 62, hy: G - 8, t1: 90, s1: 90, a: 50, u1: 80, f1: 80 }, d: 2000 },
      { p: { root: 'hip', hx: 62, hy: G - 8, t1: 90, s1: 90, a: 62, u1: 85, f1: 85 }, d: 2000 },
    ],
    kneeHug: [
      { p: { root: 'hip', hx: 110, hy: G - 9, a: -90, t1: 205, s1: 100, ik1: [92, G - 46], b1: 1 }, d: 1800 },
      { p: { root: 'hip', hx: 110, hy: G - 9, a: -86, t1: 212, s1: 105, ik1: [90, G - 48], b1: 1 }, d: 1800 },
    ],
    shoulderStretch: [
      { p: { u1: 88, f1: 88, u2: 40, f2: 110 }, d: 1800 },
      { p: { u1: 84, f1: 84, u2: 42, f2: 112 }, d: 1800 },
    ],
    deepSquat: [
      { p: m(SQUAT, { s1: -40, t1: 110, a: 28, u1: 40, f1: 150 }), d: 2000 },
      { p: m(SQUAT, { s1: -42, t1: 114, a: 26, u1: 42, f1: 152 }), d: 2000 },
    ],
    // ---------- Back-friendly additions ----------
    rowSup: [
      { p: { s1: -8, t1: 28, a: 45, u1: 0, f1: 0, u2: 38, f2: 28, kb: 'near', km: 'hang' }, d: 900 },
      { p: { s1: -8, t1: 28, a: 45, u1: -58, f1: 4, u2: 38, f2: 28, kb: 'near', km: 'hang' }, d: 900 },
    ],
    standPullover: [
      { p: { u1: 188, f1: 188, a: 0, kb: 'both', km: 'float' }, d: 1100 },
      { p: { u1: 95, f1: 95, a: 0, kb: 'both', km: 'float' }, d: 1100 },
    ],
    haloKneel: [
      { p: { root: 'hip', hx: 100, hy: G - 40, t1: 0, s1: -90, a: 0, u1: 30, f1: 160, kb: 'both', km: 'hang' }, d: 500 },
      { p: { root: 'hip', hx: 100, hy: G - 40, t1: 0, s1: -90, a: 0, u1: 150, f1: 225, kb: 'both', km: 'hang' }, d: 500 },
      { p: { root: 'hip', hx: 100, hy: G - 40, t1: 0, s1: -90, a: 0, u1: 172, f1: 255, kb: 'both', km: 'hang' }, d: 500 },
      { p: { root: 'hip', hx: 100, hy: G - 40, t1: 0, s1: -90, a: 0, u1: 140, f1: 140, kb: 'both', km: 'hang' }, d: 500 },
    ],
    boxSquat: [
      { p: m({ a: 0 }, gob(0)), d: 1100 },
      { p: m({ s1: -22, t1: 86, a: 22 }, gob(22)), d: 700 },
      { p: m({ s1: -22, t1: 86, a: 22 }, gob(22)), d: 800 },
    ],
    deadbugPull: [
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 1100 },
      { p: m(SUPF, { t1: 98, s1: 96, t2: 180, s2: 90, u1: -100, f1: -100, kb: 'both', km: 'float' }), d: 1100 },
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180, kb: 'both', km: 'float' }), d: 1100 },
      { p: m(SUPF, { t2: 98, s2: 96, t1: 180, s1: 90, u1: -100, f1: -100, kb: 'both', km: 'float' }), d: 1100 },
    ],

    pressOut: [
      { p: m({ a: 0 }, gob(0)), d: 900 },
      { p: { a: -2, u1: 88, f1: 90, kb: 'both', km: 'float' }, d: 900 },
      { p: { a: -2, u1: 88, f1: 90, kb: 'both', km: 'float' }, d: 700 },
    ],
    standCrunch: [
      { p: { u1: 150, f1: 255 }, d: 500 },
      { p: { t1: 88, s1: 0, a: 12, u1: 70, f1: 150, u2: 150, f2: 255 }, d: 500 },
      { p: { u1: 150, f1: 255 }, d: 500 },
      { p: { t2: 88, s2: 0, a: 12, u2: 70, f2: 150, u1: 150, f1: 255 }, d: 500 },
    ],
    // ---------- Recovery (quiet, body weight) ----------
    breathArms: [
      { p: { u1: 4, f1: 4 }, d: 3200 },
      { p: { u1: 172, f1: 175, a: -3, hd: -10 }, d: 3800 },
    ],
    neckRolls: [
      { p: { u1: 2, f1: 2, hd: 45 }, d: 1800 },
      { p: { u1: 2, f1: 2, hd: -35 }, d: 1800 },
    ],
    shoulderRolls: [
      { p: { u1: 10, f1: 8, a: 2 }, d: 600 },
      { p: { u1: -2, f1: 0, a: -2, hd: -4 }, d: 600 },
      { p: { u1: -12, f1: -8, a: 0 }, d: 600 },
      { p: { u1: 0, f1: 2, a: 1 }, d: 600 },
    ],
    calfStretch: [
      { p: { t1: 34, s1: -24, t2: -28, s2: -28, a: 26, u1: 76, f1: 76 }, d: 2200 },
      { p: { t1: 40, s1: -28, t2: -30, s2: -30, a: 30, u1: 72, f1: 72 }, d: 2200 },
    ],
    catCow: [
      { p: m(QUAD, { a: 80, hd: 32 }), d: 2200 },
      { p: m(QUAD, { a: 66, hd: -28 }), d: 2200 },
    ],
    threadNeedle: [
      { p: QUAD, d: 1800 },
      { p: m(QUAD, { a: 88, hd: 25, u1: -84, f1: -88 }), d: 2400 },
    ],
    lizard: [
      { p: { t1: 96, s1: -22, t2: -48, s2: -86, a: 52, ik1: [92, G], b1: -1 }, d: 2200 },
      { p: { t1: 100, s1: -26, t2: -52, s2: -86, a: 60, ik1: [96, G], b1: -1 }, d: 2200 },
    ],
    pigeon: [
      { p: { root: 'hip', hx: 92, hy: G - 14, t1: 80, s1: -90, t2: -80, s2: -88, a: 10, ik1: [114, G], b1: 1 }, d: 2400 },
      { p: { root: 'hip', hx: 92, hy: G - 14, t1: 80, s1: -90, t2: -80, s2: -88, a: 62, u1: 88, f1: 92 }, d: 2600 },
    ],
    butterfly: [
      { p: { root: 'hip', hx: 86, hy: G - 8, t1: 110, s1: -60, a: 5, ik1: [96, G - 6], b1: 1 }, d: 2200 },
      { p: { root: 'hip', hx: 86, hy: G - 8, t1: 112, s1: -60, a: 36, ik1: [100, G - 4], b1: 1 }, d: 2400 },
    ],
    seatedTwist: [
      { p: { root: 'hip', hx: 86, hy: G - 8, t1: 110, s1: -60, a: -4, u1: 60, f1: 110, ik2: [62, G], b2: 1 }, d: 2400 },
      { p: { root: 'hip', hx: 86, hy: G - 8, t1: 110, s1: -60, a: -8, u1: -40, f1: -20, ik2: [104, G - 12], b2: -1 }, d: 2400 },
    ],
    sphinx: [
      { p: { root: 'hip', hx: 80, hy: G - 6, t1: -90, s1: -90, a: 60, u1: 10, f1: 90 }, d: 2200 },
      { p: { root: 'hip', hx: 80, hy: G - 6, t1: -90, s1: -90, a: 55, u1: 14, f1: 90, hd: -8 }, d: 2200 },
    ],
    figure4: [
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -90, lk1: [150, G], t2: 140, s2: 92, ik1: [128, G - 30], b1: 1 }, d: 2200 },
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -90, lk1: [144, G - 6], t2: 146, s2: 92, ik1: [126, G - 34], b1: 1 }, d: 2200 },
    ],
    happyBaby: [
      { p: { root: 'hip', hx: 110, hy: G - 9, a: -90, t1: 200, s1: 172, ik1: [97, G - 44], b1: 1 }, d: 2000 },
      { p: { root: 'hip', hx: 110, hy: G - 9, a: -90, t1: 192, s1: 168, t2: 208, s2: 176, ik1: [99, G - 46], ik2: [95, G - 44], b1: 1, b2: 1 }, d: 2000 },
    ],
    supineTwist: [
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -90, t1: 150, s1: 96, u1: -95, f1: -95 }, d: 2400 },
      { p: { root: 'hip', hx: 108, hy: G - 9, a: -90, t1: 128, s1: 70, t2: 134, s2: 76, u1: -95, f1: -95, hd: 10 }, d: 2400 },
    ],
    deadbugBW: [
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180 }), d: 1400 },
      { p: m(SUPF, { t1: 98, s1: 96, t2: 180, s2: 90, u1: 180, f1: 180, u2: -95, f2: -95 }), d: 1400 },
      { p: m(SUPF, { t1: 180, s1: 90, u1: 180, f1: 180 }), d: 1400 },
      { p: m(SUPF, { t2: 98, s2: 96, t1: 180, s1: 90, u2: 180, f2: 180, u1: -95, f1: -95 }), d: 1400 },
    ],
    legsWall: [
      { p: m(SUPF, { t1: 180, s1: 180, u1: 92, f1: 92 }), d: 3000 },
      { p: m(SUPF, { hy: G - 10, t1: 178, s1: 178, u1: 92, f1: 92 }), d: 3000 },
    ],
    corpse: [
      { p: m(SUPF, { t1: 92, s1: 90, u1: 92, f1: 92 }), d: 3500 },
      { p: m(SUPF, { hy: G - 10, t1: 92, s1: 90, u1: 92, f1: 92, a: -88 }), d: 3500 },
    ],
  };

  // Which keyframe best represents an exercise in a static thumbnail
  const PEAK = { thruster: 0, thruster2: 0, deadStop: 2, worldsGreatest: 2, tgu: 3, lungeKnee: 1, clean: 1, snatch: 1, cleanPress: 2, pushPress: 2, swingAlt: 1, inchworm: 2 };

  global.ANIMS = A;
  global.ANIM_PEAK = PEAK;
})(window);
