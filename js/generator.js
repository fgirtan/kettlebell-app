// Workout generator: builds a full-body session that fits the selected total time exactly
// (warm-up, work, rests, get-ready countdowns and cool-down all included).
(function (global) {
  const LEVEL_TIMING = {
    1: { work: 30, rest: 30, roundRest: 45 },
    2: { work: 40, rest: 20, roundRest: 30 },
    3: { work: 45, rest: 15, roundRest: 30 },
  };
  const DEFAULT_TIMING = Object.assign({ prep: 5, restEvery: 1, blockRest: 60, warmOn: true, warmMin: 0, coolOn: true, coolMin: 0 }, LEVEL_TIMING[1]);

  // Slot priorities per focus. The first N slots are used, then the order is optimised.
  const TEMPLATES = {
    full: ['ballistic', 'squat', 'push', 'pull', 'core', 'lunge', 'hinge', 'total'],
    lower: ['ballistic', 'squat', 'pull', 'hinge', 'lunge', 'core', 'squat', 'push'],
    upper: ['push', 'pull', 'ballistic', 'squat', 'arms', 'pull', 'core', 'push'],
    core: ['ballistic', 'core', 'squat', 'push', 'core', 'pull', 'lunge', 'core'],
  };
  const FOCUS_SHORT = { full: 'Full body', lower: 'Legs', upper: 'Upper body', core: 'Core' };
  const FOCUS_LABEL = { full: 'Full body', lower: 'Legs focus', upper: 'Upper body focus', core: 'Core focus' };

  const WARM_MUST = ['w_march', 'w_gm', 'w_squat', 'w_wgs'];
  const COOL_MUST = ['s_fold', 's_hipflex', 's_child'];

  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function pool(cat, level, exclude) {
    return EXERCISES.filter((e) => e.cat === cat && e.level <= level && !exclude.has(e.id));
  }

  function pickOne(cat, level, exclude, avoidAnims) {
    let p = pool(cat, level, exclude);
    if (!p.length) p = EXERCISES.filter((e) => e.cat === cat && e.level <= level);
    if (!p.length) return null;
    const weighted = p.map((e) => {
      let w = e.level === level ? 3 : e.level === level - 1 ? 2 : 1;
      if (avoidAnims && avoidAnims.has(e.anim)) w = 0.3;
      return [e, w];
    });
    let r = Math.random() * weighted.reduce((s, x) => s + x[1], 0);
    for (const [e, w] of weighted) { r -= w; if (r <= 0) return e; }
    return weighted[weighted.length - 1][0];
  }

  // ---------- Flow optimisation ----------
  function pairCost(a, b) {
    let c = 0;
    if (a.region === b.region) c += a.region === 'core' ? 8 : a.region === 'total' ? 4 : 10;
    if ((a.region === 'total' && b.region === 'lower') || (a.region === 'lower' && b.region === 'total')) c += 2;
    for (const m of a.muscles) if (b.muscles.includes(m) && m !== 'cardio' && m !== 'core') c += 3;
    if (!!a.floor !== !!b.floor) c += 2;
    return c;
  }

  function seqCost(seq, rounds) {
    const n = seq.length;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const e = seq[i];
      if (i > 0) c += pairCost(seq[i - 1], e);
      const demanding = e.cat === 'ballistic' || e.level === 3 || (e.cat === 'total' && e.anim !== 'carry');
      if (demanding) c += i * 1.6; // technical / explosive work first, while fresh
      if (e.cat === 'core') c += (n - 1 - i) * 1.0; // core towards the end
      if (e.floor) c += (n - 1 - i) * 0.6; // group floor work at the end
    }
    if (rounds > 1 && n > 2) {
      const a = seq[n - 1], b = seq[0];
      if (a.region === b.region) c += 5;
      if (!!a.floor !== !!b.floor) c += 1;
    }
    return c;
  }

  function bestOrder(list, rounds) {
    let best = list.slice(), bestCost = Infinity;
    const used = new Array(list.length).fill(false);
    const cur = [];
    (function rec(partial) {
      if (partial >= bestCost) return;
      if (cur.length === list.length) {
        const c = seqCost(cur, rounds) + Math.random() * 0.5;
        if (c < bestCost) { bestCost = c; best = cur.slice(); }
        return;
      }
      for (let i = 0; i < list.length; i++) {
        if (used[i]) continue;
        const add = cur.length ? pairCost(cur[cur.length - 1], list[i]) : 0;
        used[i] = true; cur.push(list[i]);
        rec(partial + add);
        cur.pop(); used[i] = false;
      }
    })(0);
    return best;
  }

  // ---------- Time budgeting ----------
  // Seconds of one block: work + rests + get-ready countdowns between exercises.
  function blockSeconds(n, r, t) {
    let s = 0;
    for (let round = 0; round < r; round++) {
      for (let i = 0; i < n; i++) {
        s += t.work;
        const lastInRound = i === n - 1, last = lastInRound && round === r - 1;
        if (last) continue;
        if (lastInRound) s += t.roundRest;
        else if ((i + 1) % t.restEvery === 0) s += t.rest;
        s += t.prep;
      }
    }
    return s;
  }

  function chooseShape(budget, t, maxRounds) {
    let best = null;
    for (let n = 3; n <= 8; n++) {
      for (let r = 1; r <= maxRounds; r++) {
        const real = blockSeconds(n, r, t);
        const diff = Math.abs(real - budget) + (real > budget ? 15 : 0);
        const pref = Math.abs(n - 6) * 8 + (r === 1 ? 40 : 0) + (r > 4 ? (r - 4) * 20 : 0);
        const score = diff + pref;
        if (!best || score < best.score) best = { n, r, real, score };
      }
    }
    return best;
  }

  const autoWarm = (target) => (target < 600 ? 60 : Math.min(300, Math.max(120, Math.round((target * 0.12) / 30) * 30)));
  const autoCool = (target) => (target < 600 ? 60 : Math.min(240, Math.max(90, Math.round((target * 0.08) / 30) * 30)));

  function normTiming(t) {
    t = Object.assign({}, DEFAULT_TIMING, t || {});
    t.restEvery = Math.max(1, t.restEvery | 0);
    return t;
  }

  function generate(opts) {
    const minutes = opts.minutes, level = opts.level, focus = opts.focus || 'full';
    const t = normTiming(opts.timing);
    const target = minutes * 60;

    let warmSec = t.warmOn ? (t.warmMin ? t.warmMin * 60 : autoWarm(target)) : 0;
    let coolSec = t.coolOn ? (t.coolMin ? t.coolMin * 60 : autoCool(target)) : 0;
    const overhead = Math.max(5, t.prep) + (t.warmOn ? Math.max(10, t.prep) : 0) + (t.coolOn ? t.prep : 0);
    // Always leave at least ~3 minutes (or 60% of the session) for the main work
    const minMain = Math.min(target * 0.6, Math.max(180, target * 0.5));
    const over = warmSec + coolSec + overhead + minMain - target;
    if (over > 0 && warmSec + coolSec > 0) {
      const k = Math.max(0, (warmSec + coolSec - over) / (warmSec + coolSec));
      warmSec = t.warmOn ? Math.max(60, Math.round((warmSec * k) / 30) * 30) : 0;
      coolSec = t.coolOn ? Math.max(60, Math.round((coolSec * k) / 30) * 30) : 0;
    }
    const mainSec = target - warmSec - coolSec - overhead;

    const nBlocks = mainSec <= 18 * 60 ? 1 : mainSec <= 36 * 60 ? 2 : 3;
    const perBlock = (mainSec - (nBlocks - 1) * (t.blockRest + t.prep)) / nBlocks;

    const used = new Set();
    const blocks = [];
    for (let b = 0; b < nBlocks; b++) {
      const shape = chooseShape(perBlock, t, minutes < 15 ? 6 : 5);
      const slots = TEMPLATES[focus].slice(0, shape.n);
      const anims = new Set();
      const chosen = [];
      for (const cat of slots) {
        const e = pickOne(cat, level, used, anims);
        if (e) { chosen.push(e); used.add(e.id); anims.add(e.anim); }
      }
      blocks.push({ ex: bestOrder(chosen, shape.r).map((e) => e.id), rounds: shape.r });
    }

    const warm = t.warmOn ? pickOrdered('warmup', WARM_MUST, Math.max(2, Math.round(warmSec / 30))) : [];
    const cool = t.coolOn ? pickOrdered('stretch', COOL_MUST, Math.max(2, Math.round(coolSec / 35))) : [];

    return { minutes, level, focus, target, timing: t, warm, cool, warmSec, coolSec, blocks, created: Date.now() };
  }

  function pickOrdered(cat, must, n) {
    const all = EXERCISES.filter((e) => e.cat === cat);
    const ids = new Set(must.slice(0, n));
    for (const e of shuffle(all)) { if (ids.size >= n) break; ids.add(e.id); }
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
    const pushEx = (phase, id, dur, label, extra) => {
      const e = EX[id];
      if (e.uni) {
        const h = Math.round(dur / 2);
        out.push(Object.assign({ phase, ex: id, dur: h, side: 'Left side', label }, extra));
        out.push(Object.assign({ phase, ex: id, dur: dur - h, side: 'Right side', label, sideSwitch: true }, extra));
      } else {
        out.push(Object.assign({ phase, ex: id, dur, side: e.alt ? 'Alternate' : null, label }, extra));
      }
    };
    const firstEx = plan.warm[0] || plan.blocks[0].ex[0];
    out.push({ phase: 'prep', ex: firstEx, dur: Math.max(5, t.prep), label: 'Get ready', adj: 'none' });

    const wd = split(plan.warmSec, Math.max(1, plan.warm.length));
    plan.warm.forEach((id, i) => pushEx('warmup', id, wd[i], `Warm-up · ${i + 1}/${plan.warm.length}`, { adj: 'warm' }));
    if (plan.warm.length) out.push({ phase: 'prep', ex: plan.blocks[0].ex[0], dur: Math.max(10, t.prep), label: 'Grab your kettlebell', adj: 'none' });

    plan.blocks.forEach((b, bi) => {
      if (bi > 0) {
        out.push({ phase: 'rest', ex: b.ex[0], dur: t.blockRest, label: `Rest · Block ${bi + 1} is next`, adj: 'rest' });
        if (t.prep) out.push({ phase: 'prep', ex: b.ex[0], dur: t.prep, label: 'Get ready', adj: 'none' });
      }
      for (let r = 0; r < b.rounds; r++) {
        b.ex.forEach((id, i) => {
          const label = `${plan.blocks.length > 1 ? `Block ${bi + 1} · ` : ''}Round ${r + 1}/${b.rounds} · ${i + 1}/${b.ex.length}`;
          pushEx('work', id, t.work, label, { block: bi, round: r, station: i, adj: 'work' });
          const lastInRound = i === b.ex.length - 1;
          if (lastInRound && r === b.rounds - 1) return;
          const nextId = lastInRound ? b.ex[0] : b.ex[i + 1];
          if (lastInRound) { if (t.roundRest) out.push({ phase: 'rest', ex: nextId, dur: t.roundRest, label: `Rest between rounds · round ${r + 2} next`, adj: 'rest' }); }
          else if ((i + 1) % t.restEvery === 0 && t.rest) out.push({ phase: 'rest', ex: nextId, dur: t.rest, label: 'Rest', adj: 'rest' });
          if (t.prep) out.push({ phase: 'prep', ex: nextId, dur: t.prep, label: 'Get ready', adj: 'none' });
        });
      }
    });

    if (plan.cool.length) {
      if (t.prep) out.push({ phase: 'prep', ex: plan.cool[0], dur: t.prep, label: 'Cool-down next', adj: 'none' });
      const cd = split(plan.coolSec, plan.cool.length);
      plan.cool.forEach((id, i) => pushEx('cooldown', id, cd[i], `Cool-down · ${i + 1}/${plan.cool.length}`, { adj: 'cool' }));
    }

    fitExactly(out, plan, t);

    const res = out.filter((x) => x.dur > 0);
    for (let i = 0; i < res.length; i++) {
      for (let j = i + 1; j < res.length; j++) {
        if (res[j].phase !== 'rest' && res[j].phase !== 'prep' && res[j].ex !== res[i].ex) { res[i].next = res[j].ex; break; }
      }
    }
    return res;
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
    // 1) auto-length warm-up / cool-down absorb the difference first
    const flex = out.filter((x) => (x.adj === 'warm' && !t.warmMin) || (x.adj === 'cool' && !t.coolMin));
    spread(flex, (x) => Math.round(15 * half(x)), (x) => Math.round(90 * half(x)));
    // 2) then rests (±50%)
    spread(out.filter((x) => x.adj === 'rest'), (x) => Math.round(x.dur * 0.5), (x) => Math.round(x.dur * 1.5));
    // 3) then work intervals (±25%)
    spread(out.filter((x) => x.adj === 'work'), (x) => Math.round(x.dur * 0.75), (x) => Math.round(x.dur * 1.25));
    // 4) anything left goes on the last interval
    if (diff) out[out.length - 1].dur = Math.max(1, out[out.length - 1].dur + diff);
  }

  function totalDuration(plan) {
    return buildIntervals(plan).reduce((s, x) => s + x.dur, 0);
  }

  // Replace one exercise with another of the same category, keeping the flow.
  function swap(plan, blockIdx, exIdx) {
    const b = plan.blocks[blockIdx];
    const cur = EX[b.ex[exIdx]];
    const inPlan = new Set(plan.blocks.flatMap((x) => x.ex));
    let p = pool(cur.cat, plan.level, inPlan);
    if (!p.length) p = EXERCISES.filter((e) => e.cat === cur.cat && e.id !== cur.id && e.level <= plan.level);
    if (!p.length) return false;
    b.ex[exIdx] = p[rnd(p.length)].id;
    b.ex = bestOrder(b.ex.map((id) => EX[id]), b.rounds).map((e) => e.id);
    return true;
  }

  global.Generator = { generate, buildIntervals, totalDuration, swap, FOCUS_LABEL, FOCUS_SHORT, LEVEL_TIMING, DEFAULT_TIMING };
})(window);
