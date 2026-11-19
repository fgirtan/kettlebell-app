(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 4v16l10-8zM17 4h3v16h-3z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M19 4v16L9 12zM4 4h3v16H4z"/></svg>',
  };

  // ---------- Storage ----------
  const APP_VERSION = '2026.11.19 (v24)';
  const KEY = 'kettlebell.v1';
  const DEFAULTS = {
    settings: { minutes: 30, level: 1, focus: 'full', sound: true, voice: true, vibrate: true, theme: 'auto', voiceName: '', voiceRate: 1, voiceVol: 1, prepCue: 'ticks', silentMode: true, voiceEngine: 'clips', clipVoice: 'm', visual: 'photo', backSafe: true, lowFloor: true, twoBells: false, hrAge: 40, hrWarn: true, hrWarnPct: 85 },
    plan: null,
    history: [],
  };
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
  store = Object.assign({}, DEFAULTS, store);
  store.settings = Object.assign({}, DEFAULTS.settings, store.settings);
  const S = store.settings;
  delete S.custom; // old format
  // timing format v2 (rest every N exercises, side switch) – reset older saved timing to the new defaults
  if (!S.timing || S.timing.switch === undefined) S.timing = {};
  S.timing = Object.assign({}, Generator.DEFAULT_TIMING, Generator.LEVEL_TIMING[S.level], S.timing);
  store.recent = store.recent || [];
  if (store.plan && store.plan.v !== 4) store.plan = null; // plan from an older version
  if (!S.maleDefault) { S.clipVoice = 'm'; S.maleDefault = true; } // male voice chosen as the default
  window.KB_SETTINGS = S;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ } };
  save();

  function applyTheme() {
    if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', S.theme);
  }
  applyTheme();

  // ---------- Helpers ----------
  const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; };
  const fmtMin = (sec) => `${Math.round(sec / 60)} min`;
  const fmtSec = (s) => (s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60} min`) : `${s}s`);
  function svgFig() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fig'); return s; }
  // ---------- Heart rate (chest strap) in the players ----------
  const HRUI = {
    high: 0, lastWarn: 0,
    bind(el) {
      const upd = (b) => {
        if (!el.isConnected) return;
        el.hidden = !HR.connected && !b;
        el.innerHTML = `<span class="heart">♥</span> ${b || '--'}`;
        el.className = 'hr-badge z' + HR.zone(b, S);
      };
      upd(HR.bpm);
      return HR.on(upd);
    },
    // Called every tick: voice warning when heart rate stays above the limit for 10 s
    check(dt) {
      const b = HR.bpm;
      if (!S.hrWarn || !b) { this.high = 0; return; }
      if (b >= HR.maxHr(S) * (S.hrWarnPct / 100)) this.high += dt; else this.high = 0;
      if (this.high >= 10 && Date.now() - this.lastWarn > 60000) {
        this.lastWarn = Date.now(); this.high = 0;
        Fx.say('Heart rate high. Slow down and breathe.', true); Fx.buzz([200, 100, 200]);
        toast(`Heart rate ${b} – slow down, take a breather`);
      }
    },
  };

  // Real-person photo (start/end position cross-fading) when available, otherwise the animated figure
  const photoKey = (id) => (S.visual !== 'figure' && self.PHOTOS ? self.PHOTOS[id] : null);
  function photoEl(key, still) {
    const d = document.createElement('div');
    d.className = 'ph';
    d.innerHTML = still ? `<img src="photos/${key}_1.jpg" alt="" loading="lazy">`
      : `<img class="a" src="photos/${key}_0.jpg" alt=""><img class="b" src="photos/${key}_1.jpg" alt="">`;
    return d;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200); }
  const regionTag = (e) => `<span class="tag ${e.region}">${{ lower: 'Lower', upper: 'Upper', core: 'Core', total: 'Total' }[e.region]}</span>`;
  const sideNote = (e) => (e.uni ? ' · each side' : e.alt ? ' · alternating' : '');

  // ---------- Tabs ----------
  let tab = 'home';
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  const TITLES = { home: 'Kettlebell', boxing: 'Shadowboxing', recovery: 'Recovery', library: 'Exercises', history: 'History', settings: 'Settings' };

  function render() {
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#title').textContent = TITLES[tab];
    const v = $('#view');
    v.innerHTML = '';
    ({ home: renderHome, boxing: (el) => Boxing.render(el, api()), recovery: (el) => Recovery.render(el, api()), library: renderLibrary, history: renderHistory, settings: renderSettings })[tab](v);
  }

  // ---------- Home / generator ----------
  let timingOpen = false;
  function timingSummary() {
    const t = S.timing;
    const restTxt = t.restEvery > 1 ? `${t.rest}s rest every ${t.restEvery} exercises` : `${t.rest}s rest after each`;
    const warm = t.warmOn ? `warm-up ${t.warmMin ? t.warmMin + ' min' : 'auto'}` : 'no warm-up';
    const cool = t.coolOn ? `cool-down ${t.coolMin ? t.coolMin + ' min' : 'auto'}` : 'no cool-down';
    return `${t.work}s work · ${t.prep}s get ready · ${restTxt} · ${t.switch}s side switch · ${warm} · ${cool}`;
  }

  function stepper(key, label, sub, min, max, step, unit) {
    const val = S.timing[key];
    const show = unit === 'x' ? (val === 1 ? 'every' : `${val}`) : fmtSec(val);
    return `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
      <div class="stepper"><button class="icon-btn" data-step="${key}" data-d="${-step}" data-min="${min}" data-max="${max}" aria-label="Less">${ICON.minus}</button>
      <b id="v_${key}">${show}</b>
      <button class="icon-btn" data-step="${key}" data-d="${step}" data-min="${min}" data-max="${max}" aria-label="More">${ICON.plus}</button></div></div>`;
  }

  function durSeg(key, options) {
    return `<div class="seg mini" data-seg="${key}">${options.map((o) => `<button data-v="${o}" class="${S.timing[key] === o ? 'on' : ''}">${o ? o + 'm' : 'Auto'}</button>`).join('')}</div>`;
  }

  function renderHome(v) {
    v.insertAdjacentHTML('beforeend', `<div class="seg" id="kbMode" style="margin-bottom:14px">${[['gen', 'Generate'], ['custom', 'My workouts']].map(([k, l]) => `<button data-v="${k}" class="${(S.kbMode || 'gen') === k ? 'on' : ''}">${l}</button>`).join('')}</div>`);
    $$('#kbMode button').forEach((b) => (b.onclick = () => { S.kbMode = b.dataset.v; save(); render(); }));
    if (S.kbMode === 'custom') { Custom.render(v, api()); return; }
    v.insertAdjacentHTML('beforeend', `
      <div class="card">
        <p class="label">Total workout time</p>
        <div class="duration">
          <button class="icon-btn" id="dMinus" aria-label="Less time">${ICON.minus}</button>
          <div class="num"><span id="dNum">${S.minutes}</span><small>min</small></div>
          <button class="icon-btn" id="dPlus" aria-label="More time">${ICON.plus}</button>
        </div>
        <input type="range" id="dRange" min="5" max="90" step="5" value="${S.minutes}" aria-label="Duration">
        <div class="chips" style="margin-top:10px">${[10, 15, 20, 30, 45, 60].map((m) => `<button class="chip ${m === S.minutes ? 'on' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
        <p class="small muted" style="margin:10px 2px 0">Everything included: warm-up, work, rests, get-ready time and cool-down.</p>
      </div>
      <div class="card">
        <p class="label">Level</p>
        <div class="seg" id="lvl">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${l === S.level ? 'on' : ''}">${LEVEL_LABEL[l]}</button>`).join('')}</div>
        <p class="small muted" style="margin:10px 2px 0">Picks the exercises and loads that level's default intervals.</p>
      </div>
      <div class="card">
        <p class="label">Focus</p>
        <div class="seg wrap" id="focus">${Object.entries(Generator.FOCUS_SHORT).map(([k, l]) => `<button data-f="${k}" class="${k === S.focus ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="set-row" style="margin-top:6px;border-bottom:0"><div><div>Back-friendly</div><div class="small muted">No swings, cleans or bent-over holds; never two back-loading moves in a row. Strengthens the back with deadlifts, bridges and bird dogs instead.</div></div>
          <label class="switch"><input type="checkbox" id="backSafe" ${S.backSafe !== false ? 'checked' : ''}><span></span></label></div>
        <div class="set-row" style="border-bottom:0;padding-top:4px"><div><div>I have two kettlebells</div><div class="small muted">Also use exercises that need a bell in each hand.</div></div>
          <label class="switch"><input type="checkbox" id="twoBells" ${S.twoBells ? 'checked' : ''}><span></span></label></div>
        <div class="set-row" style="border-bottom:0;padding-top:4px"><div><div>Minimal floor work</div><div class="small muted">Almost everything standing; at most 1–2 floor moves at the very end, so you only get down once.</div></div>
          <label class="switch"><input type="checkbox" id="lowFloor" ${S.lowFloor !== false ? 'checked' : ''}><span></span></label></div>
      </div>
      <div class="card" id="timingCard">
        <button class="row timing-head" id="tToggle" aria-expanded="${timingOpen}">
          <div style="flex:1;text-align:left"><p class="label" style="margin:0 0 4px">Timing</p><div class="small muted" id="tSum">${timingSummary()}</div></div>
          <span class="chev ${timingOpen ? 'open' : ''}">${ICON.chevron}</span>
        </button>
        <div id="tBody" ${timingOpen ? '' : 'hidden'}>
          ${stepper('work', 'Work', 'Time on each exercise', 10, 180, 5)}
          ${stepper('prep', 'Get ready', 'Short countdown before each exercise', 0, 30, 1)}
          ${stepper('rest', 'Rest', 'A real break to recover', 0, 180, 5)}
          ${stepper('restEvery', 'Rest after every … exercises', 'In between you only get the get-ready countdown', 1, 10, 1, 'x')}
          ${stepper('switch', 'Switch sides', 'One-arm moves: right side, switch, left side', 0, 10, 1)}
          <div class="set-row"><div><div>Warm-up</div><div class="small muted">Mobility &amp; activation before the work</div></div><label class="switch"><input type="checkbox" data-tk="warmOn" ${S.timing.warmOn ? 'checked' : ''}><span></span></label></div>
          <div class="seg-row" ${S.timing.warmOn ? '' : 'hidden'} id="warmSeg">${durSeg('warmMin', [0, 2, 3, 5, 8, 10])}</div>
          <div class="set-row"><div><div>Cool-down</div><div class="small muted">Stretching at the end</div></div><label class="switch"><input type="checkbox" data-tk="coolOn" ${S.timing.coolOn ? 'checked' : ''}><span></span></label></div>
          <div class="seg-row" ${S.timing.coolOn ? '' : 'hidden'} id="coolSeg">${durSeg('coolMin', [0, 2, 3, 5, 8])}</div>
          <button class="btn ghost block" id="tReset" style="margin-top:12px">Reset to ${LEVEL_LABEL[S.level].toLowerCase()} defaults</button>
        </div>
      </div>
      <button class="btn primary block big" id="gen">${store.plan ? 'Generate a new workout' : 'Generate workout'}</button>
      <div id="preview"></div>
    `);

    const setMin = (m) => {
      S.minutes = Math.max(5, Math.min(90, m)); save();
      $('#dNum').textContent = S.minutes; $('#dRange').value = S.minutes;
      $$('.chip[data-min]').forEach((c) => c.classList.toggle('on', +c.dataset.min === S.minutes));
    };
    $('#dMinus').onclick = () => setMin(S.minutes - 5);
    $('#dPlus').onclick = () => setMin(S.minutes + 5);
    $('#dRange').oninput = (e) => setMin(+e.target.value);
    $$('.chip[data-min]').forEach((c) => (c.onclick = () => setMin(+c.dataset.min)));
    $$('#lvl button').forEach((b) => (b.onclick = () => {
      S.level = +b.dataset.l; Object.assign(S.timing, Generator.LEVEL_TIMING[S.level]);
      if (store.plan) Generator.retime(store.plan, S.timing);
      save(); render();
    }));
    $$('#focus button').forEach((b) => (b.onclick = () => { S.focus = b.dataset.f; save(); $$('#focus button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#twoBells').onchange = (e) => { S.twoBells = e.target.checked; save(); toast('Saved – generate a new workout'); };
    $('#lowFloor').onchange = (e) => { S.lowFloor = e.target.checked; save(); toast('Saved – generate a new workout'); };
    $('#backSafe').onchange = (e) => { S.backSafe = e.target.checked; save(); toast(S.backSafe ? 'Back-friendly on – generate a new workout' : 'Back-friendly off – generate a new workout'); };

    // timing panel
    const refreshSum = () => {
      $('#tSum').textContent = timingSummary();
      if (store.plan) { Generator.retime(store.plan, S.timing); save(); renderPreview($('#preview'), store.plan); }
    };
    $('#tToggle').onclick = () => {
      timingOpen = !timingOpen; $('#tBody').hidden = !timingOpen;
      $('.chev').classList.toggle('open', timingOpen); $('#tToggle').setAttribute('aria-expanded', timingOpen);
    };
    $$('#tBody [data-step]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.step;
      S.timing[k] = Math.max(+b.dataset.min, Math.min(+b.dataset.max, S.timing[k] + +b.dataset.d));
      save();
      $('#v_' + k).textContent = k === 'restEvery' ? (S.timing[k] === 1 ? 'every' : S.timing[k]) : fmtSec(S.timing[k]);
      refreshSum();
    }));
    $$('#tBody input[data-tk]').forEach((i) => (i.onchange = () => {
      S.timing[i.dataset.tk] = i.checked; save();
      $(i.dataset.tk === 'warmOn' ? '#warmSeg' : '#coolSeg').hidden = !i.checked;
      refreshSum();
    }));
    $$('#tBody [data-seg]').forEach((seg) => $$('button', seg).forEach((b) => (b.onclick = () => {
      S.timing[seg.dataset.seg] = +b.dataset.v; save();
      $$('button', seg).forEach((x) => x.classList.toggle('on', x === b)); refreshSum();
    })));
    $('#tReset').onclick = () => {
      S.timing = Object.assign({}, Generator.DEFAULT_TIMING, Generator.LEVEL_TIMING[S.level]);
      if (store.plan) Generator.retime(store.plan, S.timing);
      save(); render(); toast('Timing reset');
    };

    $('#gen').onclick = () => {
      store.plan = Generator.generate({ minutes: S.minutes, level: S.level, focus: S.focus, backSafe: S.backSafe !== false, lowFloor: S.lowFloor !== false, twoBells: !!S.twoBells, timing: S.timing, recent: recentIds() });
      store.recent.push(store.plan.main.concat(store.plan.warm, store.plan.cool));
      store.recent = store.recent.slice(-3);
      save(); render();
      setTimeout(() => $('#preview').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    if (store.plan) renderPreview($('#preview'), store.plan);
  }

  // Exercises from the last few generated workouts and the last two finished ones – avoided next time
  function recentIds() {
    return [...store.recent.flat(), ...store.history.slice(-2).flatMap((h) => h.ex)];
  }

  function exItem(id, idx, opts) {
    const e = EX[id];
    const d = document.createElement('div');
    d.className = 'ex-item';
    d.innerHTML = `${idx !== undefined ? `<div class="num">${idx}</div>` : ''}<div class="thumb"></div>
      <div class="info"><div class="name">${e.name}</div><div class="meta">${regionTag(e)}${e.eq === 2 ? '<span class="tag">2 bells</span>' : ''}${e.muscles.slice(0, 3).join(', ')}${sideNote(e)}</div></div>`;
    const pk = photoKey(id);
    const own = Media.element(id, { still: true });
    if (own) d.querySelector('.thumb').appendChild(own);
    else if (pk) d.querySelector('.thumb').appendChild(photoEl(pk, true));
    else { const svg = svgFig(); d.querySelector('.thumb').appendChild(svg); Figure.still(svg, e.anim); }
    d.querySelector('.info').onclick = () => openSheet(id);
    d.querySelector('.thumb').onclick = () => openSheet(id);
    if (opts && opts.onSwap) {
      const b = document.createElement('button');
      b.className = 'icon-btn'; b.setAttribute('aria-label', 'Swap exercise'); b.innerHTML = ICON.swap;
      b.onclick = opts.onSwap; d.appendChild(b);
    }
    return d;
  }

  function renderPreview(root, plan) {
    const iv = Generator.buildIntervals(plan);
    const total = iv.reduce((s, x) => s + x.dur, 0);
    const workSec = iv.filter((x) => x.phase === 'work').reduce((s, x) => s + x.dur, 0);
    const nEx = plan.main.length;
    const nUnique = new Set(plan.main).size;
    const t = plan.timing;
    root.innerHTML = `
      <div style="height:18px"></div>
      <div class="summary">
        <div><b>${fmtMin(total)}</b><span>total</span></div>
        <div><b>${fmtMin(workSec)}</b><span>work</span></div>
        <div><b>${nEx}</b><span>${nUnique < nEx ? nUnique + ' different' : 'all different'}</span></div>
      </div>
      <button class="btn ghost block" id="saveAsMine" style="margin-bottom:12px">☆ Save as my workout</button>
      <div class="flow-note">One continuous run of exercises in a natural order: legs → press → hips → back → core, then again with new moves. Each area rests before it's used again${plan.backSafe !== false ? ', and two moves that load the lower back never come one after the other' : ''}. It starts with controlled basics, builds up, and ends calmer on the floor. A ${t.rest}s rest comes after every ${t.restEvery} exercises; tap <b>Rest 30s</b> any time, and <b>Skip</b> swaps an exercise without shortening the workout.</div>
    `;
    const head = (title, sub) => { const h = document.createElement('div'); h.className = 'block-head'; h.innerHTML = `<h3>${title}</h3><span class="small muted">${sub}</span>`; root.appendChild(h); };
    const list = () => { const l = document.createElement('div'); l.className = 'ex-list'; root.appendChild(l); return l; };
    const sam = root.querySelector('#saveAsMine');
    if (sam) sam.onclick = () => { Custom.fromPlan(plan, api()); S.kbMode = 'custom'; save(); render(); window.scrollTo(0, 0); toast('Edit it and tap Save'); };

    if (plan.warm.length) {
      head('Warm-up', `${plan.warm.length} moves · ${fmtMin(iv.filter((x) => x.phase === 'warmup').reduce((s, x) => s + x.dur, 0))}`);
      const l = list(); plan.warm.forEach((id) => l.appendChild(exItem(id)));
    }

    head('Workout', `${plan.main.length} exercises · ${t.work}s each`);
    const ml = list();
    let since = 0;
    plan.main.forEach((id, i) => {
      ml.appendChild(exItem(id, i + 1, {
        onSwap: () => { Generator.swap(plan, i, recentIds()); save(); renderPreview(root, plan); toast('Exercise swapped'); },
      }));
      since++;
      if (since >= t.restEvery && i < plan.main.length - 1) {
        since = 0;
        if (t.rest > 0) { const r = document.createElement('div'); r.className = 'rest-row'; r.textContent = `Rest · ${t.rest}s`; ml.appendChild(r); }
      }
    });

    if (plan.cool.length) {
      head('Cool-down', `${plan.cool.length} stretches · ${fmtMin(iv.filter((x) => x.phase === 'cooldown').reduce((s, x) => s + x.dur, 0))}`);
      const l = list(); plan.cool.forEach((id) => l.appendChild(exItem(id)));
    }

    const st = document.createElement('div');
    st.className = 'sticky-start';
    st.innerHTML = `<button class="btn primary block big">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start · ${fmtMin(total)}</button>`;
    st.querySelector('button').onclick = () => { Generator.retime(plan, S.timing); save(); Player.start(plan); };
    root.appendChild(st);
  }

  // ---------- Exercise detail sheet ----------
  function openSheet(id, opts) {
    const e = EX[id];
    const stacked = opts && opts.stacked;
    let sh = $('#sheet');
    if (stacked) {
      sh = $('#sheet2');
      if (!sh) { sh = document.createElement('div'); sh.id = 'sheet2'; sh.className = 'sheet stacked'; sh.hidden = true; document.body.appendChild(sh); }
    }
    sh.innerHTML = `<div class="sheet-body" role="dialog" aria-label="${e.name}">
      <div class="grab"></div>
      <div class="row" style="justify-content:flex-end"><button class="icon-btn" id="shClose" aria-label="Close">${ICON.close}</button></div>
      <div class="stage"></div>
      ${self.PHOTOS && self.PHOTOS[id] ? `<div class="seg mini" id="visSeg" style="max-width:260px;margin:0 auto 10px">${[['photo', 'Real photos'], ['figure', 'Animation']].map(([v, l]) => `<button data-v="${v}" class="${(S.visual === 'figure' ? 'figure' : 'photo') === v ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      <h2>${e.name}</h2>
      <p style="margin:10px 0 4px">${regionTag(e)}<span class="tag">${CAT_LABEL[e.cat]}</span><span class="tag">${LEVEL_LABEL[e.level]}</span>${e.uni ? '<span class="tag">each side</span>' : ''}${e.alt ? '<span class="tag">alternating</span>' : ''}${e.floor ? '<span class="tag">on the floor</span>' : ''}${e.bw ? '<span class="tag">bodyweight</span>' : ''}${e.eq === 2 ? '<span class="tag">2 kettlebells</span>' : ''}<span class="tag back${backOf(e)}">Back load: ${['low', 'moderate', 'high'][backOf(e)]}</span></p>
      ${e.lib ? '<p class="small muted" style="margin:4px 0 0">From the Caveman Kettlebells exercise list · animation shows the closest basic movement – tap ▶ Watch real demo for the exact variation.</p>' : ''}
      <p class="small muted" style="margin:6px 0 0">Muscles: ${e.muscles.join(', ')}</p>
      ${opts && opts.onAdd ? '<button class="btn primary block" id="shAdd" style="margin-top:12px">＋ Add to workout</button>' : ''}
      <div class="media-actions">
        <button class="btn ghost" id="watchDemo">▶ Watch real demo</button>
        <label class="btn ghost" id="addOwn">＋ ${Media.get(id) ? 'Replace my video' : 'Add my video/photo'}<input type="file" accept="video/*,image/*" hidden></label>
        ${Media.get(id) ? '<button class="btn ghost" id="removeOwn">Remove mine</button>' : ''}
      </div>
      <p class="label" style="margin-top:16px">How to do it</p>
      <ol>${e.cues.map((c) => `<li>${c}</li>`).join('')}</ol>
      ${e.avoid ? `<div class="avoid"><b>Avoid:</b> ${e.avoid}</div>` : ''}
    </div>`;
    const svg = svgFig();
    const showVis = (mode) => {
      const stage = sh.querySelector('.stage'); stage.innerHTML = ''; Figure.stop(svg);
      const pk = mode === 'photo' && self.PHOTOS ? self.PHOTOS[id] : null;
      stage.classList.toggle('photo', !!pk);
      if (pk) { stage.appendChild(photoEl(pk)); const t = document.createElement('span'); t.className = 'ph-tag'; t.textContent = 'start ⇄ end position'; stage.querySelector('.ph').appendChild(t); }
      else { stage.appendChild(svg); Figure.animate(svg, e.anim); }
    };
    const showOwn = () => {
      const own = Media.element(id);
      if (!own) return false;
      const stage = sh.querySelector('.stage'); stage.innerHTML = ''; Figure.stop(svg); stage.classList.add('photo');
      const t = document.createElement('span'); t.className = 'ph-tag'; t.textContent = 'your video'; own.appendChild(t);
      stage.appendChild(own);
      const vs = $('#visSeg', sh); if (vs) vs.hidden = true;
      return true;
    };
    if (!showOwn()) showVis(S.visual === 'figure' ? 'figure' : 'photo');
    const addB = $('#shAdd', sh); if (addB) addB.onclick = () => { opts.onAdd(); close(); };
    $('#watchDemo', sh).onclick = () => {
      const q = e.cat === 'recovery' || e.cat === 'stretch' || e.cat === 'warmup' ? `${e.name} how to` : `${e.name} kettlebell exercise technique`;
      window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), '_blank', 'noopener');
    };
    $('#addOwn input', sh).onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      if (f.size > 60 * 1024 * 1024) { toast('That file is over 60 MB – trim it to a short clip first'); return; }
      try { await Media.put(id, f); toast('Saved – shown for this exercise from now on'); close(); openSheet(id, opts); if (!stacked) render(); }
      catch (err) { toast('Could not save the file on this device'); }
    };
    const rm = $('#removeOwn', sh);
    if (rm) rm.onclick = async () => { await Media.remove(id); toast('Removed'); close(); openSheet(id, opts); if (!stacked) render(); };
    $$('#visSeg button', sh).forEach((b) => (b.onclick = () => {
      S.visual = b.dataset.v; save(); $$('#visSeg button', sh).forEach((x) => x.classList.toggle('on', x === b)); showVis(S.visual);
    }));
    sh.hidden = false;
    const close = () => { Figure.stop(svg); sh.hidden = true; sh.innerHTML = ''; if (opts && opts.onClose) opts.onClose(); };
    $('#shClose').onclick = close;
    sh.onclick = (ev) => { if (ev.target === sh) close(); };
  }

  // ---------- Exercise filters (library + custom picker) ----------
  const isFloorEx = (e) => !!e.floor || ['pushup', 'plankRow', 'plankDrag', 'plank', 'russianTwist', 'vsit', 'tgu', 'birdDog', 'floorPress', 'floorPress2', 'pullover', 'skull', 'situp', 'crunch', 'deadbug', 'hollow', 'legRaise', 'bridge', 'bridge1', 'deadbugPull', 'halfKneelPress', 'haloKneel'].includes(e.anim) || ['s_child', 's_cobra', 's_seated', 's_knees', 's_dog', 's_hipflex', 'w_inch', 'w_birddog', 'w_bridge'].includes(e.id);
  const backOf = (e) => (e.back !== undefined ? e.back : (Generator.BACK[e.id] || 0));
  const FILTERS = [['one', '1 kettlebell', (e) => e.eq !== 2], ['stand', 'Standing', (e) => !isFloorEx(e)], ['back', 'Back-friendly', (e) => backOf(e) < 2], ['easy', 'Beginner', (e) => e.level === 1]];
  function filterBar(state, onChange) {
    const d = document.createElement('div');
    d.className = 'chips filters';
    d.innerHTML = FILTERS.map(([k, l]) => `<button class="chip ${state[k] ? 'on' : ''}" data-f="${k}">${state[k] ? '✓ ' : ''}${l}</button>`).join('');
    $$('button', d).forEach((b) => (b.onclick = () => { state[b.dataset.f] = !state[b.dataset.f]; save(); onChange(); }));
    return d;
  }
  const passFilters = (e, state) => FILTERS.every(([k, , fn]) => !state[k] || fn(e));
  // Render long lists in batches so 500+ exercises stay fast on a phone
  function batchList(box, items, make, step = 40) {
    let shown = 0;
    const more = document.createElement('button'); more.className = 'btn ghost block'; more.style.marginTop = '8px';
    const next = () => {
      items.slice(shown, shown + step).forEach((x) => box.insertBefore(make(x), more));
      shown = Math.min(items.length, shown + step);
      more.hidden = shown >= items.length; more.textContent = `Show more (${items.length - shown} left)`;
    };
    box.appendChild(more); more.onclick = next; next();
  }

  // ---------- Library ----------
  let libQuery = '', libCat = 'all';
  function renderLibrary(v) {
    const cats = ['all', 'ballistic', 'squat', 'hinge', 'lunge', 'push', 'pull', 'arms', 'core', 'total', 'flow', 'juggling', 'warmup', 'stretch', 'recovery'];
    S.libFilters = S.libFilters || {};
    v.innerHTML = `<input class="search" type="search" placeholder="Search ${EXERCISES.length} exercises or a muscle…" value="${libQuery}">
      <div class="chips">${cats.map((c) => `<button class="chip ${c === libCat ? 'on' : ''}" data-c="${c}">${c === 'all' ? 'All' : CAT_LABEL[c]}</button>`).join('')}</div>
      <div id="libFilters"></div>
      <div class="lib-count"></div><div class="ex-list" id="libList"></div>`;
    const draw = () => {
      const fb = $('#libFilters'); fb.innerHTML = ''; fb.appendChild(filterBar(S.libFilters, draw));
      const q = libQuery.trim().toLowerCase();
      const items = EXERCISES.filter((e) => (libCat === 'all' || e.cat === libCat) && passFilters(e, S.libFilters) &&
        (!q || [e.name, e.muscles.join(' '), CAT_LABEL[e.cat]].join(' ').toLowerCase().includes(q)));
      $('.lib-count').textContent = `${items.length} exercises`;
      const list = $('#libList'); list.innerHTML = '';
      batchList(list, items, (e) => exItem(e.id));
    };
    $('.search').oninput = (e) => { libQuery = e.target.value; draw(); };
    $$('.chip[data-c]').forEach((c) => (c.onclick = () => { libCat = c.dataset.c; $$('.chip[data-c]').forEach((x) => x.classList.toggle('on', x === c)); draw(); }));
    draw();
  }

  // ---------- History ----------
  function renderHistory(v) {
    const h = store.history;
    const totalMin = Math.round(h.reduce((s, x) => s + x.sec, 0) / 60);
    const days = new Set(h.map((x) => new Date(x.date).toDateString()));
    let streak = 0; const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    const weekAgo = Date.now() - 7 * 864e5;
    v.innerHTML = `<div class="stats">
        <div><b>${h.length}</b><span>workouts</span></div>
        <div><b>${totalMin}</b><span>total minutes</span></div>
        <div><b>${h.filter((x) => x.date > weekAgo).length}</b><span>last 7 days</span></div>
      </div>
      ${streak > 1 ? `<div class="flow-note">🔥 ${streak}-day streak. Keep it going!</div>` : ''}
      <div id="hl"></div>`;
    const hl = $('#hl');
    if (!h.length) { hl.innerHTML = '<div class="card muted">No workouts yet. Generate one and hit Start.</div>'; return; }
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    h.slice().reverse().forEach((x) => {
      const dt = new Date(x.date);
      const c = document.createElement('div'); c.className = 'card hist-item';
      if (x.type === 'recovery') {
        c.innerHTML = `<div class="date"><b>${dt.getDate()}</b><span>${MONTHS[dt.getMonth()]}</span></div>
          <div style="flex:1;min-width:0"><div style="font-weight:700">🧘 Recovery · ${fmtMin(x.sec)}</div>
          <div class="small muted">${(Recovery.FOCUS[x.focus] || {}).label || ''} · ${x.ex.length} moves${x.done ? '' : ' · stopped early'}${x.hr ? ` · ♥ avg ${x.hr.avg} / max ${x.hr.max}` : ''}</div>
          <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.ex.map((id) => (EX[id] ? EX[id].name : id)).join(' · ')}</div></div>`;
        hl.appendChild(c);
        return;
      }
      if (x.type === 'boxing') {
        c.innerHTML = `<div class="date"><b>${dt.getDate()}</b><span>${MONTHS[dt.getMonth()]}</span></div>
          <div style="flex:1;min-width:0"><div style="font-weight:700">🥊 Shadowboxing · ${fmtMin(x.sec)}</div>
          <div class="small muted">${x.mode === 'rounds' ? `${x.rounds} × ${fmt(x.roundSec)} rounds` : 'Continuous'} · ${Boxing.LEVELS[x.level].label} · ${x.combos} combos${x.done ? '' : ' · stopped early'}${x.hr ? ` · ♥ avg ${x.hr.avg} / max ${x.hr.max}` : ''}</div></div>`;
        hl.appendChild(c);
        return;
      }
      c.innerHTML = `<div class="date"><b>${dt.getDate()}</b><span>${MONTHS[dt.getMonth()]}</span></div>
        <div style="flex:1;min-width:0"><div style="font-weight:700">${fmtMin(x.sec)} · Kettlebell · ${x.name ? esc(x.name) : Generator.FOCUS_LABEL[x.focus] || ''}</div>
        <div class="small muted">${LEVEL_LABEL[x.level]} · ${x.ex.length} exercises${x.done ? '' : ' · stopped early'}${x.hr ? ` · ♥ avg ${x.hr.avg} / max ${x.hr.max}` : ''}</div>
        <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.ex.map((id) => (EX[id] ? EX[id].name : id)).join(' · ')}</div></div>`;
      hl.appendChild(c);
    });
  }

  // ---------- Settings ----------
  function renderSettings(v) {
    const sw = (key, label, sub) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" data-k="${key}" ${S[key] ? 'checked' : ''}><span></span></label></div>`;
    v.innerHTML = `
      <div class="card"><p class="label">Sound &amp; feedback</p>
        ${sw('voice', 'Voice coach', 'Announces the next exercise, which side starts, “switch hands” and rests')}
        <div id="voiceBox" ${S.voice ? '' : 'hidden'}>
          <div class="set-row"><div><div>Voice</div><div class="small muted">Female / Male are recorded and work with the phone on silent</div></div>
            <div class="seg mini" id="vEngine" style="min-width:200px">${[['f', 'Female'], ['m', 'Male'], ['device', 'Phone']].map(([v, l]) => `<button data-v="${v}" class="${(S.voiceEngine === 'device' ? 'device' : S.clipVoice) === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="set-row" id="voiceSelRow" ${S.voiceEngine === 'device' ? '' : 'hidden'}><div>Phone voice</div><select id="voiceSel" class="select"></select></div>
          <div class="set-row"><div>Speed</div><div class="seg mini" id="vRate" style="min-width:180px">${[[0.9, 'Calm'], [1, 'Normal'], [1.15, 'Fast']].map(([v, l]) => `<button data-v="${v}" class="${S.voiceRate == v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="set-row"><div>Volume</div><input type="range" id="vVol" min="0.3" max="1" step="0.1" value="${S.voiceVol}" style="max-width:160px"></div>
          <button class="btn ghost block" id="testVoice" style="margin-top:10px">Test voice</button>
          <p class="small muted" id="voiceNote" style="margin:8px 0 0"></p>
        </div>
        ${sw('sound', 'Sounds', 'Start chime, soft countdown in the last 3 seconds')}
        <div class="set-row"><div><div>Get-ready cue</div><div class="small muted">What you hear during the get-ready seconds</div></div>
          <div class="seg mini" id="prepCue" style="min-width:180px">${[['ticks', 'Soft ticks'], ['count', '3-2-1 voice'], ['off', 'Off']].map(([v, l]) => `<button data-v="${v}" class="${S.prepCue === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        ${sw('vibrate', 'Vibration', 'On phones that support it')}
        ${sw('silentMode', 'Play when phone is on silent', 'Voice and sounds work even with the silent switch on. On iPhone this may pause music playing in another app.')}
      </div>
      <div class="card"><p class="label">Heart rate strap</p>
        ${HR.supported ? `
        <div class="set-row"><div><div id="hrStatus">${HR.connected ? 'Connected: ' + HR.name : 'Not connected'}</div><div class="small muted">Polar H10 or any Bluetooth chest strap. Put it on (wet the electrodes) before connecting.</div></div>
          <div class="hr-live" id="hrLive">${HR.bpm ? '♥ ' + HR.bpm : ''}</div></div>
        <button class="btn ${HR.connected ? 'ghost' : 'primary'} block" id="hrBtn">${HR.connected ? 'Disconnect' : 'Connect heart rate strap'}</button>
        <div class="set-row"><div><div>Age</div><div class="small muted">For heart-rate zones · max ≈ <b id="hrMax">${HR.maxHr(S)}</b> bpm</div></div>
          <div class="stepper"><button class="icon-btn" data-age="-1">${ICON.minus}</button><b id="hrAge">${S.hrAge}</b><button class="icon-btn" data-age="1">${ICON.plus}</button></div></div>
        <div class="set-row"><div><div>Warn me when it's too high</div><div class="small muted">Voice tells you to slow down if you stay above the limit for 10 s</div></div><label class="switch"><input type="checkbox" id="hrWarn" ${S.hrWarn ? 'checked' : ''}><span></span></label></div>
        <div class="set-row"><div>Limit</div><div class="seg mini" id="hrPct" style="min-width:200px">${[80, 85, 90].map((p) => `<button data-v="${p}" class="${S.hrWarnPct === p ? 'on' : ''}">${p}% · ${Math.round(HR.maxHr(S) * p / 100)}</button>`).join('')}</div></div>
        ` : `<p class="small" style="margin:0">This browser can't connect to Bluetooth heart-rate straps.</p>
        <p class="small muted" style="margin:8px 0 0"><b>Android:</b> open the app in <b>Chrome</b>. <b>iPhone:</b> Safari and other iPhone browsers block Bluetooth for web apps; a browser with Web Bluetooth support (e.g. <b>Bluefy</b>) can open the app and connect the strap.</p>`}
      </div>
      <div class="card"><p class="label">Exercise visuals</p>
        <div class="seg" id="visual">${[['photo', 'Real photos'], ['figure', 'Animation']].map(([k, l]) => `<button data-v="${k}" class="${(S.visual === 'figure' ? 'figure' : 'photo') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="small muted" style="margin:10px 2px 0">Real photos (start ⇄ end position) are shown for ${Object.keys(self.PHOTOS || {}).length} exercises; the others use the animated figure. Photos: free-exercise-db, public domain.</p>
        <p class="small muted" style="margin:8px 2px 0">You can add your own video or photo to any exercise from its page (＋ Add my video/photo); it then replaces the photo or animation everywhere, offline too. ${Media.count() ? `You have added ${Media.count()}.` : ''}</p>
      </div>
      <div class="card"><p class="label">Timing</p>
        <p class="small muted" style="margin:0">Work, rest, get-ready time, warm-up and cool-down are set on the Workout tab, under <b>Timing</b>.</p>
      </div>
      <div class="card"><p class="label">Theme</p>
        <div class="seg" id="theme">${[['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => `<button data-t="${k}" class="${S.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="card"><p class="label">Install on your phone</p>
        <p class="small" style="margin:0 0 8px"><b>Android (Chrome):</b> ⋮ menu → “Install app” / “Add to Home screen”.</p>
        <p class="small" style="margin:0"><b>iPhone (Safari):</b> Share button → “Add to Home Screen”.</p>
        <p class="small muted" style="margin:8px 0 0">After the first visit the app works fully offline.</p>
      </div>
      <div class="card"><p class="label">App version</p>
        <p class="small" style="margin:0"><b>${APP_VERSION}</b> <span class="muted">· includes My workouts, heart rate, recovery</span></p>
        <button class="btn ghost block" id="forceUpdate" style="margin-top:10px">Check for updates</button>
      </div>
      <div class="card"><p class="label">Data</p>
        <p class="small muted" style="margin:0 0 10px">${EXERCISES.filter((e) => !['warmup', 'stretch'].includes(e.cat)).length} main exercises, ${EXERCISES.filter((e) => e.cat === 'warmup').length} warm-up moves, ${EXERCISES.filter((e) => e.cat === 'stretch').length} stretches. History is stored only on this device.</p>
        <button class="btn ghost block" id="clearHist">Clear history</button>
      </div>`;
    $$('input[data-k]').forEach((i) => (i.onchange = () => { S[i.dataset.k] = i.checked; save(); }));
    $$('input[data-k]').forEach((i) => i.addEventListener('change', () => {
      if (i.dataset.k === 'voice') $('#voiceBox').hidden = !S.voice;
      if (i.dataset.k === 'silentMode' && !S.silentMode) Fx.mediaMode(false);
    }));
    const fillVoices = () => {
      const vs = Fx.englishVoices();
      const sel = $('#voiceSel'); if (!sel) return;
      const cur = (Fx.currentVoice() || {}).name;
      sel.innerHTML = vs.length ? vs.map((v) => `<option value="${v.name}" ${v.name === cur ? 'selected' : ''}>${v.name.replace(/\(.*\)/, '').trim()} · ${v.lang}</option>`).join('') : '<option>Default voice</option>';
      $('#voiceNote').textContent = S.voiceEngine === 'clips' ? 'Recorded voice: plays like music, so you hear it even on silent – just keep the media volume up.'
        : vs.length ? 'The phone voice is muted when an iPhone is on silent.' : 'No English voice found on this device – it will use the default voice.';
    };
    fillVoices();
    if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fillVoices);
    $$('#vEngine button').forEach((b) => (b.onclick = () => {
      if (b.dataset.v === 'device') S.voiceEngine = 'device'; else { S.voiceEngine = 'clips'; S.clipVoice = b.dataset.v; }
      save(); $$('#vEngine button').forEach((x) => x.classList.toggle('on', x === b));
      $('#voiceSelRow').hidden = S.voiceEngine !== 'device'; fillVoices(); Fx.unlock(); Fx.say('Next up: goblet squat.');
    }));
    $('#voiceSel').onchange = (e) => { S.voiceName = e.target.value; Fx.voiceObj = null; save(); Fx.unlock(); Fx.say('Next up: goblet squat.'); };
    $$('#vRate button').forEach((b) => (b.onclick = () => { S.voiceRate = +b.dataset.v; save(); $$('#vRate button').forEach((x) => x.classList.toggle('on', x === b)); Fx.unlock(); Fx.say('Switch hands. Go!'); }));
    $('#vVol').onchange = (e) => { S.voiceVol = +e.target.value; save(); Fx.unlock(); Fx.say('Rest. Next up: push-up.'); };
    $$('#prepCue button').forEach((b) => (b.onclick = () => {
      S.prepCue = b.dataset.v; save(); $$('#prepCue button').forEach((x) => x.classList.toggle('on', x === b));
      Fx.unlock(); [3, 2, 1].forEach((n, k) => setTimeout(() => Fx.countdown(n), k * 1000)); setTimeout(() => Fx.go(), 3000);
    }));
    $('#testVoice').onclick = () => {
      Fx.unlock();
      Fx.say('Next up: one-arm swing. Right hand first.');
      [3, 2, 1].forEach((n, k) => setTimeout(() => Fx.countdown(n), 3200 + k * 1000));
      setTimeout(() => { Fx.go(); Fx.say('Go!'); }, 6200);
      setTimeout(() => { Fx.switchCue(); Fx.say('Switch hands.'); }, 8200);
      setTimeout(() => { if ($('#player').hidden) Fx.mediaMode(false); }, 11000);
    };
    if (HR.supported) {
      const refresh = () => { if (tab === 'settings') render(); };
      $('#hrBtn').onclick = async () => {
        if (HR.connected) { HR.disconnect(); refresh(); return; }
        try { const n = await HR.connect(); toast('Connected to ' + n); refresh(); }
        catch (e) { if (e && e.name !== 'NotFoundError') toast('Could not connect – is the strap on and Bluetooth enabled?'); }
      };
      const off = HR.on((b) => { const l = $('#hrLive'); if (!l) return off(); l.textContent = b ? '♥ ' + b : ''; const st = $('#hrStatus'); if (st) st.textContent = HR.connected ? 'Connected: ' + HR.name : 'Not connected'; });
      $$('[data-age]').forEach((b) => (b.onclick = () => { S.hrAge = Math.max(14, Math.min(90, S.hrAge + +b.dataset.age)); save(); render(); }));
      $('#hrWarn').onchange = (e) => { S.hrWarn = e.target.checked; save(); };
      $$('#hrPct button').forEach((b) => (b.onclick = () => { S.hrWarnPct = +b.dataset.v; save(); $$('#hrPct button').forEach((x) => x.classList.toggle('on', x === b)); }));
    }
    $$('#visual button').forEach((b) => (b.onclick = () => { S.visual = b.dataset.v; save(); $$('#visual button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $$('#theme button').forEach((b) => (b.onclick = () => { S.theme = b.dataset.t; save(); applyTheme(); $$('#theme button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#forceUpdate').onclick = async () => {
      toast('Checking…');
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
        const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) { /* ignore */ }
      location.reload();
    };
    $('#clearHist').onclick = () => { if (confirm('Delete your entire workout history?')) { store.history = []; save(); toast('History cleared'); } };
  }

  // ---------- Audio / voice / vibration ----------
  const Fx = {
    ctx: null,
    unlock() {
      this.mediaMode(S.silentMode);
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* no audio */ }
      // iOS lets a media element play later only if it was started once from a tap
      if (S.voiceEngine === 'clips' && !this._voiceUnlocked) {
        const a = this.ensureVoiceEl();
        try { a.src = this.silentUrl(); const pr = a.play(); if (pr && pr.then) pr.then(() => { if (!this.clipTok) a.pause(); }).catch(() => {}); } catch (e) { /* ignore */ }
        this._voiceUnlocked = true;
        this.prefetchClips();
      }
      // iOS only allows speech after a real utterance started from a tap
      if (window.speechSynthesis && !this._primed) {
        try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this._primed = true; } catch (e) { /* ignore */ }
      }
    },
    // iPhone: web audio follows the silent switch unless the page is in "media playback" mode.
    // Two layers: the Audio Session API (Safari 17+) and a looping silent <audio> element,
    // which keeps the page in playback mode on older iOS versions as well.
    silentEl: null,
    silentUrl() {
      const rate = 8000, n = rate / 2; // 0.5 s of silence, 8-bit mono WAV
      const buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      w(36, 'data'); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    },
    mediaMode(on) {
      try { if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto'; } catch (e) { /* not supported */ }
      try {
        if (on) {
          if (!this.silentEl) {
            const a = document.createElement('audio');
            a.src = this.silentUrl(); a.loop = true; a.setAttribute('playsinline', ''); a.setAttribute('x-webkit-airplay', 'deny');
            a.preload = 'auto'; a.volume = 0.01;
            this.silentEl = a;
          }
          const pr = this.silentEl.play(); if (pr && pr.catch) pr.catch(() => {});
        } else if (this.silentEl) this.silentEl.pause();
      } catch (e) { /* ignore */ }
    },
    // ---- Recorded voice clips (play as media, so they work on silent) ----
    voiceEl: null, clipCache: new Map(), clipTok: 0,
    clipSet: new Set(self.VOICE_CLIPS || []),
    norm(s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''); },
    clipKeys(text) {
      const keys = text.split(/[.,:!?]+/).map((x) => x.trim()).filter(Boolean).map((x) => this.norm(x)).filter(Boolean);
      return keys.length && keys.every((k) => this.clipSet.has(k)) ? keys : null;
    },
    clip(k) {
      const id = `${S.clipVoice === 'm' ? 'm' : 'f'}/${k}`;
      if (!this.clipCache.has(id)) this.clipCache.set(id, fetch(`audio/${id}.mp3`).then((r) => { if (!r.ok) throw new Error(id); return r.arrayBuffer(); }));
      return this.clipCache.get(id);
    },
    ensureVoiceEl() {
      if (this.voiceEl) return this.voiceEl;
      const a = document.createElement('audio');
      a.setAttribute('playsinline', ''); a.preload = 'auto';
      a.addEventListener('ended', () => { if (this.silentEl && S.silentMode && !document.getElementById('player').hidden) this.silentEl.play().catch(() => {}); });
      this.voiceEl = a;
      return a;
    },
    async playClips(keys) {
      const tok = ++this.clipTok;
      try {
        const bufs = await Promise.all(keys.map((k) => this.clip(k)));
        if (tok !== this.clipTok) return; // a newer announcement replaced this one
        const a = this.ensureVoiceEl();
        if (this._clipUrl) URL.revokeObjectURL(this._clipUrl);
        this._clipUrl = URL.createObjectURL(new Blob(bufs, { type: 'audio/mpeg' }));
        a.src = this._clipUrl;
        a.playbackRate = S.voiceRate || 1; a.preservesPitch = true; a.webkitPreservesPitch = true;
        a.volume = S.voiceVol || 1;
        await a.play();
      } catch (e) { /* missing clip or blocked playback */ }
    },
    stopVoice() {
      this.clipTok++;
      if (this.voiceEl) try { this.voiceEl.pause(); } catch (e) { /* ignore */ }
      if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    },
    prefetchClips() { const v = S.clipVoice; if (this._prefetched !== v) { this._prefetched = v; [...this.clipSet].forEach((k) => this.clip(k).catch(() => {})); } },
    // Subtle get-ready cues
    tick() { this.beep(1400, 0.025, 0.05); },
    countdown(n) {
      if (S.prepCue === 'off') return;
      if (S.prepCue === 'count') this.say(String(n), true);
      this.beep({ 3: 620, 2: 700, 1: 790 }[n] || 700, 0.09, 0.12);
    },
    go() { this.beep(990, 0.22, 0.22); this.beep(1320, 0.3, 0.16, 0.08); },
    switchCue() { this.beep(880, 0.1, 0.18); this.beep(1100, 0.12, 0.18, 0.14); },
    beep(freq = 880, dur = 0.12, vol = 0.25, when = 0) {
      if (!S.sound || !this.ctx) return;
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    voiceObj: null,
    englishVoices() {
      if (!window.speechSynthesis) return [];
      return speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('en'));
    },
    currentVoice() { if (!this.voiceObj) this.voiceObj = this.pickVoice(); return this.voiceObj; },
    pickVoice() {
      if (!window.speechSynthesis) return null;
      const vs = this.englishVoices();
      if (S.voiceName) { const v = vs.find((x) => x.name === S.voiceName); if (v) return v; }
      const pref = [/samantha/i, /google us english/i, /aria|jenny|guy/i, /daniel/i, /karen|moira|serena/i, /en-us/i];
      for (const re of pref) { const v = vs.find((x) => re.test(x.name) || re.test(x.lang)); if (v) return v; }
      return vs.find((v) => v.localService) || vs[0] || null;
    },
    say(text, force) {
      if (!S.voice && !force) return;
      if (S.voiceEngine !== 'device') {
        const keys = this.clipKeys(text);
        if (keys) { if (window.speechSynthesis) speechSynthesis.cancel(); this.playClips(keys); return; }
        if (window.console) console.warn('no recorded clip for:', text);
      }
      if (!window.speechSynthesis) return;
      try {
        const u = new SpeechSynthesisUtterance(text);
        const v = this.currentVoice();
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
        u.rate = S.voiceRate || 1;
        u.volume = S.voiceVol || 1;
        // Some Android browsers drop an utterance spoken right after cancel(), so leave a short gap
        if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(() => speechSynthesis.speak(u), 90); }
        else speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    buzz(p) { if (S.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } },
  };
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { Fx.voiceObj = null; };

  // ---------- Player ----------
  const PHASE = { prep: 'Get ready', warmup: 'Warm-up', work: 'Work', rest: 'Rest', cooldown: 'Cool-down', switch: 'Switch', recover: 'Recovery' };
  // Is the side change about hands or legs?
  const LEG_MOVES = new Set(['sldl', 'kickstand', 'bridge1', 'splitSquat', 'rackLunge', 'suitLunge', 'ohLunge', 'lungeKnee', 's_quad', 's_hipflex']);
  const limb = (e) => (LEG_MOVES.has(e.id) ? 'leg' : e.cat === 'stretch' || e.cat === 'recovery' ? 'side' : 'hand');
  const Player = {
    start(plan) {
      Fx.unlock();
      Fx.stopVoice();
      this.plan = plan;
      this.iv = plan.intervals ? plan.intervals.map((x) => Object.assign({}, x)) : Generator.buildIntervals(plan);
      this.total = this.iv.reduce((s, x) => s + x.dur, 0);
      this.skipped = 0;
      this.running = true; this.last = performance.now();
      this.el = $('#player'); this.el.hidden = false;
      document.body.style.overflow = 'hidden';
      this.el.innerHTML = `
        <div class="p-top"><div><div class="p-phase"></div><div class="p-label"></div></div><div class="spacer"></div>
          <div class="hr-badge" id="pHr" hidden></div><div class="p-left"><b id="pLeft"></b><span>left</span></div><button class="icon-btn" id="pClose" aria-label="Quit workout">${ICON.close}</button></div>
        <div class="p-progress"><i></i></div>
        <div class="p-stage"><span class="p-badge" hidden></span></div>
        <div class="p-name"></div>
        <div class="p-timer"></div>
        <div class="p-cue"></div>
        <div class="p-next"></div>
        <div class="p-skips"></div>
        <div class="p-controls">
          <button id="pPrev" aria-label="Previous"><span class="ic">${ICON.prev}</span><small>Back</small></button>
          <button id="pPlay" class="main" aria-label="Pause"><span class="ic">${ICON.pause}</span></button>
          <button id="pNext" aria-label="Skip"><span class="ic">${ICON.next}</span><small>Skip</small></button>
        </div>`;
      this.svg = svgFig(); $('.p-stage', this.el).appendChild(this.svg);
      this.ph = document.createElement('div'); this.ph.className = 'ph'; this.ph.hidden = true;
      this.ph.innerHTML = '<img class="a" alt=""><img class="b" alt="">';
      $('.p-stage', this.el).appendChild(this.ph);
      $('#pClose').onclick = () => this.exit();
      $('#pPlay').onclick = () => this.toggle();
      $('#pNext').onclick = () => this.jump(1);
      $('#pPrev').onclick = () => this.jump(-1);
      this.hrOff = HRUI.bind($('#pHr'));
      HR.startSession();
      this.enter(0, true);
      this.wake();
      this.timer = setInterval(() => this.tick(), 200);
    },
    async wake() {
      try { if ('wakeLock' in navigator) this.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* not available */ }
    },
    // Contextual skip buttons
    renderSkips() {
      const x = this.iv[this.idx];
      const box = $('.p-skips', this.el);
      const btns = [];
      if (this.plan.kind === 'recovery') {
        if (x.phase === 'prep') btns.push(['startNow', 'Start now']);
        box.innerHTML = btns.map(([k, l]) => `<button class="chip" data-skip="${k}">${l}</button>`).join('');
        $$('[data-skip]', box).forEach((b) => (b.onclick = () => this.skipAction(b.dataset.skip)));
        return;
      }
      if (x.phase === 'rest' || x.phase === 'prep') { btns.push(['startNow', x.phase === 'rest' ? 'Skip rest' : 'Start now']); if (x.phase === 'rest') btns.push(['add15', '+15s']); }
      if (x.phase === 'work' || x.phase === 'warmup') btns.push(['rest30', 'Rest 30s']);
      if (x.phase === 'warmup' || (x.phase === 'prep' && this.iv[this.idx + 1] && this.iv[this.idx + 1].phase === 'warmup')) btns.push(['skipWarm', 'Skip warm-up']);
      if (x.phase === 'work' && this.iv.some((y, i) => i > this.idx && y.phase === 'cooldown')) btns.push(['toCool', 'Skip to cool-down']);
      if (x.phase === 'cooldown') btns.push(['finish', 'Finish now']);
      box.innerHTML = btns.map(([k, l]) => `<button class="chip" data-skip="${k}">${l}</button>`).join('');
      $$('[data-skip]', box).forEach((b) => (b.onclick = () => this.skipAction(b.dataset.skip)));
    },
    skipAction(k) {
      const findFrom = (pred) => { for (let i = this.idx + 1; i < this.iv.length; i++) if (pred(this.iv[i])) return i; return -1; };
      if (k === 'startNow') return this.jump(1, true);
      if (k === 'add15') { this.remain += 15; this.iv[this.idx].dur += 15; this.total += 15; this.renderTime(); return; }
      if (k === 'skipWarm') { const i = findFrom((y) => y.phase !== 'warmup' && y.phase !== 'prep'); return this.goTo(i < 0 ? this.iv.length - 1 : Math.max(this.idx + 1, i - 1)); }
      if (k === 'toCool') { const i = findFrom((y) => y.phase === 'cooldown'); if (i > 0) return this.goTo(this.iv[i - 1].phase === 'prep' ? i - 1 : i); }
      if (k === 'finish') return this.finish();
      if (k === 'rest30') {
        // Pause the current exercise with a 30s break, then continue it with the time that was left
        const x = this.iv[this.idx];
        const left = Math.max(1, Math.round(this.remain));
        const cont = Object.assign({}, x, { dur: left, sideSwitch: false });
        x.dur = Math.max(0, Math.round(x.dur - this.remain));
        this.iv.splice(this.idx + 1, 0, { phase: 'rest', ex: x.ex, dur: 30, label: 'Extra rest', next: x.ex }, cont);
        this.total = this.iv.reduce((sum, y) => sum + y.dur, 0);
        this.extraRest = true;
        return this.enter(this.idx + 1);
      }
    },
    goTo(i) {
      this.skipped += this.remain + this.iv.slice(this.idx + 1, i).reduce((s, y) => s + y.dur, 0);
      this.enter(i);
    },
    enter(i, first) {
      this.idx = i;
      const x = this.iv[i];
      this.remain = x.dur; this.lastBeep = null;
      this.elapsedBefore = this.iv.slice(0, i).reduce((s, y) => s + y.dur, 0);
      const isRest = x.phase === 'rest' || x.phase === 'prep' || x.phase === 'switch';
      const e = EX[x.ex];
      this.el.classList.toggle('rest', x.phase === 'rest');
      this.el.classList.toggle('prep', x.phase === 'prep' || x.phase === 'switch');
      this.el.classList.toggle('cool', x.phase === 'cooldown' || x.phase === 'recover');
      $('.p-phase', this.el).textContent = PHASE[x.phase];
      $('.p-label', this.el).textContent = x.label || '';
      $('.p-name', this.el).textContent = (x.phase === 'switch' ? `Left ${limb(e)} next · ` : isRest ? 'Next: ' : '') + e.name;
      const badge = $('.p-badge', this.el);
      if (x.side && !isRest) { badge.hidden = false; badge.textContent = x.side === 'Alternate' ? 'Alternate' : `${x.side.split(' ')[0]} ${limb(e)}`; badge.classList.toggle('alt', x.side === 'Alternate'); }
      else if (isRest && e.uni && x.phase !== 'switch') { badge.hidden = false; badge.textContent = `Right ${limb(e)} first`; badge.classList.add('alt'); }
      else badge.hidden = true;
      $('.p-cue', this.el).textContent = e.cues[0] || '';
      this.cueIdx = 0;
      const nx = x.next ? EX[x.next] : null;
      $('.p-next', this.el).textContent = !isRest && nx ? 'Up next: ' + nx.name : '';
      const pk = photoKey(e.id);
      const ownM = Media.get(e.id);
      if (this.own) { this.own.remove(); this.own = null; }
      if (ownM) {
        Figure.stop(this.svg); this.svg.style.display = 'none'; this.ph.hidden = true;
        this.own = Media.element(e.id);
        $('.p-stage', this.el).appendChild(this.own);
        const v = this.own.querySelector('video'); if (v && !this.running) v.pause();
      } else if (pk) {
        Figure.stop(this.svg); this.svg.style.display = 'none'; this.ph.hidden = false;
        const [a, b] = this.ph.querySelectorAll('img');
        if (a.dataset.k !== pk) { a.src = `photos/${pk}_0.jpg`; b.src = `photos/${pk}_1.jpg`; a.dataset.k = pk; }
        this.ph.classList.toggle('paused', !this.running);
      } else {
        this.ph.hidden = true; this.svg.style.display = '';
        if (!this.svg._fig || this.svg._fig.key !== e.anim) Figure.animate(this.svg, e.anim, { speed: isRest ? 0.8 : 1 });
        Figure.setPaused(this.svg, !this.running);
      }
      this.renderSkips();
      this.renderTime();

      const lim = limb(e);
      const prev = i > 0 ? this.iv[i - 1] : null;
      this.breathSaid = false;
      if (this.plan.kind === 'recovery') {
        // calm voice lines: no "Go!", soft chimes
        if (x.phase === 'prep') {
          Fx.buzz(40);
          const sideTxt = e.uni ? '. Right side first' : '';
          if (first) Fx.say(`Get ready. First up: ${e.name}${sideTxt}.`);
          else if (e.id === 'r_relax') Fx.say(`Next: ${e.name}.`);
          else Fx.say(`Next: ${e.name}${sideTxt}.`);
        } else if (x.phase === 'switch' || x.sideSwitch) {
          Fx.switchCue(); Fx.buzz([60, 50, 60]); Fx.say('Switch sides.');
        } else {
          Fx.beep(660, 0.25, 0.1); Fx.beep(990, 0.4, 0.07, 0.12);
          if (prev && prev.phase === 'switch') Fx.say('Left side.');
          else if (e.id === 'r_relax') Fx.say('Relax.');
          else Fx.say('Begin.');
        }
        return;
      }
      if (x.phase === 'prep') {
        Fx.buzz(60);
        const sideTxt = e.uni ? `. Right ${lim} first` : e.alt ? '. Alternate sides' : '';
        if (first) Fx.say(`Get ready. First up: ${e.name}${sideTxt}.`);
        else if (x.label === 'Grab your kettlebell') Fx.say(`Grab your kettlebell. First up: ${e.name}${sideTxt}.`);
        else if (x.label === 'Cool-down next') Fx.say(`Great work. Cool-down: ${e.name}.`);
        else if (prev && prev.phase === 'rest') Fx.say(e.uni ? `Right ${lim} first.` : 'Get ready.');
        else Fx.say(`Next: ${e.name}${sideTxt}.`);
      } else if (x.phase === 'switch') {
        Fx.switchCue(); Fx.buzz([80, 60, 80]);
        Fx.say(`Switch ${lim}s.`);
      } else if (x.phase === 'rest') {
        Fx.beep(440, 0.3, 0.15); Fx.buzz(150);
        Fx.say(x.label === 'Extra rest' ? 'Take thirty seconds.' : `Rest. Next up: ${e.name}.`);
      } else if (x.sideSwitch) {
        Fx.switchCue(); Fx.buzz([80, 60, 80]);
        Fx.say(`Switch ${lim}s.`);
      } else {
        Fx.go(); Fx.buzz(200);
        const sideWord = x.side === 'Right side' ? `Right ${lim}. ` : x.side === 'Left side' ? `Left ${lim}. ` : '';
        if (prev && prev.phase === 'switch') Fx.say(`${sideWord}Go!`);
        else if (prev && prev.phase === 'rest' && prev.label === 'Extra rest') Fx.say('Back to it. Go!');
        else if (prev && prev.phase === 'prep' && prev.ex === x.ex) Fx.say('Go!');
        else Fx.say(`${e.name}. ${sideWord}${x.side === 'Alternate' ? 'Alternate sides. ' : ''}Go!`);
      }
    },
    renderTime() {
      $('.p-timer', this.el).textContent = fmt(Math.ceil(this.remain - 0.01));
      const done = this.elapsedBefore + (this.iv[this.idx].dur - this.remain);
      $('.p-progress i', this.el).style.width = (100 * done / this.total).toFixed(2) + '%';
      $('#pLeft').textContent = fmt(this.total - done);
    },
    tick() {
      const now = performance.now();
      const dt = (now - this.last) / 1000; this.last = now;
      if (!this.running) return;
      HRUI.check(dt);
      this.remain -= dt;
      const sec = Math.ceil(this.remain);
      if (sec >= 1 && this.lastBeep !== sec && sec < Math.ceil(this.iv[this.idx].dur)) {
        this.lastBeep = sec;
        const ph = this.iv[this.idx].phase;
        if (ph === 'prep') { if (sec <= 3) Fx.countdown(sec); else if (S.prepCue !== 'off') Fx.tick(); }
        else if (sec <= 3 && ph !== 'switch' && ph !== 'recover') Fx.beep(660, 0.07, 0.1); // soft end-of-interval countdown
      }
      const x = this.iv[this.idx], e = EX[x.ex];
      if (this.plan.kind === 'recovery' && x.phase === 'recover' && !this.breathSaid && x.dur >= 40 && this.remain <= x.dur / 2 && e.id !== 'r_relax' && e.id !== 'r_breath') {
        this.breathSaid = true; Fx.say('Breathe slowly.');
      }
      const ci = Math.floor((x.dur - this.remain) / 10) % e.cues.length;
      if (ci !== this.cueIdx) { this.cueIdx = ci; $('.p-cue', this.el).textContent = e.cues[ci]; }
      if (this.remain <= 0) {
        // carry the overshoot into the next interval(s) so the session stays exactly as long as chosen,
        // even when the phone throttles the timer
        let over = -this.remain;
        for (;;) {
          if (this.idx + 1 >= this.iv.length) return this.finish();
          this.enter(this.idx + 1);
          if (over < this.remain) { this.remain -= over; break; }
          over -= this.remain;
        }
      }
      this.renderTime();
    },
    toggle() {
      this.running = !this.running; this.last = performance.now();
      $('#pPlay .ic').innerHTML = this.running ? ICON.pause : ICON.play;
      $('#pPlay').setAttribute('aria-label', this.running ? 'Pause' : 'Resume');
      Figure.setPaused(this.svg, !this.running);
      if (this.ph) this.ph.classList.toggle('paused', !this.running);
      const ov = this.own && this.own.querySelector('video'); if (ov) { if (this.running) ov.play().catch(() => {}); else ov.pause(); }
      if (this.running) { Fx.unlock(); this.wake(); } else Fx.say('Paused');
    },
    // Skip: replace the current (or upcoming) exercise with a similar one; the clock keeps running,
    // so skipping never shortens the workout. During a rest the Skip button just ends the rest.
    skipExercise() {
      if (this.plan.kind === 'custom') return false; // your own workout: Skip simply moves on
      const x = this.iv[this.idx];
      let target = null;
      if (['work', 'warmup', 'cooldown', 'recover', 'switch'].includes(x.phase)) target = x.inst;
      else if (x.phase === 'prep') target = x.forInst || (this.iv.slice(this.idx + 1).find((y) => y.inst) || {}).inst;
      if (!target) return false;
      const cur = this.iv.find((y) => y.inst === target);
      if (!cur) return false;
      const planLike = this.plan.kind === 'recovery' ? { level: 3, main: this.plan.items, warm: [], cool: [] } : this.plan;
      // remember the original movement group and everything already skipped for this spot
      if (!cur.origSlot) cur.origSlot = Generator.CAT_SLOT[EX[cur.ex].cat];
      cur.skipped = (cur.skipped || []).concat(cur.ex);
      let alt = Generator.alternative(planLike, cur.ex, { sameShape: true, slot: cur.origSlot, avoid: cur.skipped });
      if (!alt) { cur.skipped = [cur.ex]; alt = Generator.alternative(planLike, cur.ex, { sameShape: true, slot: cur.origSlot, avoid: cur.skipped }); }
      if (!alt) { toast('No alternative for this one'); return true; }
      const oldId = cur.ex;
      this.iv.forEach((y) => { if (y.inst === target || (y.forInst === target && y.ex === oldId)) { y.ex = alt; if (y.inst === target) { y.origSlot = cur.origSlot; y.skipped = cur.skipped; } } });
      if (cur.slot && this.plan[cur.slot[0]]) this.plan[cur.slot[0]][cur.slot[1]] = alt;
      if (this.plan.kind === 'recovery') { const k = this.plan.items.indexOf(oldId); if (k >= 0) this.plan.items[k] = alt; }
      Generator.linkNext(this.iv);
      const keep = this.remain;
      this.enter(this.idx);
      this.remain = keep; this.renderTime();
      toast('Swapped to ' + EX[alt].name);
      return true;
    },
    jump(d, noSwap) {
      if (d > 0 && !noSwap && this.skipExercise()) return;
      let i = this.idx + d;
      if (d < 0 && this.iv[this.idx].dur - this.remain > 3) i = this.idx; // restart current
      if (i >= this.iv.length) return this.finish();
      i = Math.max(0, i);
      if (d > 0) this.skipped += this.remain;
      this.enter(i);
    },
    doneSec() { return this.elapsedBefore + (this.iv[this.idx].dur - this.remain) - this.skipped; },
    record(done) {
      const sec = Math.round(this.doneSec());
      const hr = HR.stopSession();
      if (sec < 120) return;
      if (hr) this._hr = hr;
      if (this.plan.kind === 'recovery') {
        store.history.push({ type: 'recovery', date: Date.now(), sec, minutes: this.plan.minutes, focus: this.plan.focus, ex: this.plan.items.slice(), done, hr });
        return save();
      }
      store.history.push({ date: Date.now(), sec, minutes: this.plan.minutes, focus: this.plan.focus, level: this.plan.level, ex: [...new Set(this.plan.main)], done, hr, name: this.plan.kind === 'custom' ? this.plan.name : undefined });
      save();
    },
    exit() {
      if (this.doneSec() > 30 && !confirm('Quit this workout? Your progress will be saved to history.')) return;
      this.record(false);
      this.close();
    },
    finish() {
      this.record(true);
      clearInterval(this.timer);
      Figure.stop(this.svg);
      const sec = Math.round(this.doneSec());
      if (this.plan.kind === 'recovery') {
        Fx.beep(523, 0.6, 0.12); Fx.beep(659, 0.6, 0.1, 0.25); Fx.beep(784, 1.0, 0.09, 0.5);
        Fx.say('Recovery complete. Well done.');
        this.el.innerHTML = `<div class="p-done"><div class="big">🧘</div><h2>Recovery complete</h2>
          <p class="muted">${fmtMin(sec)} · ${this.plan.items.length} moves · ${Recovery.FOCUS[this.plan.focus].label}</p>
          <button class="btn primary big" id="pOk" style="min-width:220px">Done</button></div>`;
        $('#pOk').onclick = () => { this.close(); tab = 'history'; render(); };
        return;
      }
      Fx.beep(660, 0.15); Fx.beep(880, 0.15, 0.25, 0.18); Fx.beep(1100, 0.4, 0.25, 0.36); Fx.buzz([100, 80, 100, 80, 300]);
      Fx.say('Workout complete. Great job!');
      this.el.innerHTML = `<div class="p-done"><div class="big">💪</div><h2>Workout complete!</h2>
        <p class="muted">${fmtMin(sec)} · ${this.plan.main.length} exercises · ${this.plan.kind === 'custom' ? esc(this.plan.name) : Generator.FOCUS_LABEL[this.plan.focus]}</p>
        <button class="btn primary big" id="pOk" style="min-width:220px">Done</button></div>`;
      $('#pOk').onclick = () => { this.close(); tab = 'history'; render(); };
    },
    close() {
      clearInterval(this.timer);
      if (this.hrOff) { this.hrOff(); this.hrOff = null; }
      HR.stopSession();
      Fx.mediaMode(false);
      if (this.svg) Figure.stop(this.svg);
      Fx.stopVoice();
      try { if (this.lock) this.lock.release(); } catch (e) { /* ignore */ }
      this.lock = null;
      this.el.hidden = true; this.el.innerHTML = '';
      this.el.className = 'player';
      document.body.style.overflow = '';
      render();
    },
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !$('#player').hidden && Player.running) Player.wake();
  });

  // Helpers shared with the shadowboxing module (js/boxing.js)
  function api() {
    return { S, store, save, Fx, ICON, fmt, fmtSec, fmtMin, toast, $, $$, rerender: render, HRUI, openSheet, filterBar, passFilters, batchList, goTab: (t) => { tab = t; render(); }, exItem, startPlayer: (plan) => Player.start(plan) };
  }

  // Block zoom: iOS Safari ignores user-scalable=no, so stop pinch gestures and fast double-taps here too
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 350 && !e.target.closest('input, select, textarea')) {
      e.preventDefault();
      const t = e.target.closest('button, label, [data-skip]');
      if (t) t.click(); // still register the second tap on buttons
    }
    lastTouchEnd = now;
  }, { passive: false });

  render();
  Media.init().then((n) => { if (n) render(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
      // look for a new version whenever the app comes back to the foreground
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {}));
    // a new version took over: reload once – but not on the very first install, and never in the
    // middle of a workout or while you're editing one (it would lose what you were doing)
    let reloading = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !hadController) return;
      const busy = !$('#player').hidden || (window.Custom && Custom.isEditing()) || !$('#sheet').hidden;
      if (busy) { toast('Update ready – it will load next time you open the app'); return; }
      reloading = true; location.reload();
    });
  }
})();
