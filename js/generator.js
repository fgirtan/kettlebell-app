// Workout generator: builds a time-boxed, full-body session with a logical flow.
(function (global) {
  const LEVEL_TIMING = {
    1: { work: 30, rest: 30, roundRest: 45 },
    2: { work: 40, rest: 20, roundRest: 30 },
    3: { work: 45, rest: 15, roundRest: 30 },
  };

  // Slot priorities per focus. The first N slots are used, then the order is optimised.
  const TEMPLATES = {
    full: ['ballistic', 'squat', 'push', 'pull', 'core', 'lunge', 'hinge', 'total'],
    lower: ['ballistic', 'squat', 'pull', 'hinge', 'lunge', 'core', 'squat', 'push'],
    upper: ['push', 'pull', 'ballistic', 'squat', 'arms', 'pull', 'core', 'push'],
    core: ['ballistic', 'core', 'squat', 'push', 'core', 'pull', 'lunge', 'core'],
  };
  const FOCUS_SHORT = { full: 'Tot corpul', lower: 'Picioare', upper: 'Superior', core: 'Core' };
  const FOCUS_LABEL = { full: 'Tot corpul', lower: 'Accent picioare', upper: 'Accent partea superioară', core: 'Accent core' };

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
    // Prefer exercises close to the user's level and with a different movement than ones already chosen
    const weighted = [];
    for (const e of p) {
      let w = e.level === level ? 3 : e.level === level - 1 ? 2 : 1;
      if (avoidAnims && avoidAnims.has(e.anim)) w = 0.3;
      weighted.push([e, w]);
    }
    const total = weighted.reduce((s, x) => s + x[1], 0);
    let r = Math.random() * total;
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
    let best = null, bestCost = Infinity;
    const used = new Array(list.length).fill(false);
    const cur = [];
    (function rec(partial) {
      if (partial >= bestCost) return;
      if (cur.length === list.length) {
        const c = seqCost(cur, rounds) + Math.random() * 0.5; // small jitter for variety
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
  function chooseShape(blockSec, t, maxRounds) {
    const S = t.work + t.rest;
    let best = null;
    for (let n = 3; n <= 8; n++) {
      for (let r = 1; r <= maxRounds; r++) {
        const real = n * S * r - t.rest + (r - 1) * (t.roundRest - t.rest);
        const diff = Math.abs(real - blockSec);
        const pref = Math.abs(n - 6) * 8 + (r === 1 ? 40 : 0) + (r > 4 ? (r - 4) * 20 : 0);
        const score = diff + pref;
        if (!best || score < best.score) best = { n, r, real, score };
      }
    }
    return best;
  }

  function settingsTiming(level, custom) {
    const t = Object.assign({}, LEVEL_TIMING[level]);
    if (custom && custom.enabled) {
      t.work = custom.work; t.rest = custom.rest; t.roundRest = custom.roundRest;
    }
    return t;
  }

  function generate(opts) {
    const minutes = opts.minutes, level = opts.level, focus = opts.focus || 'full';
    const t = settingsTiming(level, opts.custom);
    const target = minutes * 60;

    const warmSec = minutes < 10 ? 60 : Math.min(300, Math.max(120, Math.round((target * 0.12) / 30) * 30));
    const coolSec = minutes < 10 ? 60 : Math.min(240, Math.max(90, Math.round((target * 0.08) / 30) * 30));
    const mainSec = target - warmSec - coolSec;

    const nBlocks = mainSec <= 18 * 60 ? 1 : mainSec <= 36 * 60 ? 2 : 3;
    const blockRest = 60;
    const perBlock = (mainSec - (nBlocks - 1) * blockRest) / nBlocks;

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
      const ordered = bestOrder(chosen, shape.r);
      blocks.push({ ex: ordered.map((e) => e.id), rounds: shape.r, work: t.work, rest: t.rest, roundRest: t.roundRest });
    }

    // Warm-up: general → shoulders → hips → legs → floor activation
    const nWarm = Math.max(2, Math.round(warmSec / 30));
    const warm = pickOrdered('warmup', WARM_MUST, nWarm);
    const nCool = Math.max(2, Math.round(coolSec / 35));
    const cool = pickOrdered('stretch', COOL_MUST, nCool);

    const plan = { minutes, level, focus, target, warm, cool, blocks, blockRest, warmDur: 30, coolDur: 30, created: Date.now() };
    balance(plan);
    return plan;
  }

  function pickOrdered(cat, must, n) {
    const all = EXERCISES.filter((e) => e.cat === cat);
    const ids = new Set(must.slice(0, n));
    for (const e of shuffle(all)) { if (ids.size >= n) break; ids.add(e.id); }
    return [...ids].map((id) => EX[id]).sort((a, b) => a.order - b.order).map((e) => e.id);
  }

  function mainDuration(plan) {
    let s = 0;
    plan.blocks.forEach((b, i) => {
      const S = b.work + b.rest;
      s += b.ex.length * S * b.rounds - b.rest + (b.rounds - 1) * (b.roundRest - b.rest);
      if (i > 0) s += plan.blockRest;
    });
    return s;
  }

  // Stretch/shrink warm-up and cool-down items so the session matches the selected time.
  function balance(plan) {
    const fixed = mainDuration(plan) + 10 + 15; // + get ready + kettlebell prep
    const items = plan.warm.length + plan.cool.length;
    let per = (plan.target - fixed) / items;
    per = Math.max(20, Math.min(60, Math.round(per / 5) * 5));
    plan.warmDur = per; plan.coolDur = per;
  }

  function totalDuration(plan) {
    return buildIntervals(plan).reduce((s, x) => s + x.dur, 0);
  }

  // ---------- Interval timeline ----------
  function buildIntervals(plan) {
    const out = [];
    const firstEx = plan.warm[0];
    out.push({ phase: 'ready', ex: firstEx, dur: 10, label: 'Pregătește-te' });
    const pushEx = (phase, id, dur, label, extra) => {
      const e = EX[id];
      if (e.uni) {
        const h = Math.round(dur / 2);
        out.push(Object.assign({ phase, ex: id, dur: h, side: 'Stânga', label }, extra));
        out.push(Object.assign({ phase, ex: id, dur: dur - h, side: 'Dreapta', label, sideSwitch: true }, extra));
      } else {
        out.push(Object.assign({ phase, ex: id, dur, side: e.alt ? 'Alternează' : null, label }, extra));
      }
    };
    plan.warm.forEach((id, i) => pushEx('warmup', id, plan.warmDur, `Încălzire · ${i + 1}/${plan.warm.length}`));
    plan.blocks.forEach((b, bi) => {
      if (bi > 0) out.push({ phase: 'blockrest', ex: b.ex[0], dur: plan.blockRest, label: `Pauză · urmează Blocul ${bi + 1}` });
      else out.push({ phase: 'rest', ex: b.ex[0], dur: 15, label: 'Pregătește kettlebell-ul' });
      for (let r = 0; r < b.rounds; r++) {
        b.ex.forEach((id, i) => {
          const label = `${plan.blocks.length > 1 ? `Blocul ${bi + 1} · ` : ''}Runda ${r + 1}/${b.rounds} · ${i + 1}/${b.ex.length}`;
          pushEx('work', id, b.work, label, { block: bi, round: r, station: i });
          const lastInRound = i === b.ex.length - 1;
          const lastRound = r === b.rounds - 1;
          if (lastInRound && lastRound) return;
          const nextId = lastInRound ? b.ex[0] : b.ex[i + 1];
          if (lastInRound) out.push({ phase: 'rest', ex: nextId, dur: b.roundRest, label: `Pauză între runde · urmează runda ${r + 2}` });
          else if (b.rest > 0) out.push({ phase: 'rest', ex: nextId, dur: b.rest, label: 'Pauză' });
        });
      }
    });
    plan.cool.forEach((id, i) => pushEx('cooldown', id, plan.coolDur, `Revenire · ${i + 1}/${plan.cool.length}`));
    // annotate "next" exercise for previews
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (out[j].phase !== 'rest' && out[j].phase !== 'blockrest' && out[j].ex !== out[i].ex) { out[i].next = out[j].ex; break; }
      }
    }
    return out;
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
    balance(plan);
    return true;
  }

  global.Generator = { generate, buildIntervals, totalDuration, swap, FOCUS_LABEL, FOCUS_SHORT, LEVEL_TIMING };
})(window);
