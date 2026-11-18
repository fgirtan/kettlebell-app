// Recovery module: quiet, equipment-free mobility + stretching + breathing session that fits the chosen time.
// No jumps or impact – suitable for an apartment. Flow: standing → floor (all fours → kneeling → seated →
// on the belly → on the back) → final relaxed breathing, so you never have to get up and down again.
(function (global) {
  'use strict';

  const DEFAULTS = { minutes: 15, focus: 'full', hold: 0, prep: 5, switch: 3, breath: true };

  // Stage = where in the flow the move belongs (lower = earlier).
  const STAGE = {
    r_breath: 1,
    r_neck: 2, r_shoulder: 2, w_arms: 2, w_halo: 2, w_hips: 2, w_gm: 2,
    s_chest: 3, s_shoulder: 3, s_quad: 3, r_calf: 3, s_fold: 3, s_squat: 3, w_wgs: 3,
    w_inch: 4, s_dog: 4,
    r_catcow: 5, r_thread: 5, w_birddog: 5, s_child: 5,
    s_hipflex: 6, r_lizard: 6, r_pigeon: 6,
    r_butterfly: 7, s_seated: 7, r_seatedTwist: 7,
    s_cobra: 8, r_sphinx: 8,
    s_knees: 9, r_fig4: 9, r_happy: 9, r_twist: 9, w_bridge: 9, r_deadbug: 9, r_legsWall: 9,
    r_relax: 10,
  };
  // Mobility moves (keep moving) vs. static holds
  const MOBILITY = new Set(['r_neck', 'r_shoulder', 'w_arms', 'w_halo', 'w_hips', 'w_gm', 'w_wgs', 'w_inch', 'r_catcow', 'w_birddog', 'r_deadbug', 'w_bridge']);

  const FOCUS = {
    full: { label: 'Full body', w: {} },
    lower: { label: 'Hips & legs', w: { 3: 1.2, 6: 2, 7: 1.6, 9: 1.6, 2: 0.6, 8: 0.6 }, muscles: ['hips', 'hamstrings', 'quads', 'glutes', 'calves', 'adductors', 'hip flexors', 'piriformis'] },
    upper: { label: 'Back & shoulders', w: { 2: 1.8, 3: 1.2, 5: 2, 8: 1.6, 6: 0.5, 7: 0.8 }, muscles: ['shoulders', 'upper back', 'back', 'chest', 'spine', 'neck', 'thoracic spine', 'lower back'] },
    calm: { label: 'Wind-down', w: { 2: 0.6, 3: 0.6, 4: 0.3, 5: 1.4, 7: 1.4, 9: 2 } },
  };

  const rnd = (n) => Math.floor(Math.random() * n);

  function cfgOf(api) {
    api.S.recovery = Object.assign({}, DEFAULTS, api.S.recovery || {});
    return api.S.recovery;
  }

  const holdFor = (c) => c.hold || (c.focus === 'calm' ? 60 : 45);
  const itemSec = (e, c) => { const h = MOBILITY.has(e.id) ? Math.min(45, holdFor(c)) : holdFor(c); return (e.uni ? 2 * h + c.switch : h) + c.prep; };

  function generate(c, recent) {
    const target = c.minutes * 60;
    const F = FOCUS[c.focus] || FOCUS.full;
    const pool = Object.keys(STAGE).filter((id) => EX[id] && id !== 'r_breath' && id !== 'r_relax').map((id) => EX[id]);
    const relaxSec = c.minutes >= 6 ? Math.max(60, Math.min(180, Math.round(target * 0.08 / 15) * 15)) : 0;
    const opener = c.breath && c.minutes >= 8;
    let remaining = target - Math.max(3, c.prep) - (relaxSec ? relaxSec + c.prep : 0) - (opener ? 60 + c.prep : 0);
    const weight = (e) => {
      let w = F.w[STAGE[e.id]] || 1;
      if (F.muscles && e.muscles.some((m) => F.muscles.includes(m))) w *= 1.8;
      if (recent && recent.has(e.id)) w *= 0.35;
      return w;
    };
    const chosen = [];
    const left = pool.slice();
    while (left.length) {
      const fits = left.filter((e) => itemSec(e, c) <= remaining + 15);
      if (!fits.length) break;
      let r = Math.random() * fits.reduce((s, e) => s + weight(e), 0);
      let pick = fits[fits.length - 1];
      for (const e of fits) { r -= weight(e); if (r <= 0) { pick = e; break; } }
      chosen.push(pick);
      left.splice(left.indexOf(pick), 1);
      remaining -= itemSec(pick, c);
    }
    // keep the flow: standing → floor; inside a stage mobility moves come before static holds
    chosen.sort((a, b) => STAGE[a.id] - STAGE[b.id] || (MOBILITY.has(b.id) - MOBILITY.has(a.id)) || Math.random() - 0.5);
    const items = (opener ? [EX.r_breath] : []).concat(chosen, relaxSec ? [EX.r_relax] : []).map((e) => e.id);
    return { kind: 'recovery', minutes: c.minutes, focus: c.focus, target, cfg: Object.assign({}, c), items, relaxSec, created: Date.now() };
  }

  function buildIntervals(plan) {
    const c = plan.cfg;
    const out = [];
    const n = plan.items.length;
    plan.items.forEach((id, i) => {
      const e = EX[id];
      out.push({ phase: 'prep', ex: id, dur: i === 0 ? Math.max(3, c.prep) : c.prep, label: i === 0 ? 'Get ready' : 'Next', adj: 'none' });
      const label = `${i + 1}/${n} · ${STAGE[id] >= 5 && STAGE[id] < 10 ? 'On the floor' : STAGE[id] === 10 ? 'Relax' : STAGE[id] === 1 ? 'Breathe' : 'Standing'}`;
      let h = id === 'r_relax' ? plan.relaxSec : id === 'r_breath' ? 60 : MOBILITY.has(id) ? Math.min(45, holdFor(c)) : holdFor(c);
      if (e.uni) {
        out.push({ phase: 'recover', ex: id, dur: h, side: 'Right side', label, adj: 'hold' });
        if (c.switch) out.push({ phase: 'switch', ex: id, dur: c.switch, label: 'Switch sides', adj: 'none' });
        out.push({ phase: 'recover', ex: id, dur: h, side: 'Left side', label, adj: 'hold', sideSwitch: !c.switch });
      } else out.push({ phase: 'recover', ex: id, dur: h, side: e.alt ? 'Alternate' : null, label, adj: id === 'r_relax' ? 'relax' : 'hold' });
    });
    // fit the chosen minutes exactly by lengthening/shortening holds (20–120 s)
    let diff = plan.target - out.reduce((s, x) => s + x.dur, 0);
    const spread = (items, lo, hi) => {
      let moved = true;
      while (diff && moved) {
        moved = false;
        for (const x of items) {
          if (diff > 0 && x.dur < hi(x)) { x.dur++; diff--; moved = true; } else if (diff < 0 && x.dur > lo(x)) { x.dur--; diff++; moved = true; }
          if (!diff) break;
        }
      }
    };
    spread(out.filter((x) => x.adj === 'hold' || x.adj === 'relax'), (x) => (x.side && x.side !== 'Alternate' ? 15 : 20), (x) => (x.adj === 'relax' ? 300 : x.side && x.side !== 'Alternate' ? 90 : 120));
    if (diff) out[out.length - 1].dur = Math.max(5, out[out.length - 1].dur + diff);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) if (out[j].phase === 'recover' && out[j].ex !== out[i].ex) { out[i].next = out[j].ex; break; }
    }
    return out;
  }

  // ---------- Setup screen ----------
  function render(v, api) {
    const { ICON, fmt, fmtSec, save, $, $$ } = api;
    const c = cfgOf(api);
    const step = (key, label, sub, min, max, st, show) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
      <div class="stepper"><button class="icon-btn" data-rstep="${key}" data-d="${-st}" data-min="${min}" data-max="${max}" aria-label="Less">${ICON.minus}</button>
      <b id="rv_${key}">${show(c[key])}</b>
      <button class="icon-btn" data-rstep="${key}" data-d="${st}" data-min="${min}" data-max="${max}" aria-label="More">${ICON.plus}</button></div></div>`;
    const holdShow = (x) => (x ? x + 's' : 'auto');
    v.innerHTML = `
      <div class="card">
        <p class="label">How long?</p>
        <div class="duration">
          <button class="icon-btn" data-rmin="-5" aria-label="Less time">${ICON.minus}</button>
          <div class="num"><span id="rNum">${c.minutes}</span><small>min</small></div>
          <button class="icon-btn" data-rmin="5" aria-label="More time">${ICON.plus}</button>
        </div>
        <div class="chips">${[5, 10, 15, 20, 30, 45].map((m) => `<button class="chip ${m === c.minutes ? 'on' : ''}" data-rchip="${m}">${m} min</button>`).join('')}</div>
        <p class="small muted" style="margin:10px 2px 0">Quiet and equipment-free: no jumping, nothing that thuds on the floor. Use a mat or carpet for the floor part.</p>
      </div>
      <div class="card">
        <p class="label">Focus</p>
        <div class="seg wrap" id="rFocus">${Object.entries(FOCUS).map(([k, f]) => `<button data-f="${k}" class="${c.focus === k ? 'on' : ''}">${f.label}</button>`).join('')}</div>
      </div>
      <div class="card">
        <p class="label">Timing</p>
        ${step('hold', 'Hold time', 'Per stretch (each side for one-sided ones). Auto = 45s, 60s for wind-down', 0, 120, 15, holdShow)}
        ${step('prep', 'Get ready', 'Time to get into position', 3, 20, 1, fmtSec)}
        ${step('switch', 'Switch sides', '', 0, 10, 1, fmtSec)}
        <div class="set-row"><div><div>Breathing opener</div><div class="small muted">Start with a minute of slow breathing (8+ min sessions)</div></div><label class="switch"><input type="checkbox" id="rBreath" ${c.breath ? 'checked' : ''}><span></span></label></div>
      </div>
      <button class="btn primary block big" id="rGen">${api.store.recPlan ? 'New recovery session' : 'Create recovery session'}</button>
      <div id="rPreview"></div>`;
    const regen = () => {
      const recent = new Set((api.store.recPlan && api.store.recPlan.items) || []);
      api.store.recPlan = generate(c, recent); save(); preview();
    };
    const setMin = (m) => { c.minutes = Math.max(5, Math.min(60, m)); $('#rNum').textContent = c.minutes; $$('[data-rchip]').forEach((x) => x.classList.toggle('on', +x.dataset.rchip === c.minutes)); save(); if (api.store.recPlan) regen(); };
    $$('[data-rmin]').forEach((b) => (b.onclick = () => setMin(c.minutes + +b.dataset.rmin)));
    $$('[data-rchip]').forEach((b) => (b.onclick = () => setMin(+b.dataset.rchip)));
    $$('#rFocus button').forEach((b) => (b.onclick = () => { c.focus = b.dataset.f; $$('#rFocus button').forEach((x) => x.classList.toggle('on', x === b)); save(); if (api.store.recPlan) regen(); }));
    $$('[data-rstep]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.rstep;
      let val = c[k] + +b.dataset.d;
      if (k === 'hold' && c[k] === 0 && +b.dataset.d > 0) val = 30;
      if (k === 'hold' && val > 0 && val < 20) val = 0;
      c[k] = Math.max(+b.dataset.min, Math.min(+b.dataset.max, val));
      $('#rv_' + k).textContent = k === 'hold' ? holdShow(c[k]) : fmtSec(c[k]);
      save(); if (api.store.recPlan) regen();
    }));
    $('#rBreath').onchange = (e) => { c.breath = e.target.checked; save(); if (api.store.recPlan) regen(); };
    $('#rGen').onclick = () => { regen(); setTimeout(() => $('#rPreview').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };

    function preview() {
      const plan = api.store.recPlan;
      const root = $('#rPreview');
      if (!plan) { root.innerHTML = ''; return; }
      const iv = buildIntervals(plan);
      const total = iv.reduce((s, x) => s + x.dur, 0);
      root.innerHTML = `<div style="height:18px"></div>
        <div class="summary">
          <div><b>${api.fmtMin(total)}</b><span>total</span></div>
          <div><b>${plan.items.length}</b><span>moves</span></div>
          <div><b>${FOCUS[plan.focus].label.split(' ')[0]}</b><span>focus</span></div>
        </div>
        <div class="flow-note">Gentle mobility first while standing, then down to the floor (all fours → kneeling → seated → on your belly → on your back) and a calm breathing finish, so you only go down once.</div>`;
      const groups = [['Standing', (s) => s <= 4], ['On the floor', (s) => s >= 5 && s < 10], ['Relax', (s) => s === 10]];
      let num = 0;
      for (const [title, test] of groups) {
        const ids = plan.items.filter((id) => test(STAGE[id]) || (title === 'Standing' && id === 'r_breath'));
        if (!ids.length) continue;
        const h = document.createElement('div'); h.className = 'block-head'; h.innerHTML = `<h3>${title}</h3><span class="small muted">${ids.length} moves</span>`; root.appendChild(h);
        const l = document.createElement('div'); l.className = 'ex-list'; root.appendChild(l);
        ids.forEach((id) => l.appendChild(api.exItem(id, ++num)));
      }
      const st = document.createElement('div');
      st.className = 'sticky-start';
      st.innerHTML = `<button class="btn primary block big">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start · ${api.fmtMin(total)}</button>`;
      st.querySelector('button').onclick = () => api.startPlayer(Object.assign({}, plan, { intervals: buildIntervals(plan) }));
      root.appendChild(st);
    }
    preview();
  }

  global.Recovery = { render, generate, buildIntervals, FOCUS, STAGE };
})(window);
