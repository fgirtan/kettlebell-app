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
  const KEY = 'kettlebell.v1';
  const DEFAULTS = {
    settings: { minutes: 30, level: 1, focus: 'full', sound: true, voice: true, vibrate: true, theme: 'auto' },
    plan: null,
    history: [],
  };
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
  store = Object.assign({}, DEFAULTS, store);
  store.settings = Object.assign({}, DEFAULTS.settings, store.settings);
  const S = store.settings;
  delete S.custom; // old format
  S.timing = Object.assign({}, Generator.DEFAULT_TIMING, Generator.LEVEL_TIMING[S.level], S.timing || {});
  if (store.plan && (!store.plan.timing || store.plan.warmSec === undefined)) store.plan = null; // plan from an older version
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
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200); }
  const regionTag = (e) => `<span class="tag ${e.region}">${{ lower: 'Lower', upper: 'Upper', core: 'Core', total: 'Total' }[e.region]}</span>`;
  const sideNote = (e) => (e.uni ? ' · each side' : e.alt ? ' · alternating' : '');

  // ---------- Tabs ----------
  let tab = 'home';
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  const TITLES = { home: 'Workout', library: 'Exercises', history: 'History', settings: 'Settings' };

  function render() {
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#title').textContent = TITLES[tab];
    const v = $('#view');
    v.innerHTML = '';
    ({ home: renderHome, library: renderLibrary, history: renderHistory, settings: renderSettings })[tab](v);
  }

  // ---------- Home / generator ----------
  let timingOpen = false;
  function timingSummary() {
    const t = S.timing;
    const restTxt = t.restEvery > 1 ? `${t.rest}s rest every ${t.restEvery} exercises` : `${t.rest}s rest`;
    const warm = t.warmOn ? `warm-up ${t.warmMin ? t.warmMin + ' min' : 'auto'}` : 'no warm-up';
    const cool = t.coolOn ? `cool-down ${t.coolMin ? t.coolMin + ' min' : 'auto'}` : 'no cool-down';
    return `${t.work}s work · ${restTxt} · ${t.prep}s get ready · ${t.roundRest}s between rounds · ${warm} · ${cool}`;
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
      </div>
      <div class="card" id="timingCard">
        <button class="row timing-head" id="tToggle" aria-expanded="${timingOpen}">
          <div style="flex:1;text-align:left"><p class="label" style="margin:0 0 4px">Timing</p><div class="small muted" id="tSum">${timingSummary()}</div></div>
          <span class="chev ${timingOpen ? 'open' : ''}">${ICON.chevron}</span>
        </button>
        <div id="tBody" ${timingOpen ? '' : 'hidden'}>
          ${stepper('work', 'Work', 'Time on each exercise', 10, 180, 5)}
          ${stepper('rest', 'Rest between exercises', '', 0, 180, 5)}
          ${stepper('restEvery', 'Rest after every … exercises', '“every” = after each one; 2 = pairs (supersets)', 1, 8, 1, 'x')}
          ${stepper('prep', 'Get ready', 'Countdown before each exercise', 0, 30, 5)}
          ${stepper('roundRest', 'Rest between rounds', '', 0, 300, 15)}
          ${stepper('blockRest', 'Rest between blocks', 'Long workouts are split into 2–3 blocks', 0, 300, 15)}
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
      S.level = +b.dataset.l; Object.assign(S.timing, Generator.LEVEL_TIMING[S.level]); save(); render();
    }));
    $$('#focus button').forEach((b) => (b.onclick = () => { S.focus = b.dataset.f; save(); $$('#focus button').forEach((x) => x.classList.toggle('on', x === b)); }));

    // timing panel
    const refreshSum = () => { $('#tSum').textContent = timingSummary(); };
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
    $('#tReset').onclick = () => { S.timing = Object.assign({}, Generator.DEFAULT_TIMING, Generator.LEVEL_TIMING[S.level]); save(); render(); toast('Timing reset'); };

    $('#gen').onclick = () => {
      store.plan = Generator.generate({ minutes: S.minutes, level: S.level, focus: S.focus, timing: S.timing });
      save(); render();
      setTimeout(() => $('#preview').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };
    if (store.plan) renderPreview($('#preview'), store.plan);
  }

  function exItem(id, idx, opts) {
    const e = EX[id];
    const d = document.createElement('div');
    d.className = 'ex-item';
    d.innerHTML = `${idx !== undefined ? `<div class="num">${idx}</div>` : ''}<div class="thumb"></div>
      <div class="info"><div class="name">${e.name}</div><div class="meta">${regionTag(e)}${e.muscles.slice(0, 3).join(', ')}${sideNote(e)}</div></div>`;
    const svg = svgFig(); d.querySelector('.thumb').appendChild(svg); Figure.still(svg, e.anim);
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
    const nEx = plan.blocks.reduce((s, b) => s + b.ex.length, 0);
    const t = plan.timing;
    root.innerHTML = `
      <div style="height:18px"></div>
      <div class="summary">
        <div><b>${fmtMin(total)}</b><span>total</span></div>
        <div><b>${fmtMin(workSec)}</b><span>work</span></div>
        <div><b>${nEx}</b><span>exercises</span></div>
      </div>
      <div class="flow-note">Built for flow: explosive and technical lifts come first while you're fresh, lower and upper body alternate so one area recovers while the other works, and core and floor work come last.</div>
    `;
    const head = (title, sub) => { const h = document.createElement('div'); h.className = 'block-head'; h.innerHTML = `<h3>${title}</h3><span class="small muted">${sub}</span>`; root.appendChild(h); };
    const list = () => { const l = document.createElement('div'); l.className = 'ex-list'; root.appendChild(l); return l; };

    if (plan.warm.length) {
      head('Warm-up', `${plan.warm.length} moves · ${fmtMin(iv.filter((x) => x.phase === 'warmup').reduce((s, x) => s + x.dur, 0))}`);
      const l = list(); plan.warm.forEach((id) => l.appendChild(exItem(id)));
    }

    plan.blocks.forEach((b, bi) => {
      head(plan.blocks.length > 1 ? `Block ${bi + 1}` : 'Main workout', `${b.rounds} ${b.rounds === 1 ? 'round' : 'rounds'} · ${t.work}s on / ${t.rest}s off${t.restEvery > 1 ? ` every ${t.restEvery}` : ''}`);
      const l = list();
      b.ex.forEach((id, i) => l.appendChild(exItem(id, i + 1, {
        onSwap: () => { Generator.swap(plan, bi, i); save(); renderPreview(root, plan); toast('Exercise swapped'); },
      })));
    });

    if (plan.cool.length) {
      head('Cool-down', `${plan.cool.length} stretches · ${fmtMin(iv.filter((x) => x.phase === 'cooldown').reduce((s, x) => s + x.dur, 0))}`);
      const l = list(); plan.cool.forEach((id) => l.appendChild(exItem(id)));
    }

    const st = document.createElement('div');
    st.className = 'sticky-start';
    st.innerHTML = `<button class="btn primary block big">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start · ${fmtMin(total)}</button>`;
    st.querySelector('button').onclick = () => Player.start(plan);
    root.appendChild(st);
  }

  // ---------- Exercise detail sheet ----------
  function openSheet(id) {
    const e = EX[id];
    const sh = $('#sheet');
    sh.innerHTML = `<div class="sheet-body" role="dialog" aria-label="${e.name}">
      <div class="grab"></div>
      <div class="row" style="justify-content:flex-end"><button class="icon-btn" id="shClose" aria-label="Close">${ICON.close}</button></div>
      <div class="stage"></div>
      <h2>${e.name}</h2>
      <p style="margin:10px 0 4px">${regionTag(e)}<span class="tag">${CAT_LABEL[e.cat]}</span><span class="tag">${LEVEL_LABEL[e.level]}</span>${e.uni ? '<span class="tag">each side</span>' : ''}${e.alt ? '<span class="tag">alternating</span>' : ''}${e.floor ? '<span class="tag">on the floor</span>' : ''}${e.bw ? '<span class="tag">bodyweight</span>' : ''}</p>
      <p class="small muted" style="margin:6px 0 0">Muscles: ${e.muscles.join(', ')}</p>
      <p class="label" style="margin-top:16px">How to do it</p>
      <ol>${e.cues.map((c) => `<li>${c}</li>`).join('')}</ol>
      ${e.avoid ? `<div class="avoid"><b>Avoid:</b> ${e.avoid}</div>` : ''}
    </div>`;
    const svg = svgFig(); sh.querySelector('.stage').appendChild(svg); Figure.animate(svg, e.anim);
    sh.hidden = false;
    const close = () => { Figure.stop(svg); sh.hidden = true; sh.innerHTML = ''; };
    $('#shClose').onclick = close;
    sh.onclick = (ev) => { if (ev.target === sh) close(); };
  }

  // ---------- Library ----------
  let libQuery = '', libCat = 'all';
  function renderLibrary(v) {
    const cats = ['all', 'ballistic', 'squat', 'hinge', 'lunge', 'push', 'pull', 'arms', 'core', 'total', 'warmup', 'stretch'];
    v.innerHTML = `<input class="search" type="search" placeholder="Search exercise or muscle…" value="${libQuery}">
      <div class="chips">${cats.map((c) => `<button class="chip ${c === libCat ? 'on' : ''}" data-c="${c}">${c === 'all' ? 'All' : CAT_LABEL[c]}</button>`).join('')}</div>
      <div class="lib-count"></div><div class="ex-list" id="libList"></div>`;
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const items = EXERCISES.filter((e) => (libCat === 'all' || e.cat === libCat) &&
        (!q || [e.name, e.muscles.join(' '), CAT_LABEL[e.cat]].join(' ').toLowerCase().includes(q)));
      $('.lib-count').textContent = `${items.length} exercises`;
      const list = $('#libList'); list.innerHTML = '';
      items.forEach((e) => list.appendChild(exItem(e.id)));
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
      c.innerHTML = `<div class="date"><b>${dt.getDate()}</b><span>${MONTHS[dt.getMonth()]}</span></div>
        <div style="flex:1;min-width:0"><div style="font-weight:700">${fmtMin(x.sec)} · ${Generator.FOCUS_LABEL[x.focus] || ''}</div>
        <div class="small muted">${LEVEL_LABEL[x.level]} · ${x.ex.length} exercises${x.done ? '' : ' · stopped early'}</div>
        <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.ex.map((id) => (EX[id] ? EX[id].name : id)).join(' · ')}</div></div>`;
      hl.appendChild(c);
    });
  }

  // ---------- Settings ----------
  function renderSettings(v) {
    const sw = (key, label, sub) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" data-k="${key}" ${S[key] ? 'checked' : ''}><span></span></label></div>`;
    v.innerHTML = `
      <div class="card"><p class="label">Sound &amp; feedback</p>
        ${sw('sound', 'Beeps', 'At the start of each interval and in the last 3 seconds')}
        ${sw('voice', 'Voice coach', 'Announces each exercise (English)')}
        ${sw('vibrate', 'Vibration', 'On phones that support it')}
        <button class="btn ghost block" id="testVoice" style="margin-top:10px">Test voice</button>
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
      <div class="card"><p class="label">Data</p>
        <p class="small muted" style="margin:0 0 10px">${EXERCISES.filter((e) => !['warmup', 'stretch'].includes(e.cat)).length} main exercises, ${EXERCISES.filter((e) => e.cat === 'warmup').length} warm-up moves, ${EXERCISES.filter((e) => e.cat === 'stretch').length} stretches. History is stored only on this device.</p>
        <button class="btn ghost block" id="clearHist">Clear history</button>
      </div>`;
    $$('input[data-k]').forEach((i) => (i.onchange = () => { S[i.dataset.k] = i.checked; save(); }));
    $('#testVoice').onclick = () => { Fx.unlock(); const prev = S.voice; S.voice = true; Fx.say('Goblet squat. Let\'s go!'); S.voice = prev; };
    $$('#theme button').forEach((b) => (b.onclick = () => { S.theme = b.dataset.t; save(); applyTheme(); $$('#theme button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#clearHist').onclick = () => { if (confirm('Delete your entire workout history?')) { store.history = []; save(); toast('History cleared'); } };
  }

  // ---------- Audio / voice / vibration ----------
  const Fx = {
    ctx: null,
    unlock() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* no audio */ }
      if (window.speechSynthesis && !this._primed) { try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); this._primed = true; } catch (e) { /* ignore */ } }
    },
    beep(freq = 880, dur = 0.12, vol = 0.25, when = 0) {
      if (!S.sound || !this.ctx) return;
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    voiceObj: null,
    pickVoice() {
      const vs = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
      const pref = [/samantha/i, /google us english/i, /aria|jenny|guy/i, /daniel/i, /karen|moira|serena/i, /en-us/i];
      for (const re of pref) { const v = vs.find((x) => re.test(x.name) || re.test(x.lang)); if (v) return v; }
      return vs.find((v) => v.localService) || vs[0] || null;
    },
    say(text) {
      if (!S.voice || !window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!this.voiceObj) this.voiceObj = this.pickVoice();
        if (this.voiceObj) { u.voice = this.voiceObj; u.lang = this.voiceObj.lang; } else u.lang = 'en-US';
        u.rate = 1.0;
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    buzz(p) { if (S.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } },
  };
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { Fx.voiceObj = null; };

  // ---------- Player ----------
  const PHASE = { prep: 'Get ready', warmup: 'Warm-up', work: 'Work', rest: 'Rest', cooldown: 'Cool-down' };
  const Player = {
    start(plan) {
      Fx.unlock();
      this.plan = plan;
      this.iv = Generator.buildIntervals(plan);
      this.total = this.iv.reduce((s, x) => s + x.dur, 0);
      this.skipped = 0;
      this.running = true; this.last = performance.now();
      this.el = $('#player'); this.el.hidden = false;
      document.body.style.overflow = 'hidden';
      this.el.innerHTML = `
        <div class="p-top"><div><div class="p-phase"></div><div class="p-label"></div></div><div class="spacer"></div>
          <div class="p-left"><b id="pLeft"></b><span>left</span></div><button class="icon-btn" id="pClose" aria-label="Quit workout">${ICON.close}</button></div>
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
      $('#pClose').onclick = () => this.exit();
      $('#pPlay').onclick = () => this.toggle();
      $('#pNext').onclick = () => this.jump(1);
      $('#pPrev').onclick = () => this.jump(-1);
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
      if (x.phase === 'rest' || x.phase === 'prep') { btns.push(['startNow', x.phase === 'rest' ? 'Skip rest' : 'Start now']); if (x.phase === 'rest') btns.push(['add15', '+15s']); }
      if (x.phase === 'warmup' || (x.phase === 'prep' && this.iv[this.idx + 1] && this.iv[this.idx + 1].phase === 'warmup')) btns.push(['skipWarm', 'Skip warm-up']);
      if (x.phase === 'work' && this.iv.some((y, i) => i > this.idx && y.phase === 'cooldown')) btns.push(['toCool', 'Skip to cool-down']);
      if (x.phase === 'cooldown') btns.push(['finish', 'Finish now']);
      box.innerHTML = btns.map(([k, l]) => `<button class="chip" data-skip="${k}">${l}</button>`).join('');
      $$('[data-skip]', box).forEach((b) => (b.onclick = () => this.skipAction(b.dataset.skip)));
    },
    skipAction(k) {
      const findFrom = (pred) => { for (let i = this.idx + 1; i < this.iv.length; i++) if (pred(this.iv[i])) return i; return -1; };
      if (k === 'startNow') return this.jump(1);
      if (k === 'add15') { this.remain += 15; this.iv[this.idx].dur += 15; this.total += 15; this.renderTime(); return; }
      if (k === 'skipWarm') { const i = findFrom((y) => y.phase !== 'warmup' && y.phase !== 'prep'); return this.goTo(i < 0 ? this.iv.length - 1 : Math.max(this.idx + 1, i - 1)); }
      if (k === 'toCool') { const i = findFrom((y) => y.phase === 'cooldown'); if (i > 0) return this.goTo(this.iv[i - 1].phase === 'prep' ? i - 1 : i); }
      if (k === 'finish') return this.finish();
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
      const isRest = x.phase === 'rest' || x.phase === 'prep';
      const e = EX[x.ex];
      this.el.classList.toggle('rest', x.phase === 'rest');
      this.el.classList.toggle('prep', x.phase === 'prep');
      this.el.classList.toggle('cool', x.phase === 'cooldown');
      $('.p-phase', this.el).textContent = PHASE[x.phase];
      $('.p-label', this.el).textContent = x.label || '';
      $('.p-name', this.el).textContent = (isRest ? 'Next: ' : '') + e.name;
      const badge = $('.p-badge', this.el);
      if (x.side && !isRest) { badge.hidden = false; badge.textContent = x.side; badge.classList.toggle('alt', x.side === 'Alternate'); }
      else if (isRest && e.uni) { badge.hidden = false; badge.textContent = 'Each side'; badge.classList.add('alt'); }
      else badge.hidden = true;
      $('.p-cue', this.el).textContent = e.cues[0] || '';
      this.cueIdx = 0;
      const nx = x.next ? EX[x.next] : null;
      $('.p-next', this.el).textContent = !isRest && nx ? 'Up next: ' + nx.name : '';
      if (!this.svg._fig || this.svg._fig.key !== e.anim) Figure.animate(this.svg, e.anim, { speed: isRest ? 0.8 : 1 });
      Figure.setPaused(this.svg, !this.running);
      this.renderSkips();
      this.renderTime();

      if (x.phase === 'prep') {
        Fx.beep(520, 0.2); Fx.buzz(80);
        Fx.say(first ? `Get ready. First up: ${e.name}` : `Get ready. ${e.name}${e.uni ? ', left side first' : ''}`);
      } else if (x.phase === 'rest') {
        Fx.beep(440, 0.3); Fx.buzz(150);
        Fx.say(`Rest. Next up: ${e.name}`);
      } else if (x.sideSwitch) {
        Fx.beep(880, 0.12); Fx.beep(880, 0.12, 0.25, 0.18); Fx.buzz([80, 60, 80]);
        Fx.say('Switch sides');
      } else {
        Fx.beep(990, 0.35); Fx.buzz(200);
        const prevPrep = i > 0 && this.iv[i - 1].phase === 'prep' && this.iv[i - 1].ex === x.ex;
        Fx.say(prevPrep ? 'Go!' : `${e.name}${x.side === 'Left side' ? ', left side' : x.side === 'Alternate' ? ', alternating' : ''}. Go!`);
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
      this.remain -= dt;
      const sec = Math.ceil(this.remain);
      if (sec <= 3 && sec >= 1 && this.lastBeep !== sec) { this.lastBeep = sec; Fx.beep(660, 0.1, 0.2); }
      const x = this.iv[this.idx], e = EX[x.ex];
      const ci = Math.floor((x.dur - this.remain) / 10) % e.cues.length;
      if (ci !== this.cueIdx) { this.cueIdx = ci; $('.p-cue', this.el).textContent = e.cues[ci]; }
      if (this.remain <= 0) {
        if (this.idx + 1 >= this.iv.length) return this.finish();
        this.enter(this.idx + 1);
      }
      this.renderTime();
    },
    toggle() {
      this.running = !this.running; this.last = performance.now();
      $('#pPlay .ic').innerHTML = this.running ? ICON.pause : ICON.play;
      $('#pPlay').setAttribute('aria-label', this.running ? 'Pause' : 'Resume');
      Figure.setPaused(this.svg, !this.running);
      if (this.running) { Fx.unlock(); this.wake(); } else Fx.say('Paused');
    },
    jump(d) {
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
      if (sec < 120) return;
      store.history.push({ date: Date.now(), sec, minutes: this.plan.minutes, focus: this.plan.focus, level: this.plan.level, ex: this.plan.blocks.flatMap((b) => b.ex), done });
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
      Fx.beep(660, 0.15); Fx.beep(880, 0.15, 0.25, 0.18); Fx.beep(1100, 0.4, 0.25, 0.36); Fx.buzz([100, 80, 100, 80, 300]);
      Fx.say('Workout complete. Great job!');
      const sec = Math.round(this.doneSec());
      this.el.innerHTML = `<div class="p-done"><div class="big">💪</div><h2>Workout complete!</h2>
        <p class="muted">${fmtMin(sec)} · ${this.plan.blocks.reduce((s, b) => s + b.ex.length, 0)} exercises · ${Generator.FOCUS_LABEL[this.plan.focus]}</p>
        <button class="btn primary big" id="pOk" style="min-width:220px">Done</button></div>`;
      $('#pOk').onclick = () => { this.close(); tab = 'history'; render(); };
    },
    close() {
      clearInterval(this.timer);
      if (this.svg) Figure.stop(this.svg);
      if (window.speechSynthesis) speechSynthesis.cancel();
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

  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
