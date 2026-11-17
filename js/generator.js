// Workout generator: one continuous, varied session that fits the selected total time exactly.
// The main part is a sequence of mini full-body circuits ("segments") of `restEvery` exercises,
// with a real rest only between segments. Warm-up, get-ready countdowns, side switches,
// rests and cool-down are all counted in the total.
(function (global) {
  const LEVEL_TIMING = {
    1: { work: 30, rest: 45, restEvery: 5 },
    2: { work: 40, rest: 40, restEvery: 6 },
    3: { work: 45, rest: 30, restEvery: 6 },
  };
  const DEFAULT_TIMING = Object.assign({ prep: 5, switch: 2, warmOn: true, warmMin: 0, coolOn: true, coolMin: 0 }, LEVEL_TIMING[1]);

  // What each segment should contain, by focus (the first slots matter most).
  const SEGMENT = {
    full: { base: ['ballistic', 'squat', 'push', 'pull', 'core', 'hinge'], extra: ['lunge', 'total', 'hinge', 'core', 'arms', 'lunge'] },
    lower: { base: ['ballistic', 'squat', 'hinge', 'lunge', 'core', 'pull'], extra: ['squat', 'lunge', 'hinge', 'push', 'total'] },
    upper: { base: ['push', 'pull', 'ballistic', 'arms', 'core', 'push'], extra: ['pull', 'arms', 'total', 'squat', 'push'] },
    core: { base: ['ballistic', 'core', 'squat', 'core', 'push', 'pull'], extra: ['core', 'lunge', 'total', 'hinge', 'core'] },
  };
  // Where to look when a category has nothing fresh left
  const FALLBACK = {
    ballistic: ['hinge', 'total'], squat: ['lunge', 'total'], lunge: ['squat', 'hinge'], hinge: ['ballistic', 'lunge'],
    push: ['total', 'arms'], pull: ['arms', 'total'], arms: ['push', 'pull'], core: ['total', 'hinge'], total: ['core', 'ballistic'],
  };
  const FOCUS_SHORT = { full: 'Full body', lower: 'Legs', upper: 'Upper body', core: 'Core' };
  const FOCUS_LABEL = { full: 'Full body', lower: 'Legs focus', upper: 'Upper body focus', core: 'Core focus' };

  // Body / kettlebell position at the start and end of each movement, used to make transitions natural.
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
  };
  const STANDING = new Set(['hang', 'goblet', 'rack', 'oh']);
  const NEAR = new Set(['hang|goblet', 'goblet|rack', 'rack|oh', 'goblet|kneel', 'rack|kneel', 'supine|seated', 'supine|prone', 'prone|seated']);
  const startPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[0] : p; };
  const endPos = (e) => { const p = POS[e.anim] || 'hang'; return Array.isArray(p) ? p[1] : p; };
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

  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const weightedPick = (items) => {
    let r = Math.random() * items.reduce((s, x) => s + x[1], 0);
    for (const [e, w] of items) { r -= w; if (r <= 0) return e; }
    return items.length ? items[items.length - 1][0] : null;
  };

  // ---------- Exercise selection ----------
  // usedAt: Map id -> index of the segment where it was last used.
  // Non-staple exercises never repeat; staples may come back, but not within 2 segments.
  function pickFor(cat, ctx) {
    const { level, usedAt, seg, segAnims, recent } = ctx;
    const count = ctx.usedCount || new Map();
    const cap = ctx.maxUses || 3;
    const maxUses = (e) => (e.cat === 'ballistic' ? cap + 1 : cap);
    const ok = (e) => e.level <= level && !segAnims.has(e.anim);
    const weight = (e) => (e.level === level ? 3 : e.level === level - 1 ? 2 : 1) * (recent.has(e.id) ? 0.12 : 1);
    const fresh = (c) => EXERCISES.filter((e) => e.cat === c && ok(e) && !usedAt.has(e.id));
    const again = (c, gap) => EXERCISES.filter((e) => e.cat === c && ok(e) && e.staple && usedAt.has(e.id) &&
      seg - usedAt.get(e.id) >= gap && (count.get(e.id) || 0) < maxUses(e));
    // Swings are meant to come back (they anchor each circuit); other categories prefer a fresh
    // exercise from a related category before repeating a staple.
    const tries = cat === 'ballistic'
      ? [() => fresh(cat), () => again(cat, 1), ...FALLBACK[cat].map((c) => () => fresh(c))]
      : [() => fresh(cat), ...FALLBACK[cat].map((c) => () => fresh(c)), () => again(cat, 2), ...FALLBACK[cat].map((c) => () => again(c, 2))];
    tries.push(() => again(cat, 1));
    for (const f of tries) {
      const list = f();
      if (list.length) return weightedPick(list.map((e) => [e, weight(e) * (usedAt.has(e.id) ? 0.5 : 1)]));
    }
    // Very long sessions: reuse the least-used exercise of the category (staples first)
    const last = EXERCISES.filter((e) => e.cat === cat && e.level <= level && !segAnims.has(e.anim) && seg - (usedAt.has(e.id) ? usedAt.get(e.id) : -9) >= 1);
    return last.length ? weightedPick(last.map((e) => [e, (e.staple ? 3 : 1) / (1 + (count.get(e.id) || 0)) ** 2])) : null;
  }

  // ---------- Flow ordering inside a segment ----------
  const IGNORE_MUSCLE = new Set(['cardio', 'core', 'balance', 'mobility']);
  function pairCost(a, b) {
    let c = 3 * posCost(endPos(a), startPos(b));
    for (const m of a.muscles) if (!IGNORE_MUSCLE.has(m) && b.muscles.includes(m)) c += 2;
    if (a.cat === b.cat) c += 4;
    return c;
  }
  function seqCost(seq) {
    const n = seq.length;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const e = seq[i];
      if (i > 0) c += pairCost(seq[i - 1], e);
      if (i > 1) for (const m of seq[i - 2].muscles) if (!IGNORE_MUSCLE.has(m) && e.muscles.includes(m) && seq[i - 1].muscles.includes(m)) c += 4;
      const demanding = e.cat === 'ballistic' || e.level === 3 || (e.cat === 'total' && e.anim !== 'carry');
      if (demanding) c += i * 1.6; // explosive / technical first
      if (e.cat === 'core') c += (n - 1 - i) * 0.8; // core at the end
      if (!STANDING.has(startPos(e))) c += (n - 1 - i) * 0.8; // floor work at the end
    }
    return c;
  }
  function bestOrder(list) {
    if (list.length > 8) return list;
    let best = list.slice(), bestCost = Infinity;
    const used = new Array(list.length).fill(false);
    const cur = [];
    (function rec(partial) {
      if (partial >= bestCost) return;
      if (cur.length === list.length) {
        const c = seqCost(cur) + Math.random() * 1.5;
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
  const segSec = (seg, t) => seg.reduce((s, e) => s + exSec(e, t), 0) + (seg.length - 1) * t.prep;

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

  function slotsFor(focus, k, segIdx) {
    const def = SEGMENT[focus];
    let base = def.base.slice();
    if (k < base.length) {
      // rotate which secondary slots are kept so consecutive segments differ
      const keep = base.slice(0, 2);
      const rest = base.slice(2);
      const off = segIdx % rest.length;
      base = keep.concat(rest.slice(off).concat(rest.slice(0, off))).slice(0, k);
    } else {
      const extra = shuffle(def.extra);
      while (base.length < k) base.push(extra[(base.length - def.base.length) % extra.length]);
    }
    return base;
  }

  // Build the main sequence of segments to fill mainSec. `seed` = exercise ids to keep if possible.
  function buildMain(t, level, focus, mainSec, recent, seed) {
    const usedAt = new Map();
    const usedCount = new Map();
    const segments = [];
    // How many times a staple may appear depends on how long the session is vs. how many exercises fit the level
    const poolSize = EXERCISES.filter((e) => e.level <= level && !['warmup', 'stretch'].includes(e.cat)).length;
    const estSlots = mainSec / (t.work + t.prep + t.rest / t.restEvery + 1);
    const maxUses = Math.max(3, Math.ceil((estSlots / poolSize) * 2.5));
    const queue = (seed || []).filter((id) => EX[id]);
    let remaining = mainSec;
    for (let s = 0; s < 60; s++) {
      const k = t.restEvery;
      let seg = [];
      const segAnims = new Set();
      while (queue.length && seg.length < k) { const e = EX[queue.shift()]; seg.push(e); segAnims.add(e.anim); }
      if (seg.length < k) {
        const have = new Set(seg.map((e) => e.cat));
        for (const cat of slotsFor(focus, k, s)) {
          if (seg.length >= k) break;
          if (have.has(cat) && seg.length < k && Math.random() < 0.5) continue;
          const e = pickFor(cat, { level, usedAt, usedCount, maxUses, seg: s, segAnims, recent });
          if (e && !seg.includes(e)) { seg.push(e); segAnims.add(e.anim); }
        }
        // top up if some slots were skipped
        for (const cat of shuffle(SEGMENT[focus].extra)) {
          if (seg.length >= k) break;
          const e = pickFor(cat, { level, usedAt, usedCount, maxUses, seg: s, segAnims, recent });
          if (e && !seg.includes(e)) { seg.push(e); segAnims.add(e.anim); }
        }
      }
      const restAfter = t.rest + t.prep;
      // shrink the last segment to fit the remaining time
      while (seg.length > 1 && segSec(seg, t) > remaining + t.work * 0.4) seg.pop();
      if (segSec(seg, t) > remaining + t.work * 0.6 && segments.length) break;
      seg = bestOrder(seg);
      seg.forEach((e) => { usedAt.set(e.id, s); usedCount.set(e.id, (usedCount.get(e.id) || 0) + 1); });
      segments.push(seg.map((e) => e.id));
      remaining -= segSec(seg, t);
      if (remaining < t.work + restAfter) break;
      remaining -= restAfter;
    }
    return segments;
  }

  function generate(opts) {
    const minutes = opts.minutes, level = opts.level, focus = opts.focus || 'full';
    const t = normTiming(opts.timing);
    const target = minutes * 60;
    const recent = new Set(opts.recent || []);
    const B = budget(target, t);
    const segments = buildMain(t, level, focus, B.mainSec, recent);
    const warm = t.warmOn ? pickOrdered('warmup', WARM_MUST, Math.max(2, Math.round(B.warmSec / 30)), recent) : [];
    const cool = t.coolOn ? pickOrdered('stretch', COOL_MUST, Math.max(2, Math.round(B.coolSec / 35)), recent) : [];
    return { v: 3, minutes, level, focus, target, timing: t, warm, cool, warmSec: B.warmSec, coolSec: B.coolSec, segments, created: Date.now() };
  }

  // Apply new timing to an existing plan, keeping as many of its exercises as possible.
  function retime(plan, timing) {
    const t = normTiming(timing);
    const B = budget(plan.target, t);
    plan.timing = t;
    plan.warmSec = B.warmSec; plan.coolSec = B.coolSec;
    plan.segments = buildMain(t, plan.level, plan.focus, B.mainSec, new Set(), plan.segments.flat());
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
    // One-sided moves: right side, a short switch, then left side.
    const pushEx = (phase, id, dur, label, extra) => {
      const e = EX[id];
      if (e.uni) {
        const h = Math.ceil(dur / 2);
        out.push(Object.assign({ phase, ex: id, dur: h, side: 'Right side', label }, extra));
        if (t.switch > 0) out.push({ phase: 'switch', ex: id, dur: t.switch, label: 'Switch sides', adj: 'none' });
        out.push(Object.assign({ phase, ex: id, dur: dur - h, side: 'Left side', label, sideSwitch: t.switch === 0 }, extra));
      } else {
        out.push(Object.assign({ phase, ex: id, dur, side: e.alt ? 'Alternate' : null, label }, extra));
      }
    };
    const main = plan.segments.flat();
    const firstEx = plan.warm[0] || main[0];
    out.push({ phase: 'prep', ex: firstEx, dur: startPrep(t), label: 'Get ready', adj: 'none' });

    const wd = split(plan.warmSec, Math.max(1, plan.warm.length));
    plan.warm.forEach((id, i) => pushEx('warmup', id, wd[i], `Warm-up · ${i + 1}/${plan.warm.length}`, { adj: 'warm' }));
    if (plan.warm.length) out.push({ phase: 'prep', ex: main[0], dur: grabPrep(t), label: 'Grab your kettlebell', adj: 'none' });

    let n = 0;
    plan.segments.forEach((seg, si) => {
      seg.forEach((id, i) => {
        n++;
        pushEx('work', id, t.work, `Exercise ${n}/${main.length} · Circuit ${si + 1}/${plan.segments.length}`, { seg: si, adj: 'work' });
        const lastInSeg = i === seg.length - 1;
        if (lastInSeg && si === plan.segments.length - 1) return;
        const nextId = lastInSeg ? plan.segments[si + 1][0] : seg[i + 1];
        if (lastInSeg && t.rest > 0) out.push({ phase: 'rest', ex: nextId, dur: t.rest, label: `Rest · circuit ${si + 2} next`, adj: 'rest' });
        if (t.prep > 0) out.push({ phase: 'prep', ex: nextId, dur: t.prep, label: 'Get ready', adj: 'none' });
      });
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
        if (!['rest', 'prep', 'switch'].includes(res[j].phase) && res[j].ex !== res[i].ex) { res[i].next = res[j].ex; break; }
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
    const flex = out.filter((x) => (x.adj === 'warm' && !t.warmMin) || (x.adj === 'cool' && !t.coolMin));
    spread(flex, (x) => Math.round(15 * half(x)), (x) => Math.round(90 * half(x)));
    spread(out.filter((x) => x.adj === 'rest'), (x) => Math.round(x.dur * 0.5), (x) => Math.round(x.dur * 1.5));
    spread(out.filter((x) => x.adj === 'work'), (x) => Math.round(x.dur * 0.75), (x) => Math.round(x.dur * 1.25));
    if (diff) out[out.length - 1].dur = Math.max(1, out[out.length - 1].dur + diff);
  }

  function totalDuration(plan) {
    return buildIntervals(plan).reduce((s, x) => s + x.dur, 0);
  }

  // Replace one exercise with another of the same category (fresh if possible), keeping the flow.
  function swap(plan, segIdx, exIdx, recent) {
    const seg = plan.segments[segIdx];
    const cur = EX[seg[exIdx]];
    const usedAt = new Map(), usedCount = new Map();
    plan.segments.forEach((s, si) => s.forEach((id) => { usedAt.set(id, si); usedCount.set(id, (usedCount.get(id) || 0) + 1); }));
    const segAnims = new Set(seg.map((id) => EX[id].anim));
    segAnims.delete(cur.anim);
    const e = pickFor(cur.cat, { level: plan.level, usedAt, usedCount, seg: segIdx, segAnims, recent: new Set(recent || []) });
    if (!e || e.id === cur.id) return false;
    seg[exIdx] = e.id;
    plan.segments[segIdx] = bestOrder(seg.map((id) => EX[id])).map((x) => x.id);
    return true;
  }

  global.Generator = { generate, retime, buildIntervals, totalDuration, swap, FOCUS_LABEL, FOCUS_SHORT, LEVEL_TIMING, DEFAULT_TIMING };
})(window);
