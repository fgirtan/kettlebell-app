// Workout generator: one continuous sequence of exercises + rests that fits the selected total time exactly.
//
// How the order is built (inspired by common full-body kettlebell programming):
//  * Every exercise belongs to one muscle group. Groups follow each other in body order – legs → hips/glutes →
//    core → back → shoulders/chest → arms → a total-body move that leads back to the legs – so each step moves
//    to the neighbouring area, the same group never comes twice in a row, and every area rests before it is
//    used again. The session opens with simple two-sided moves for the big muscles.
//  * Lower-back load is tracked for every exercise. Two back-loading moves are never placed back to back,
//    and in back-friendly mode (default) high-load moves (swings, cleans, snatches, good mornings, bent-over
//    holds…) are left out entirely; hinges become deadlifts, glute bridges and kickstand variations.
//  * Intensity builds gradually: simple, controlled moves first, the most demanding work in the middle,
//    calmer floor/core work at the end.
//  * Each move starts where the last one ended (bell at the hips → chest → racked → overhead → floor),
//    so there is little getting up and down.
(function (global) {
  const LEVEL_TIMING = {
    1: { work: 30, rest: 45, restEvery: 5 },
    2: { work: 40, rest: 40, restEvery: 6 },
    3: { work: 45, rest: 30, restEvery: 6 },
  };
  const DEFAULT_TIMING = Object.assign({ prep: 5, switch: 2, warmOn: true, warmMin: 0, coolOn: true, coolMin: 0 }, LEVEL_TIMING[1]);

  // Muscle group of an exercise (its main target), from its category and first-listed muscle
  const GROUP_LABEL = { legs: 'Legs', hips: 'Hips & glutes', core: 'Core', back: 'Back', shoulders: 'Shoulders', chest: 'Chest', arms: 'Arms', total: 'Total body' };
  function groupOf(e) {
    if (!e) return null;
    if (e.group) return e.group;
    const m = e.muscles[0];
    switch (e.cat) {
      case 'squat': case 'lunge': return 'legs';
      case 'hinge': case 'ballistic': return 'hips';
      case 'pull': return m === 'shoulders' || m === 'traps' ? 'shoulders' : 'back';
      case 'push': return m === 'chest' ? 'chest' : m === 'triceps' ? 'arms' : 'shoulders';
      case 'arms': return m === 'shoulders' ? 'shoulders' : 'arms';
      case 'core': return m === 'shoulders' ? 'shoulders' : 'core';
      case 'total': return 'total';
      default: return null;
    }
  }
  // Body order: each group sits next to the ones it flows into
  const PATTERNS = {
    full: ['legs', 'hips', 'core', 'back', 'shoulders', 'arms', 'total'],
    lower: ['legs', 'hips', 'core', 'legs', 'hips', 'core', 'back', 'shoulders'],
    upper: ['back', 'shoulders', 'arms', 'core', 'legs', 'back', 'chest', 'arms', 'core', 'hips'],
    core: ['legs', 'core', 'hips', 'core', 'back', 'core', 'shoulders', 'core'],
  };
  // Occasional variety: some rounds swap a slot for a neighbouring group
  const VARIANTS = { shoulders: ['chest'], arms: ['shoulders', 'back'], total: ['legs'] };
  const FALLBACK = { legs: ['total'], hips: ['legs'], core: ['total'], back: ['arms'], shoulders: ['chest', 'arms'], chest: ['shoulders', 'arms'], arms: ['shoulders', 'back'], total: ['legs', 'core'] };
  // neighbouring groups in body order (used when Skip picks a different group)
  const ADJ = { legs: ['hips', 'total', 'core'], hips: ['legs', 'core'], core: ['hips', 'back', 'legs'], back: ['core', 'shoulders', 'arms'], shoulders: ['back', 'arms', 'chest'], chest: ['shoulders', 'arms'], arms: ['shoulders', 'back', 'chest'], total: ['legs', 'core'] };
  const CAT_SLOT = { squat: 'legs', lunge: 'legs', push: 'shoulders', hinge: 'hips', ballistic: 'hips', pull: 'back', core: 'core', arms: 'arms', total: 'total' };
  const FOCUS_SHORT = { full: 'Full body', lower: 'Legs', upper: 'Upper body', core: 'Core' };
  const FOCUS_LABEL = { full: 'Full body', lower: 'Legs focus', upper: 'Upper body focus', core: 'Core focus' };

  // Lower-back load: 0 = low, 1 = moderate, 2 = high (left out in back-friendly mode)
  const BACK = {
    swing2: 2, swing1: 2, swingAlt: 2, deadStop: 2, swingAm: 2, cleanHang: 2, deadClean: 2, snatch: 2, cleanPress: 2,
    rdl: 2, goodMorning: 2, row2: 2, highPull: 2, fig8: 2, windmill: 2, woodchop: 2, situp: 1, russianTwist: 1, vsit: 1, legRaise: 1,
    deadlift: 1, sumoDL: 1, suitcaseDL: 1, kickstand: 1, sldl: 1, row: 1, plankRow: 1, pushPress: 1, thruster: 1, thruster2: 1,
    goblet: 1, gobletPause: 1, squatPulse: 1, rackSquat: 1, sumoSquat: 1, cossack: 1, revLunge: 1, fwdLunge: 1, splitSquat: 1,
    rackLunge: 1, suitLunge: 1, ohLunge: 2, lungeKnee: 1, latLunge: 1, curtsy: 1, press: 0, press2: 0, bottomsUp: 0, triExt: 1,
    carry: 1, rackMarch: 1, ohMarch: 1, tgu: 1, uprightRow: 0, boxSquat: 0, supRow: 0, standPull: 0, sideBend: 1, ohSideBend: 1, squatHold: 1, squatLift: 1, passUnderLunge: 1,
  };
  const back = (e) => (e.back !== undefined ? e.back : BACK[e.id] || 0);
  // small accessory moves shouldn't crowd out the main lifts
  const PICK_WEIGHT = { calfRaise: 0.3, lateralRaise: 0.6, frontRaise: 0.6, curl: 0.8, curl1: 0.8 };

  // Body / kettlebell position at the start and end of each movement
  const POS = {
    swing2: 'hang', swing1: 'hang', swingAlt: 'hang', swingAm: 'hang', deadStop: 'hang', clean: ['hang', 'rack'], deadClean: ['hang', 'rack'],
    snatch: ['hang', 'oh'], cleanPress: ['hang', 'rack'], deadlift: 'hang', suitcaseDL: 'hang', rdl: 'hang', sldl: 'hang', kickstand: 'hang',
    goodMorning: 'goblet', bridge: 'supine', bridge1: 'supine', goblet: 'goblet', gobletPause: 'goblet', rackSquat: 'rack', sumoSquat: 'hang',
    squatPulse: 'goblet', cossack: 'goblet', lunge: 'goblet', lungeRack: 'rack', lungeSuit: 'hang', lungeOH: 'oh', splitSquat: 'goblet',
    lungeKnee: 'goblet', press: 'rack', press2: 'goblet', pushPress: 'rack', halfKneelPress: 'kneel', bottomsUp: 'rack', floorPress: 'supine',
    floorPress2: 'supine', pushup: 'prone', row: 'hang', row2: 'hang', plankRow: 'prone', highPull: 'hang', uprightRow: 'hang',
    pullover: 'supine', curl: 'hang', curl1: 'hang', triExt: 'goblet', skull: 'supine', frontRaise: 'hang', russianTwist: 'seated',
    situp: 'supine', crunch: 'supine', halo: 'goblet', aroundWorld: 'hang', fig8: 'hang', deadbug: 'supine', hollow: 'supine', vsit: 'seated',
    legRaise: 'supine', plankDrag: 'prone', plank: 'prone', woodchop: 'hang', windmill: 'oh', thruster: 'rack', thruster2: 'goblet',
    carry: 'hang', rackMarch: 'rack', ohMarch: 'oh', tgu: 'supine',
    pressOut: 'goblet', standCrunch: 'hang', sideBend: 'hang', ohSideBend: 'oh', standSideCrunch: 'hang', lateralRaise: 'hang', frontalHold: 'goblet', gobletMarch: 'goblet', squatHold: 'goblet', chairPress: 'rack', squatLift: 'hang', passUnderLunge: 'hang', calfRaise: 'hang', rowSup: 'hang', standPullover: 'goblet', haloKneel: 'kneel', boxSquat: 'goblet', deadbugPull: 'supine', birdDog: 'prone',
  };
  const STANDING = new Set(['hang', 'goblet', 'rack', 'oh']);
  const NEAR = new Set(['hang|goblet', 'goblet|rack', 'rack|oh', 'goblet|kneel', 'rack|kneel', 'supine|seated', 'supine|prone', 'prone|seated', 'kneel|prone']);
  const startPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[0] : p; };
  const endPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[1] : p; };
  const baseName = (e) => e.name.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase();
  const onFloor = (e) => !!e.floor || !STANDING.has(startPos(e));
  function posCost(a, b) {
    if (a === b) return 0;
    if (NEAR.has(a + '|' + b) || NEAR.has(b + '|' + a)) return 1;
    const fa = STANDING.has(a) ? 's' : a === 'kneel' ? 'k' : 'f';
    const fb = STANDING.has(b) ? 's' : b === 'kneel' ? 'k' : 'f';
    if (fa === fb) return 1.5;
    if (fa === 'k' || fb === 'k') return 2;
    return 4; // standing <-> floor
  }

  // Warm-up / cool-down moves done on the floor (left out in minimal-floor mode)
  const FLOOR_WC = new Set(['w_inch', 'w_birddog', 'w_bridge', 's_cobra', 's_child', 's_seated', 's_knees', 's_dog', 's_hipflex']);
  // Standing recovery moves that can extend the cool-down when floor work is kept to a minimum
  const STANDING_COOL_EXTRA = ['r_calf', 'r_neck', 'r_shoulder', 'r_breath'];
  const WARM_MUST = ['w_march', 'w_wgs'];
  const COOL_MUST = ['s_fold', 's_child'];
  const IGNORE_MUSCLE = new Set(['cardio', 'core', 'balance', 'mobility']);

  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const weightedPick = (items) => {
    let r = Math.random() * items.reduce((s, x) => s + x[1], 0);
    for (const [e, w] of items) { r -= w; if (r <= 0) return e; }
    return items.length ? items[items.length - 1][0] : null;
  };

  let twoBells = false; // set per generation: include exercises that need two kettlebells
  function allowed(e, level, backSafe) {
    if (e.eq === 2 && !twoBells) return false;
    return e.level <= level && !['warmup', 'stretch', 'recovery'].includes(e.cat) && !(backSafe && back(e) >= 2);
  }

  // Cost of putting `c` after the exercises already in `seq` (lower = more natural)
  function transitionCost(c, seq, f, slot) {
    const p1 = seq[seq.length - 1], p2 = seq[seq.length - 2];
    let cost = 0;
    if (p1) {
      const b1 = back(p1), bc = back(c);
      if (bc >= 1 && b1 >= 1) cost += (bc + b1 >= 3 ? 14 : 8); // two back-loading moves in a row
      if (p2 && bc >= 1 && b1 >= 1 && back(p2) >= 1) cost += 15;
      cost += 2 * posCost(endPos(p1), startPos(c));
      for (const m of c.muscles) if (!IGNORE_MUSCLE.has(m) && p1.muscles.includes(m)) cost += 2.5;
      if (p1.cat === c.cat) cost += 6;
      if (p1.anim === c.anim) cost += 10;
    }
    if (p2) for (const m of c.muscles) if (!IGNORE_MUSCLE.has(m) && p2.muscles.includes(m)) cost += 1;
    // a smooth start: the first moves are simple, two-sided, well-known lifts for the big muscles
    if (seq.length < 3) {
      if (c.uni) cost += 5;
      if (c.alt) cost += 3;
      if (c.lib) cost += 3;
      if (c.staple) cost -= 2;
      if (c.level >= 2) cost += 3;
    }
    // gradual intensity: controlled basics first, demanding moves in the middle, calm floor core at the end
    const hard = c.cat === 'ballistic' || c.level >= 3 || (c.cat === 'total' && c.anim !== 'carry');
    if (f < 0.25 && hard) cost += 6;
    if (f < 0.2 && c.level >= 2) cost += 2;
    if (f > 0.8 && hard) cost += 4;
    if (p1 && groupOf(p1) === groupOf(c)) cost += 12; // never the same muscle group twice in a row
    if ((PICK_WEIGHT[c.id] || 1) < 0.5) cost += 4; // small accessory moves (calf raises) only now and then
    if (slot === 'core' && f > 0.75 && onFloor(c)) cost -= 2;
    if (slot === 'core' && f < 0.5 && onFloor(c)) cost += 2.5; // keep the floor for later
    return cost;
  }

  // Pick the best-fitting exercise for a slot, given what came before
  function pickNext(slot, ctx) {
    const { level, backSafe, seq, used, recent, f, maxUses, floorOk, floorOnly } = ctx;
    const idx = seq.length;
    // versions of the same move (e.g. "... (single arm)" / "... (two hands)") count as the same exercise
    const baseUsed = new Set(seq.map((x) => baseName(x)));
    const fresh = (e) => !used.has(e.id) && !baseUsed.has(baseName(e));
    const canRepeat = (e, gap) => e.staple && used.has(e.id) && idx - used.get(e.id).last >= gap && used.get(e.id).count < maxUses;
    const inSlot = (s) => EXERCISES.filter((e) => groupOf(e) === s && allowed(e, level, backSafe) && (floorOk || !onFloor(e)) && (!floorOnly || onFloor(e)));
    const tries = [
      () => inSlot(slot).filter(fresh),
      ...(FALLBACK[slot] || []).map((s) => () => inSlot(s).filter(fresh)),
      () => inSlot(slot).filter((e) => canRepeat(e, 6)),
      ...(FALLBACK[slot] || []).map((s) => () => inSlot(s).filter((e) => canRepeat(e, 6))),
      () => inSlot(slot).filter((e) => !used.has(e.id) || idx - used.get(e.id).last >= 3),
      () => inSlot(slot),
    ];
    const p1 = seq[seq.length - 1];
    // back-friendly: after a move that loads the lower back, the next one must not – first look for such a
    // move among fresh/staple options, then allow anything, and only at the very end allow plain repeats
    const strict = backSafe && p1 && back(p1) >= 1;
    const nFresh = tries.length - 2;
    // and the same muscle group never twice in a row, unless there is truly nothing else
    const g1 = p1 && groupOf(p1);
    const order = [];
    if (strict) for (let k = 0; k < nFresh; k++) order.push([tries[k], true, true]);
    for (let k = 0; k < tries.length; k++) order.push([tries[k], false, true]);
    for (let k = 0; k < tries.length; k++) order.push([tries[k], false, false]);
    for (const [t, easyOnly, newGroup] of order) {
      let list = t();
      if (easyOnly) list = list.filter((e) => back(e) === 0);
      if (newGroup && g1) list = list.filter((e) => groupOf(e) !== g1);
      if (!list.length) continue;
      const scored = list.map((e) => [e, transitionCost(e, seq, f, slot)]);
      const best = Math.min(...scored.map((x) => x[1]));
      const near = scored.filter((x) => x[1] <= best + 3); // the most natural options, then vary among them
      return weightedPick(near.map(([e]) => [e, (e.level === level ? 3 : e.level === level - 1 ? 2 : 1) * (recent.has(e.id) ? 0.15 : 1) * (used.has(e.id) ? 0.5 : 1) * (PICK_WEIGHT[e.id] || 1) * (e.lib ? 0.35 : 1)]));
    }
    return null;
  }

  // ---------- Time budgeting ----------
  function normTiming(t) {
    t = Object.assign({}, DEFAULT_TIMING, t || {});
    t.restEvery = Math.max(1, t.restEvery | 0);
    return t;
  }
  const autoWarm = (target) => (target < 600 ? 60 : Math.min(300, Math.max(120, Math.round((target * 0.12) / 30) * 30)));
  const autoCool = (target) => (target < 600 ? 60 : Math.min(240, Math.max(90, Math.round((target * 0.08) / 30) * 30)));
  const startPrep = (t) => Math.max(3, t.prep);
  const grabPrep = (t) => Math.max(5, t.prep);
  const exSec = (e, t) => t.work + (e.uni ? t.switch : 0);

  function budget(target, t) {
    let warmSec = t.warmOn ? (t.warmMin ? t.warmMin * 60 : autoWarm(target)) : 0;
    let coolSec = t.coolOn ? (t.coolMin ? t.coolMin * 60 : autoCool(target)) : 0;
    const overhead = startPrep(t) + (t.warmOn ? grabPrep(t) : 0) + (t.coolOn ? t.prep : 0);
    const minMain = Math.min(target * 0.6, Math.max(180, target * 0.5));
    const over = warmSec + coolSec + overhead + minMain - target;
    if (over > 0 && warmSec + coolSec > 0) {
      const k = Math.max(0, (warmSec + coolSec - over) / (warmSec + coolSec));
      warmSec = t.warmOn ? Math.max(60, Math.round((warmSec * k) / 30) * 30) : 0;
      coolSec = t.coolOn ? Math.max(60, Math.round((coolSec * k) / 30) * 30) : 0;
    }
    return { warmSec, coolSec, mainSec: target - warmSec - coolSec - overhead };
  }

  // Build the main exercise sequence to fill mainSec. `seed` = exercise ids to keep (in order) where they fit.
  // lowFloor: keep floor exercises to a minimum – at most ~1 per 15 min, only at the very end (you get down once)
  function buildMain(t, level, focus, backSafe, mainSec, recent, seed, lowFloor) {
    const floorCap = lowFloor ? Math.max(1, Math.round(mainSec / 900)) : 99;
    let floorCount = 0;
    const pattern = PATTERNS[focus] || PATTERNS.full;
    const est = Math.max(3, Math.round(mainSec / (t.work + t.prep + t.rest / t.restEvery + 1)));
    const pool = EXERCISES.filter((e) => allowed(e, level, backSafe)).length;
    const maxUses = Math.max(2, Math.ceil((est / pool) * 2.5));
    const seq = [], used = new Map();
    const queue = (seed || []).filter((id) => EX[id] && allowed(EX[id], level, backSafe));
    let time = 0, since = 0;
    for (let i = 0; i < 200; i++) {
      let slot = pattern[i % pattern.length];
      const wave = Math.floor(i / pattern.length);
      if (VARIANTS[slot] && wave > 0 && wave % 2 === 1 && Math.random() < 0.35) slot = VARIANTS[slot][rnd(VARIANTS[slot].length)];
      const f = Math.min(1, time / Math.max(1, mainSec));
      // floor moves only in the last few slots, so once you're down you stay down until the end
      const left = mainSec - time;
      const floorOnly = lowFloor && floorCount > 0; // already down: stay down
      const floorOk = !lowFloor || floorOnly || (left <= floorCap * (t.work + t.prep + t.switch) + t.rest + 5);
      while (queue.length && !floorOk && onFloor(EX[queue[0]])) queue.shift();
      const e = queue.length ? EX[queue.shift()] : (pickNext(slot, { level, backSafe, seq, used, recent, f, maxUses, floorOk, floorOnly }) || (floorOnly ? pickNext('core', { level, backSafe, seq, used, recent, f, maxUses, floorOk, floorOnly }) : null));
      if (!e) break;
      const need = exSec(e, t);
      if (seq.length >= 2 && time + need > mainSec + t.work * 0.5) break;
      seq.push(e);
      if (onFloor(e)) floorCount++;
      const u = used.get(e.id) || { count: 0, last: -99 };
      used.set(e.id, { count: u.count + 1, last: seq.length - 1 });
      time += need;
      since++;
      const gap = t.prep + (since >= t.restEvery ? t.rest : 0);
      if (since >= t.restEvery) since = 0;
      if (time + gap + t.work * 0.6 > mainSec) break;
      time += gap;
    }
    return seq.map((e) => e.id);
  }

  function generate(opts) {
    const minutes = opts.minutes, level = opts.level, focus = opts.focus || 'full';
    const backSafe = opts.backSafe !== false;
    twoBells = !!opts.twoBells;
    const lowFloor = opts.lowFloor !== false;
    const t = normTiming(opts.timing);
    const target = minutes * 60;
    const recent = new Set(opts.recent || []);
    const B = budget(target, t);
    const main = buildMain(t, level, focus, backSafe, B.mainSec, recent, null, lowFloor);
    const warm = t.warmOn ? pickOrdered('warmup', WARM_MUST, Math.max(2, Math.round(B.warmSec / 30)), recent, null, lowFloor) : [];
    const cool = t.coolOn ? pickOrdered('stretch', COOL_MUST, Math.max(2, Math.round(B.coolSec / 35)), recent, null, lowFloor) : [];
    return { v: 4, minutes, level, focus, backSafe, lowFloor, twoBells, target, timing: t, warm, cool, warmSec: B.warmSec, coolSec: B.coolSec, main, created: Date.now() };
  }

  // Apply new timing to an existing plan, keeping as many of its exercises as possible.
  function retime(plan, timing) {
    const t = normTiming(timing);
    const B = budget(plan.target, t);
    plan.timing = t;
    plan.warmSec = B.warmSec; plan.coolSec = B.coolSec;
    twoBells = !!plan.twoBells;
    plan.main = buildMain(t, plan.level, plan.focus, plan.backSafe !== false, B.mainSec, new Set(), plan.main, plan.lowFloor !== false);
    const nw = t.warmOn ? Math.max(2, Math.round(B.warmSec / 30)) : 0;
    if (nw !== plan.warm.length) plan.warm = nw ? pickOrdered('warmup', WARM_MUST, nw, new Set(), plan.warm, plan.lowFloor !== false) : [];
    const nc = t.coolOn ? Math.max(2, Math.round(B.coolSec / 35)) : 0;
    if (nc !== plan.cool.length) plan.cool = nc ? pickOrdered('stretch', COOL_MUST, nc, new Set(), plan.cool, plan.lowFloor !== false) : [];
    return plan;
  }

  function pickOrdered(cat, must, n, recent, keep, lowFloor) {
    let all = EXERCISES.filter((e) => e.cat === cat);
    if (lowFloor) {
      all = all.filter((e) => !FLOOR_WC.has(e.id));
      if (cat === 'stretch') all = all.concat(STANDING_COOL_EXTRA.map((id) => EX[id]).filter(Boolean));
      must = must.filter((id) => !FLOOR_WC.has(id));
      keep = (keep || []).filter((id) => !FLOOR_WC.has(id));
    }
    const ids = new Set();
    for (const id of (keep || []).concat(must)) { if (ids.size >= n) break; ids.add(id); }
    const fresh = shuffle(all).sort((a, b) => (recent && recent.has(a.id) ? 1 : 0) - (recent && recent.has(b.id) ? 1 : 0));
    for (const e of fresh) { if (ids.size >= n) break; ids.add(e.id); }
    return [...ids].map((id) => EX[id]).sort((a, b) => (a.order || 5) - (b.order || 5)).map((e) => e.id);
  }

  function split(total, n) {
    const base = Math.floor(total / n), extra = total - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
  }

  // ---------- Interval timeline ----------
  function buildIntervals(plan) {
    const t = normTiming(plan.timing);
    const out = [];
    let inst = 0;
    // One-sided moves: right side, a short switch, then left side. `inst` ties the parts of one exercise together.
    const pushEx = (phase, id, dur, label, extra) => {
      const e = EX[id];
      inst++;
      if (e.uni) {
        const h = Math.ceil(dur / 2);
        out.push(Object.assign({ phase, ex: id, dur: h, side: 'Right side', label, inst }, extra));
        if (t.switch > 0) out.push({ phase: 'switch', ex: id, dur: t.switch, label: 'Switch sides', adj: 'none', inst });
        out.push(Object.assign({ phase, ex: id, dur: dur - h, side: 'Left side', label, sideSwitch: t.switch === 0, inst }, extra));
      } else {
        out.push(Object.assign({ phase, ex: id, dur, side: e.alt ? 'Alternate' : null, label, inst }, extra));
      }
    };
    const main = plan.main;
    const firstEx = plan.warm[0] || main[0];
    out.push({ phase: 'prep', ex: firstEx, dur: startPrep(t), label: 'Get ready', adj: 'none', forInst: 1 });

    const wd = split(plan.warmSec, Math.max(1, plan.warm.length));
    plan.warm.forEach((id, i) => pushEx('warmup', id, wd[i], `Warm-up · ${i + 1}/${plan.warm.length}`, { adj: 'warm', slot: ['warm', i] }));
    if (plan.warm.length) out.push({ phase: 'prep', ex: main[0], dur: grabPrep(t), label: 'Grab your kettlebell', adj: 'none', forInst: inst + 1 });

    let since = 0;
    const custom = plan.kind === 'custom';
    main.forEach((id, i) => {
      const label = custom && plan.rounds > 1
        ? `Round ${Math.floor(i / plan.roundLen) + 1}/${plan.rounds} · ${(i % plan.roundLen) + 1}/${plan.roundLen}`
        : `Exercise ${i + 1} of ${main.length}`;
      pushEx('work', id, plan.workSec ? plan.workSec[i] : t.work, label, { adj: 'work', slot: ['main', i] });
      since++;
      if (i === main.length - 1) return;
      if (custom) { // your own workout: rest between exercises and/or a longer rest between rounds
        const endRound = plan.rounds > 1 && (i + 1) % plan.roundLen === 0;
        const r = endRound ? plan.roundRest : plan.restBetween;
        if (r > 0) out.push({ phase: 'rest', ex: main[i + 1], dur: r, label: endRound ? `Rest · round ${(i + 1) / plan.roundLen + 1} next` : 'Rest', adj: 'none', forInst: inst + 1 });
      } else if (since >= t.restEvery) {
        since = 0;
        if (t.rest > 0) out.push({ phase: 'rest', ex: main[i + 1], dur: t.rest, label: 'Rest', adj: 'rest', forInst: inst + 1 });
      }
      if (t.prep > 0) out.push({ phase: 'prep', ex: main[i + 1], dur: t.prep, label: 'Get ready', adj: 'none', forInst: inst + 1 });
    });

    if (plan.cool.length) {
      if (t.prep) out.push({ phase: 'prep', ex: plan.cool[0], dur: t.prep, label: 'Cool-down next', adj: 'none', forInst: inst + 1 });
      const cd = split(plan.coolSec, plan.cool.length);
      plan.cool.forEach((id, i) => pushEx('cooldown', id, cd[i], `Cool-down · ${i + 1}/${plan.cool.length}`, { adj: 'cool', slot: ['cool', i] }));
    }

    if (!plan.noFit) fitExactly(out, plan, t);
    const res = out.filter((x) => x.dur > 0);
    linkNext(res);
    return res;
  }

  function linkNext(res) {
    for (let i = 0; i < res.length; i++) {
      res[i].next = null;
      for (let j = i + 1; j < res.length; j++) {
        if (!['rest', 'prep', 'switch'].includes(res[j].phase) && res[j].ex !== res[i].ex) { res[i].next = res[j].ex; break; }
      }
    }
  }

  // Make the timeline add up to the selected minutes, to the second.
  function fitExactly(out, plan, t) {
    let diff = plan.target - out.reduce((s, x) => s + x.dur, 0);
    const spread = (items, lo, hi) => {
      if (!items.length) return;
      items.forEach((x) => { x._lo = lo(x); x._hi = hi(x); });
      let moved = true;
      while (diff !== 0 && moved) {
        moved = false;
        for (const x of items) {
          if (diff > 0 && x.dur < x._hi) { x.dur++; diff--; moved = true; }
          else if (diff < 0 && x.dur > x._lo) { x.dur--; diff++; moved = true; }
          if (diff === 0) break;
        }
      }
    };
    const half = (x) => (x.side === 'Left side' || x.side === 'Right side' ? 0.5 : 1);
    const flex = out.filter((x) => (x.adj === 'warm' && !t.warmMin) || (x.adj === 'cool' && !t.coolMin));
    spread(flex, (x) => Math.round(15 * half(x)), (x) => Math.round(90 * half(x)));
    spread(out.filter((x) => x.adj === 'rest'), (x) => Math.round(x.dur * 0.5), (x) => Math.round(x.dur * 1.5));
    spread(out.filter((x) => x.adj === 'work'), (x) => Math.round(x.dur * 0.75), (x) => Math.round(x.dur * 1.25));
    if (diff) out[out.length - 1].dur = Math.max(1, out[out.length - 1].dur + diff);
  }

  function totalDuration(plan) {
    return buildIntervals(plan).reduce((s, x) => s + x.dur, 0);
  }

  // A different exercise that can take this one's place: same movement slot, same one-/two-sided structure
  // (so timing stays identical), respecting level, back-friendly mode and what's already in the plan.
  function alternative(plan, id, opts) {
    const cur = EX[id];
    const sameShape = opts && opts.sameShape;
    const avoid = new Set((opts && opts.avoid) || []);
    const inPlan = new Set([...(plan.main || []), ...(plan.warm || []), ...(plan.cool || [])]);
    const curFloor = FLOOR_WC.has(id) || (!['warmup', 'stretch', 'recovery'].includes(cur.cat) && onFloor(cur));
    const floorFree = plan.lowFloor !== false && !plan.kind && !curFloor;
    const isFloor = (e) => FLOOR_WC.has(e.id) || (!['warmup', 'stretch', 'recovery'].includes(e.cat) && onFloor(e));
    twoBells = !!plan.twoBells || plan.kind === 'custom';
    const ok = (e) => e.id !== id && !avoid.has(e.id) && !(e.eq === 2 && !twoBells) && (!sameShape || (!!e.uni === !!cur.uni)) && !(floorFree && isFloor(e));
    let list;
    const level = plan.level || 3, backSafe = plan.backSafe !== false;
    if (['warmup', 'stretch', 'recovery'].includes(cur.cat)) {
      list = EXERCISES.filter((e) => e.cat === cur.cat && ok(e));
    } else if (opts && opts.otherGroup) {
      return otherGroupAlt(plan, cur, opts, ok, inPlan, level, backSafe);
    } else {
      const slot = (opts && opts.slot) || groupOf(cur);
      const cands = (s) => EXERCISES.filter((e) => groupOf(e) === s && allowed(e, level, backSafe) && ok(e));
      list = cands(slot);
      if (!list.length) for (const s of FALLBACK[slot] || []) list = list.concat(cands(s));
    }
    if (!list.length) return null;
    const fresh = list.filter((e) => !inPlan.has(e.id));
    const pick = fresh.length ? fresh : list;
    return pick[rnd(pick.length)].id;
  }

  // Skip during a workout: a move for a DIFFERENT muscle group that fits between the previous and the next
  // exercise (not their groups either), preferring groups next to them in body order. Repeated skips on the
  // same spot keep moving to groups not tried yet.
  function otherGroupAlt(plan, cur, opts, ok, inPlan, level, backSafe) {
    const prev = EX[opts.prev], next = EX[opts.next];
    const block = new Set([groupOf(cur), groupOf(prev), groupOf(next), ...(opts.avoidGroups || [])]);
    const lowFloor = plan.lowFloor !== false && !plan.kind;
    const pool = (blocked) => EXERCISES.filter((e) => {
      const g = groupOf(e);
      return g && !blocked.has(g) && allowed(e, level, backSafe) && ok(e) && (!lowFloor || !onFloor(e) || onFloor(cur));
    });
    let list = pool(block);
    if (!list.length) list = pool(new Set([groupOf(cur), groupOf(prev), groupOf(next)])); // all tried: start over
    if (!list.length) list = pool(new Set([groupOf(cur)]));
    if (!list.length) return null;
    const near = new Set([...(ADJ[groupOf(prev)] || []), ...(ADJ[groupOf(next)] || [])]);
    const seq = prev ? [prev] : [];
    const scored = list.map((e) => {
      let c = transitionCost(e, seq, 0.5, groupOf(e));
      if (next) for (const m of e.muscles) if (!IGNORE_MUSCLE.has(m) && next.muscles.includes(m)) c += 2.5;
      if (next && backSafe && back(e) >= 1 && back(next) >= 1) c += 8;
      if (!near.has(groupOf(e))) c += 4;
      if (inPlan.has(e.id)) c += 6;
      if (e.lib) c += 1;
      return [e, c];
    });
    const best = Math.min(...scored.map((x) => x[1]));
    const pick = scored.filter((x) => x[1] <= best + 3);
    return weightedPick(pick.map(([e]) => [e, (PICK_WEIGHT[e.id] || 1) * (e.level === level ? 2 : 1)])).id;
  }

  // Replace one main exercise in a plan (preview "swap" button)
  function swap(plan, idx, recent) {
    const id = plan.main[idx];
    const alt = alternative(plan, id);
    if (!alt) return false;
    plan.main[idx] = alt;
    return true;
  }

  // Turn a saved custom workout into a playable plan (no time fitting: it takes as long as you built it)
  function customPlan(def, timing) {
    const t = normTiming(Object.assign({}, timing, { warmOn: !!def.warmOn, coolOn: !!def.coolOn, warmMin: 0, coolMin: 0 }));
    const rounds = Math.max(1, def.rounds || 1);
    const main = [], workSec = [];
    for (let r = 0; r < rounds; r++) def.items.forEach((it) => { main.push(it.ex); workSec.push(it.sec || t.work); });
    const warmSec = t.warmOn ? 180 : 0, coolSec = t.coolOn ? 120 : 0;
    const plan = {
      v: 4, kind: 'custom', name: def.name || 'My workout', customId: def.id, focus: 'custom', level: 3, backSafe: false, lowFloor: false,
      timing: t, main, workSec, rounds, roundLen: def.items.length, restBetween: def.restBetween || 0, roundRest: def.roundRest || 0,
      warm: t.warmOn ? pickOrdered('warmup', WARM_MUST, 6, new Set(), null, true) : [],
      cool: t.coolOn ? pickOrdered('stretch', COOL_MUST, 4, new Set(), null, true) : [],
      warmSec, coolSec, noFit: true, created: Date.now(),
    };
    plan.target = buildIntervals(plan).reduce((s, x) => s + x.dur, 0);
    plan.minutes = Math.round(plan.target / 60);
    return plan;
  }

  global.Generator = { customPlan, CAT_SLOT, groupOf, GROUP_LABEL, generate, retime, buildIntervals, totalDuration, swap, alternative, linkNext, BACK, FOCUS_LABEL, FOCUS_SHORT, LEVEL_TIMING, DEFAULT_TIMING };
})(window);
