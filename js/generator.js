// Workout generator: one continuous sequence of exercises + rests that fits the selected total time exactly.
//
// How the order is built (inspired by common full-body kettlebell programming):
//  * A repeating movement pattern – squat/lunge → press → hinge → row/pullover → core – so the body moves
//    from legs to upper body to posterior chain to back to trunk, and every area gets a break before it
//    is used again.
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

  // Movement slots and the exercise categories that can fill them
  const SLOT_CATS = { knee: ['squat', 'lunge'], push: ['push'], hinge: ['hinge', 'ballistic'], pull: ['pull'], core: ['core'], arms: ['arms'], total: ['total'] };
  const CAT_SLOT = { squat: 'knee', lunge: 'knee', push: 'push', hinge: 'hinge', ballistic: 'hinge', pull: 'pull', core: 'core', arms: 'arms', total: 'total' };
  const PATTERNS = {
    full: ['knee', 'push', 'hinge', 'pull', 'core'],
    lower: ['knee', 'push', 'hinge', 'core', 'knee', 'pull', 'hinge', 'core'],
    upper: ['push', 'knee', 'pull', 'core', 'arms', 'hinge', 'push', 'pull'],
    core: ['knee', 'core', 'push', 'core', 'hinge', 'pull', 'core'],
  };
  // Occasional variety: some waves swap a slot for a total-body or arm move
  const VARIANTS = { push: ['total', 'arms'], pull: ['arms'] };
  const FALLBACK = { knee: ['total'], push: ['arms', 'total'], hinge: ['knee'], pull: ['arms', 'push'], core: ['total'], arms: ['push', 'pull'], total: ['knee', 'core'] };
  const FOCUS_SHORT = { full: 'Full body', lower: 'Legs', upper: 'Upper body', core: 'Core' };
  const FOCUS_LABEL = { full: 'Full body', lower: 'Legs focus', upper: 'Upper body focus', core: 'Core focus' };

  // Lower-back load: 0 = low, 1 = moderate, 2 = high (left out in back-friendly mode)
  const BACK = {
    swing2: 2, swing1: 2, swingAlt: 2, deadStop: 2, swingAm: 2, cleanHang: 2, deadClean: 2, snatch: 2, cleanPress: 2,
    rdl: 2, goodMorning: 2, row2: 2, highPull: 2, fig8: 2, windmill: 2, woodchop: 2, situp: 1, russianTwist: 1, vsit: 1, legRaise: 1,
    deadlift: 1, sumoDL: 1, suitcaseDL: 1, kickstand: 1, sldl: 1, row: 1, plankRow: 1, pushPress: 1, thruster: 1, thruster2: 1,
    goblet: 1, gobletPause: 1, squatPulse: 1, rackSquat: 1, sumoSquat: 1, cossack: 1, revLunge: 1, fwdLunge: 1, splitSquat: 1,
    rackLunge: 1, suitLunge: 1, ohLunge: 2, lungeKnee: 1, latLunge: 1, curtsy: 1, press: 1, press2: 1, bottomsUp: 1, triExt: 1,
    carry: 1, rackMarch: 1, ohMarch: 1, tgu: 1, uprightRow: 0, boxSquat: 0, supRow: 0, standPull: 0,
  };
  const back = (e) => BACK[e.id] || 0;

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
    rowSup: 'hang', standPullover: 'goblet', haloKneel: 'kneel', boxSquat: 'goblet', deadbugPull: 'supine', birdDog: 'prone',
  };
  const STANDING = new Set(['hang', 'goblet', 'rack', 'oh']);
  const NEAR = new Set(['hang|goblet', 'goblet|rack', 'rack|oh', 'goblet|kneel', 'rack|kneel', 'supine|seated', 'supine|prone', 'prone|seated', 'kneel|prone']);
  const startPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[0] : p; };
  const endPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[1] : p; };
  const onFloor = (e) => !STANDING.has(startPos(e));
  function posCost(a, b) {
    if (a === b) return 0;
    if (NEAR.has(a + '|' + b) || NEAR.has(b + '|' + a)) return 1;
    const fa = STANDING.has(a) ? 's' : a === 'kneel' ? 'k' : 'f';
    const fb = STANDING.has(b) ? 's' : b === 'kneel' ? 'k' : 'f';
    if (fa === fb) return 1.5;
    if (fa === 'k' || fb === 'k') return 2;
    return 4; // standing <-> floor
  }

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

  function allowed(e, level, backSafe) {
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
    // gradual intensity: controlled basics first, demanding moves in the middle, calm floor core at the end
    const hard = c.cat === 'ballistic' || c.level >= 3 || (c.cat === 'total' && c.anim !== 'carry');
    if (f < 0.25 && hard) cost += 6;
    if (f < 0.2 && c.level >= 2) cost += 2;
    if (f > 0.8 && hard) cost += 4;
    if (slot === 'core' && f > 0.75 && onFloor(c)) cost -= 2;
    if (slot === 'core' && f < 0.5 && onFloor(c)) cost += 2.5; // keep the floor for later
    return cost;
  }

  // Pick the best-fitting exercise for a slot, given what came before
  function pickNext(slot, ctx) {
    const { level, backSafe, seq, used, recent, f, maxUses } = ctx;
    const idx = seq.length;
    const canRepeat = (e, gap) => e.staple && used.has(e.id) && idx - used.get(e.id).last >= gap && used.get(e.id).count < maxUses;
    const inSlot = (s) => EXERCISES.filter((e) => SLOT_CATS[s].includes(e.cat) && allowed(e, level, backSafe));
    const tries = [
      () => inSlot(slot).filter((e) => !used.has(e.id)),
      ...(FALLBACK[slot] || []).map((s) => () => inSlot(s).filter((e) => !used.has(e.id))),
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
    const order = [];
    if (strict) for (let k = 0; k < nFresh; k++) order.push([tries[k], true]);
    for (let k = 0; k < tries.length; k++) order.push([tries[k], false]);
    for (const [t, easyOnly] of order) {
      let list = t();
      if (easyOnly) list = list.filter((e) => back(e) === 0);
      if (!list.length) continue;
      const scored = list.map((e) => [e, transitionCost(e, seq, f, slot)]);
      const best = Math.min(...scored.map((x) => x[1]));
      const near = scored.filter((x) => x[1] <= best + 3); // the most natural options, then vary among them
      return weightedPick(near.map(([e]) => [e, (e.level === level ? 3 : e.level === level - 1 ? 2 : 1) * (recent.has(e.id) ? 0.15 : 1) * (used.has(e.id) ? 0.5 : 1)]));
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
  function buildMain(t, level, focus, backSafe, mainSec, recent, seed) {
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
      const e = queue.length ? EX[queue.shift()] : pickNext(slot, { level, backSafe, seq, used, recent, f, maxUses });
      if (!e) break;
      const need = exSec(e, t);
      if (seq.length >= 2 && time + need > mainSec + t.work * 0.5) break;
      seq.push(e);
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
    const t = normTiming(opts.timing);
    const target = minutes * 60;
    const recent = new Set(opts.recent || []);
    const B = budget(target, t);
    const main = buildMain(t, level, focus, backSafe, B.mainSec, recent);
    const warm = t.warmOn ? pickOrdered('warmup', WARM_MUST, Math.max(2, Math.round(B.warmSec / 30)), recent) : [];
    const cool = t.coolOn ? pickOrdered('stretch', COOL_MUST, Math.max(2, Math.round(B.coolSec / 35)), recent) : [];
    return { v: 4, minutes, level, focus, backSafe, target, timing: t, warm, cool, warmSec: B.warmSec, coolSec: B.coolSec, main, created: Date.now() };
  }

  // Apply new timing to an existing plan, keeping as many of its exercises as possible.
  function retime(plan, timing) {
    const t = normTiming(timing);
    const B = budget(plan.target, t);
    plan.timing = t;
    plan.warmSec = B.warmSec; plan.coolSec = B.coolSec;
    plan.main = buildMain(t, plan.level, plan.focus, plan.backSafe !== false, B.mainSec, new Set(), plan.main);
    const nw = t.warmOn ? Math.max(2, Math.round(B.warmSec / 30)) : 0;
    if (nw !== plan.warm.length) plan.warm = nw ? pickOrdered('warmup', WARM_MUST, nw, new Set(), plan.warm) : [];
    const nc = t.coolOn ? Math.max(2, Math.round(B.coolSec / 35)) : 0;
    if (nc !== plan.cool.length) plan.cool = nc ? pickOrdered('stretch', COOL_MUST, nc, new Set(), plan.cool) : [];
    return plan;
  }

  function pickOrdered(cat, must, n, recent, keep) {
    const all = EXERCISES.filter((e) => e.cat === cat);
    const ids = new Set();
    for (const id of (keep || []).concat(must)) { if (ids.size >= n) break; ids.add(id); }
    const fresh = shuffle(all).sort((a, b) => (recent && recent.has(a.id) ? 1 : 0) - (recent && recent.has(b.id) ? 1 : 0));
    for (const e of fresh) { if (ids.size >= n) break; ids.add(e.id); }
    return [...ids].map((id) => EX[id]).sort((a, b) => a.order - b.order).map((e) => e.id);
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
    main.forEach((id, i) => {
      pushEx('work', id, t.work, `Exercise ${i + 1} of ${main.length}`, { adj: 'work', slot: ['main', i] });
      since++;
      if (i === main.length - 1) return;
      if (since >= t.restEvery) {
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

    fitExactly(out, plan, t);
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
    const ok = (e) => e.id !== id && !avoid.has(e.id) && (!sameShape || (!!e.uni === !!cur.uni));
    let list;
    if (['warmup', 'stretch', 'recovery'].includes(cur.cat)) {
      list = EXERCISES.filter((e) => e.cat === cur.cat && ok(e));
    } else {
      const slot = (opts && opts.slot) || CAT_SLOT[cur.cat];
      const level = plan.level || 3, backSafe = plan.backSafe !== false;
      const cands = (s) => EXERCISES.filter((e) => SLOT_CATS[s].includes(e.cat) && allowed(e, level, backSafe) && ok(e));
      list = cands(slot);
      if (!list.length) for (const s of FALLBACK[slot] || []) list = list.concat(cands(s));
    }
    if (!list.length) return null;
    const fresh = list.filter((e) => !inPlan.has(e.id));
    const pick = fresh.length ? fresh : list;
    return pick[rnd(pick.length)].id;
  }

  // Replace one main exercise in a plan (preview "swap" button)
  function swap(plan, idx, recent) {
    const id = plan.main[idx];
    const alt = alternative(plan, id);
    if (!alt) return false;
    plan.main[idx] = alt;
    return true;
  }

  global.Generator = { CAT_SLOT, generate, retime, buildIntervals, totalDuration, swap, alternative, linkNext, BACK, FOCUS_LABEL, FOCUS_SHORT, LEVEL_TIMING, DEFAULT_TIMING };
})(window);
