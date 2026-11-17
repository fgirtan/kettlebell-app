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
    play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M5 4v16l10-8zM17 4h3v16h-3z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M19 4v16L9 12zM4 4h3v16H4z"/></svg>',
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  };

  // ---------- Storage ----------
  const KEY = 'kettlebell.v1';
  const DEFAULTS = {
    settings: { minutes: 30, level: 1, focus: 'full', sound: true, voice: true, vibrate: true, theme: 'auto', custom: { enabled: false, work: 40, rest: 20, roundRest: 30 } },
    plan: null,
    history: [],
  };
  let store;
  try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
  store = Object.assign({}, DEFAULTS, store);
  store.settings = Object.assign({}, DEFAULTS.settings, store.settings);
  store.settings.custom = Object.assign({}, DEFAULTS.settings.custom, store.settings.custom);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ } };
  const S = store.settings;

  function applyTheme() {
    if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', S.theme);
  }
  applyTheme();

  // ---------- Helpers ----------
  const fmt = (sec) => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, '0')}`; };
  const fmtMin = (sec) => `${Math.round(sec / 60)} min`;
  function svgFig(cls) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fig ' + (cls || '')); return s; }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200); }
  const regionTag = (e) => `<span class="tag ${e.region}">${{ lower: 'Picioare', upper: 'Superior', core: 'Core', total: 'Tot corpul' }[e.region]}</span>`;
  const sideNote = (e) => (e.uni ? ' · pe fiecare parte' : e.alt ? ' · alternativ' : '');

  // ---------- Tabs ----------
  let tab = 'home';
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  const TITLES = { home: 'Antrenament', library: 'Exerciții', history: 'Istoric', settings: 'Setări' };

  function render() {
    $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#title').textContent = TITLES[tab];
    const v = $('#view');
    v.innerHTML = '';
    ({ home: renderHome, library: renderLibrary, history: renderHistory, settings: renderSettings })[tab](v);
  }

  // ---------- Home / generator ----------
  function timingFor(level) {
    return S.custom.enabled ? S.custom : Generator.LEVEL_TIMING[level];
  }

  function renderHome(v) {
    const t = timingFor(S.level);
    v.insertAdjacentHTML('beforeend', `
      <div class="card">
        <p class="label">Cât timp ai?</p>
        <div class="duration">
          <button class="icon-btn" id="dMinus" aria-label="Mai puțin">${ICON.minus}</button>
          <div class="num"><span id="dNum">${S.minutes}</span><small>min</small></div>
          <button class="icon-btn" id="dPlus" aria-label="Mai mult">${ICON.plus}</button>
        </div>
        <input type="range" id="dRange" min="5" max="90" step="5" value="${S.minutes}" aria-label="Durată">
        <div class="chips" style="margin-top:10px">${[10, 15, 20, 30, 45, 60].map((m) => `<button class="chip ${m === S.minutes ? 'on' : ''}" data-min="${m}">${m} min</button>`).join('')}</div>
      </div>
      <div class="card">
        <p class="label">Nivel</p>
        <div class="seg" id="lvl">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${l === S.level ? 'on' : ''}">${LEVEL_LABEL[l]}</button>`).join('')}</div>
        <p class="small muted" style="margin:10px 2px 0">${t.work}s lucru · ${t.rest}s pauză · ${t.roundRest}s între runde${S.custom.enabled ? ' (personalizat)' : ''}</p>
      </div>
      <div class="card">
        <p class="label">Accent</p>
        <div class="seg wrap" id="focus">${Object.entries(Generator.FOCUS_SHORT).map(([k, l]) => `<button data-f="${k}" class="${k === S.focus ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <button class="btn primary block big" id="gen">${store.plan ? 'Generează alt antrenament' : 'Generează antrenament'}</button>
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
    $$('#lvl button').forEach((b) => (b.onclick = () => { S.level = +b.dataset.l; save(); render(); }));
    $$('#focus button').forEach((b) => (b.onclick = () => { S.focus = b.dataset.f; save(); $$('#focus button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#gen').onclick = () => {
      store.plan = Generator.generate({ minutes: S.minutes, level: S.level, focus: S.focus, custom: S.custom });
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
      <div class="info"><div class="name">${e.ro}</div><div class="meta">${regionTag(e)}${e.muscles.slice(0, 3).join(', ')}${sideNote(e)}</div></div>`;
    const svg = svgFig(); d.querySelector('.thumb').appendChild(svg); Figure.still(svg, e.anim);
    d.querySelector('.info').onclick = () => openSheet(id);
    d.querySelector('.thumb').onclick = () => openSheet(id);
    if (opts && opts.onSwap) {
      const b = document.createElement('button');
      b.className = 'icon-btn'; b.setAttribute('aria-label', 'Schimbă exercițiul'); b.innerHTML = ICON.swap;
      b.onclick = opts.onSwap; d.appendChild(b);
    }
    return d;
  }

  function renderPreview(root, plan) {
    const total = Generator.totalDuration(plan);
    const nEx = plan.blocks.reduce((s, b) => s + b.ex.length, 0);
    root.innerHTML = `
      <div style="height:18px"></div>
      <div class="summary">
        <div><b>${fmtMin(total)}</b><span>durată</span></div>
        <div><b>${nEx}</b><span>exerciții</span></div>
        <div><b>${plan.blocks.length > 1 ? plan.blocks.length + ' blocuri' : plan.blocks[0].rounds + ' runde'}</b><span>${Generator.FOCUS_LABEL[plan.focus].toLowerCase()}</span></div>
      </div>
      <div class="flow-note">Ordinea e gândită: exercițiile explozive și tehnice la început (cât ești odihnit), apoi alternăm picioare ↔ partea superioară ca o grupă să se refacă în timp ce lucrează cealaltă, iar core-ul și exercițiile la sol vin la final.</div>
    `;
    const head = (title, sub) => { const h = document.createElement('div'); h.className = 'block-head'; h.innerHTML = `<h3>${title}</h3><span class="small muted">${sub}</span>`; root.appendChild(h); };
    const list = () => { const l = document.createElement('div'); l.className = 'ex-list'; root.appendChild(l); return l; };

    head('Încălzire', `${plan.warm.length} × ${plan.warmDur}s`);
    let l = list(); plan.warm.forEach((id) => l.appendChild(exItem(id)));

    plan.blocks.forEach((b, bi) => {
      head(plan.blocks.length > 1 ? `Blocul ${bi + 1}` : 'Antrenament', `${b.rounds} ${b.rounds === 1 ? 'rundă' : 'runde'} · ${b.work}s / ${b.rest}s`);
      l = list();
      b.ex.forEach((id, i) => l.appendChild(exItem(id, i + 1, {
        onSwap: () => { Generator.swap(plan, bi, i); save(); renderPreview(root, plan); toast('Exercițiu înlocuit'); },
      })));
    });

    head('Revenire', `${plan.cool.length} × ${plan.coolDur}s`);
    l = list(); plan.cool.forEach((id) => l.appendChild(exItem(id)));

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
    sh.innerHTML = `<div class="sheet-body" role="dialog" aria-label="${e.ro}">
      <div class="grab"></div>
      <div class="row" style="justify-content:flex-end"><button class="icon-btn" id="shClose" aria-label="Închide">${ICON.close}</button></div>
      <div class="stage"></div>
      <h2>${e.ro}</h2>
      <div class="en">${e.name}</div>
      <p style="margin:10px 0 4px">${regionTag(e)}<span class="tag">${CAT_LABEL[e.cat]}</span><span class="tag">${LEVEL_LABEL[e.level]}</span>${e.uni ? '<span class="tag">pe fiecare parte</span>' : ''}${e.alt ? '<span class="tag">alternativ</span>' : ''}${e.floor ? '<span class="tag">la sol</span>' : ''}${e.bw ? '<span class="tag">fără greutate</span>' : ''}</p>
      <p class="small muted" style="margin:6px 0 0">Mușchi: ${e.muscles.join(', ')}</p>
      <p class="label" style="margin-top:16px">Execuție</p>
      <ol>${e.cues.map((c) => `<li>${c}</li>`).join('')}</ol>
      ${e.avoid ? `<div class="avoid"><b>Evită:</b> ${e.avoid}</div>` : ''}
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
    v.innerHTML = `<input class="search" type="search" placeholder="Caută exercițiu sau mușchi…" value="${libQuery}">
      <div class="chips">${cats.map((c) => `<button class="chip ${c === libCat ? 'on' : ''}" data-c="${c}">${c === 'all' ? 'Toate' : CAT_LABEL[c]}</button>`).join('')}</div>
      <div class="lib-count"></div><div class="ex-list" id="libList"></div>`;
    const draw = () => {
      const q = libQuery.trim().toLowerCase();
      const items = EXERCISES.filter((e) => (libCat === 'all' || e.cat === libCat) &&
        (!q || [e.ro, e.name, e.muscles.join(' '), CAT_LABEL[e.cat]].join(' ').toLowerCase().includes(q)));
      $('.lib-count').textContent = `${items.length} exerciții`;
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
    // streak in days
    const days = new Set(h.map((x) => new Date(x.date).toDateString()));
    let streak = 0; const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    const weekAgo = Date.now() - 7 * 864e5;
    v.innerHTML = `<div class="stats">
        <div><b>${h.length}</b><span>antrenamente</span></div>
        <div><b>${totalMin}</b><span>minute total</span></div>
        <div><b>${h.filter((x) => x.date > weekAgo).length}</b><span>în ultimele 7 zile</span></div>
      </div>
      ${streak > 1 ? `<div class="flow-note">🔥 ${streak} zile la rând. Ține-o tot așa!</div>` : ''}
      <div id="hl"></div>`;
    const hl = $('#hl');
    if (!h.length) { hl.innerHTML = '<div class="card muted">Încă nu ai niciun antrenament salvat. Generează unul și apasă Start.</div>'; return; }
    const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    h.slice().reverse().forEach((x) => {
      const dt = new Date(x.date);
      const c = document.createElement('div'); c.className = 'card hist-item';
      c.innerHTML = `<div class="date"><b>${dt.getDate()}</b><span>${MONTHS[dt.getMonth()]}</span></div>
        <div style="flex:1;min-width:0"><div style="font-weight:700">${fmtMin(x.sec)} · ${Generator.FOCUS_LABEL[x.focus] || ''}</div>
        <div class="small muted">${LEVEL_LABEL[x.level]} · ${x.ex.length} exerciții${x.done ? '' : ' · oprit înainte de final'}</div>
        <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.ex.map((id) => (EX[id] ? EX[id].ro : id)).join(' · ')}</div></div>`;
      hl.appendChild(c);
    });
  }

  // ---------- Settings ----------
  function renderSettings(v) {
    const sw = (key, label, sub) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" data-k="${key}" ${S[key] ? 'checked' : ''}><span></span></label></div>`;
    const step = (key, label, min, max, st) => `<div class="set-row"><div>${label}</div><div class="stepper"><button class="icon-btn" data-step="${key}" data-d="${-st}" data-min="${min}" data-max="${max}">${ICON.minus}</button><b id="v_${key}">${S.custom[key]}s</b><button class="icon-btn" data-step="${key}" data-d="${st}" data-min="${min}" data-max="${max}">${ICON.plus}</button></div></div>`;
    v.innerHTML = `
      <div class="card"><p class="label">Sunet și feedback</p>
        ${sw('sound', 'Semnale sonore', 'Bip la start și în ultimele 3 secunde')}
        ${sw('voice', 'Anunț vocal', 'Citește numele exercițiului (română)')}
        ${sw('vibrate', 'Vibrații', 'Doar pe telefoanele care permit')}
      </div>
      <div class="card"><p class="label">Intervale</p>
        <div class="set-row"><div><div>Intervale personalizate</div><div class="small muted">Altfel se folosesc cele ale nivelului</div></div><label class="switch"><input type="checkbox" id="customOn" ${S.custom.enabled ? 'checked' : ''}><span></span></label></div>
        <div id="customBox" ${S.custom.enabled ? '' : 'hidden'}>
          ${step('work', 'Lucru', 15, 90, 5)}${step('rest', 'Pauză', 0, 60, 5)}${step('roundRest', 'Pauză între runde', 0, 120, 15)}
        </div>
      </div>
      <div class="card"><p class="label">Temă</p>
        <div class="seg" id="theme">${[['auto', 'Automat'], ['dark', 'Întunecat'], ['light', 'Luminos']].map(([k, l]) => `<button data-t="${k}" class="${S.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="card"><p class="label">Instalare pe telefon</p>
        <p class="small" style="margin:0 0 8px"><b>Android (Chrome):</b> meniul ⋮ → „Adaugă pe ecranul de pornire” / „Instalează aplicația”.</p>
        <p class="small" style="margin:0"><b>iPhone (Safari):</b> butonul Partajare → „Adaugă pe ecranul principal”.</p>
        <p class="small muted" style="margin:8px 0 0">După prima deschidere aplicația funcționează complet offline.</p>
      </div>
      <div class="card"><p class="label">Date</p>
        <p class="small muted" style="margin:0 0 10px">${EXERCISES.filter((e) => !['warmup', 'stretch'].includes(e.cat)).length} exerciții principale, ${EXERCISES.filter((e) => e.cat === 'warmup').length} de încălzire, ${EXERCISES.filter((e) => e.cat === 'stretch').length} de stretching. Istoricul se păstrează doar pe acest telefon.</p>
        <button class="btn ghost block" id="clearHist">Șterge istoricul</button>
      </div>`;
    $$('input[data-k]').forEach((i) => (i.onchange = () => { S[i.dataset.k] = i.checked; save(); }));
    $('#customOn').onchange = (e) => { S.custom.enabled = e.target.checked; save(); $('#customBox').hidden = !S.custom.enabled; };
    $$('[data-step]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.step; S.custom[k] = Math.max(+b.dataset.min, Math.min(+b.dataset.max, S.custom[k] + +b.dataset.d));
      save(); $('#v_' + k).textContent = S.custom[k] + 's';
    }));
    $$('#theme button').forEach((b) => (b.onclick = () => { S.theme = b.dataset.t; save(); applyTheme(); $$('#theme button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#clearHist').onclick = () => { if (confirm('Ștergi tot istoricul antrenamentelor?')) { store.history = []; save(); toast('Istoric șters'); } };
  }

  // ---------- Audio / voice / vibration ----------
  const Fx = {
    ctx: null,
    unlock() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* no audio */ }
      if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
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
    say(text) {
      if (!S.voice || !window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ro-RO'; u.rate = 1.02;
        if (!this.voiceObj) this.voiceObj = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('ro')) || null;
        if (this.voiceObj) u.voice = this.voiceObj;
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
    buzz(p) { if (S.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } },
  };
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { Fx.voiceObj = null; };

  // ---------- Player ----------
  const Player = {
    start(plan) {
      Fx.unlock();
      this.plan = plan;
      this.iv = Generator.buildIntervals(plan);
      this.total = this.iv.reduce((s, x) => s + x.dur, 0);
      this.idx = 0; this.elapsedBefore = 0; this.remain = this.iv[0].dur;
      this.running = true; this.last = performance.now(); this.lastBeep = null;
      this.el = $('#player'); this.el.hidden = false;
      document.body.style.overflow = 'hidden';
      this.el.innerHTML = `
        <div class="p-top"><div><div class="p-phase"></div><div class="p-label"></div></div><div class="spacer"></div>
          <div class="small muted" id="pLeft"></div><button class="icon-btn" id="pClose" aria-label="Închide">${ICON.close}</button></div>
        <div class="p-progress"><i></i></div>
        <div class="p-stage"><span class="p-badge" hidden></span></div>
        <div class="p-name"></div><div class="p-sub"></div>
        <div class="p-timer"></div>
        <div class="p-cue"></div>
        <div class="p-next"></div>
        <div class="p-controls">
          <button id="pPrev" aria-label="Înapoi">${ICON.prev}</button>
          <button id="pPlay" class="main" aria-label="Pauză">${ICON.pause}</button>
          <button id="pNext" aria-label="Următorul">${ICON.next}</button>
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
    enter(i, silent) {
      this.idx = i;
      const x = this.iv[i];
      this.remain = x.dur; this.lastBeep = null;
      this.elapsedBefore = this.iv.slice(0, i).reduce((s, y) => s + y.dur, 0);
      const isRest = x.phase === 'rest' || x.phase === 'blockrest' || x.phase === 'ready';
      const e = EX[x.ex];
      this.el.classList.toggle('rest', isRest);
      this.el.classList.toggle('cool', x.phase === 'cooldown');
      const PH = { ready: 'Pregătește-te', warmup: 'Încălzire', work: 'Lucru', rest: 'Pauză', blockrest: 'Pauză', cooldown: 'Revenire' };
      $('.p-phase', this.el).textContent = PH[x.phase];
      $('.p-label', this.el).textContent = x.label || '';
      $('.p-name', this.el).textContent = (isRest ? 'Urmează: ' : '') + e.ro;
      $('.p-sub', this.el).textContent = e.name + (x.phase === 'work' || x.phase === 'warmup' || x.phase === 'cooldown' ? '' : '');
      const badge = $('.p-badge', this.el);
      if (x.side && !isRest) { badge.hidden = false; badge.textContent = x.side; badge.classList.toggle('alt', x.side === 'Alternează'); }
      else badge.hidden = true;
      $('.p-cue', this.el).textContent = e.cues[0] || '';
      this.cueIdx = 0;
      const nx = x.next ? EX[x.next] : null;
      $('.p-next', this.el).textContent = !isRest && nx ? 'Apoi: ' + nx.ro : '';
      if (!this.svg._fig || this.svg._fig.key !== e.anim) Figure.animate(this.svg, e.anim, { speed: isRest ? 0.8 : 1 });
      Figure.setPaused(this.svg, !this.running);
      this.renderTime();
      if (silent && x.phase === 'ready') { Fx.say('Pregătește-te. Începem cu ' + e.ro); return; }
      if (isRest) {
        Fx.beep(520, 0.25); Fx.buzz(120);
        Fx.say(x.phase === 'ready' ? 'Pregătește-te' : 'Pauză. Urmează ' + e.ro + (e.uni ? ', pe fiecare parte' : ''));
      } else if (x.sideSwitch) {
        Fx.beep(880, 0.12); Fx.beep(880, 0.12, 0.25, 0.18); Fx.buzz([80, 60, 80]);
        Fx.say('Schimbă partea');
      } else {
        Fx.beep(990, 0.35); Fx.buzz(200);
        Fx.say(e.ro + (x.side === 'Stânga' ? ', partea stângă' : x.side === 'Alternează' ? ', alternativ' : ''));
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
      // rotate cues during long intervals
      const x = this.iv[this.idx], e = EX[x.ex];
      const elapsed = x.dur - this.remain;
      const ci = Math.floor(elapsed / 10) % e.cues.length;
      if (ci !== this.cueIdx) { this.cueIdx = ci; $('.p-cue', this.el).textContent = e.cues[ci]; }
      if (this.remain <= 0) {
        if (this.idx + 1 >= this.iv.length) return this.finish(true);
        this.enter(this.idx + 1);
      }
      this.renderTime();
    },
    toggle() {
      this.running = !this.running; this.last = performance.now();
      $('#pPlay').innerHTML = this.running ? ICON.pause : ICON.play;
      $('#pPlay').setAttribute('aria-label', this.running ? 'Pauză' : 'Continuă');
      Figure.setPaused(this.svg, !this.running);
      if (this.running) { Fx.unlock(); this.wake(); }
    },
    jump(d) {
      let i = this.idx + d;
      if (d < 0 && this.iv[this.idx].dur - this.remain > 3) i = this.idx; // restart current
      i = Math.max(0, Math.min(this.iv.length - 1, i));
      this.enter(i);
    },
    doneSec() { return this.elapsedBefore + (this.iv[this.idx].dur - this.remain); },
    record(done) {
      const sec = Math.round(done ? this.total : this.doneSec());
      if (sec < 120) return;
      store.history.push({ date: Date.now(), sec, minutes: this.plan.minutes, focus: this.plan.focus, level: this.plan.level, ex: this.plan.blocks.flatMap((b) => b.ex), done });
      save();
    },
    exit() {
      const done = this.doneSec();
      if (done > 30 && !confirm('Oprești antrenamentul? Progresul se salvează în istoric.')) return;
      this.record(false);
      this.close();
    },
    finish() {
      this.record(true);
      clearInterval(this.timer);
      Figure.stop(this.svg);
      Fx.beep(660, 0.15); Fx.beep(880, 0.15, 0.25, 0.18); Fx.beep(1100, 0.4, 0.25, 0.36); Fx.buzz([100, 80, 100, 80, 300]);
      Fx.say('Felicitări! Antrenament terminat.');
      this.el.innerHTML = `<div class="p-done"><div class="big">💪</div><h2>Antrenament terminat!</h2>
        <p class="muted">${fmtMin(this.total)} · ${this.plan.blocks.reduce((s, b) => s + b.ex.length, 0)} exerciții · ${Generator.FOCUS_LABEL[this.plan.focus]}</p>
        <button class="btn primary big" id="pOk" style="min-width:220px">Gata</button></div>`;
      $('#pOk').onclick = () => { this.close(); tab = 'history'; render(); };
    },
    close() {
      clearInterval(this.timer);
      if (this.svg) Figure.stop(this.svg);
      if (window.speechSynthesis) speechSynthesis.cancel();
      try { if (this.lock) this.lock.release(); } catch (e) { /* ignore */ }
      this.lock = null;
      this.el.hidden = true; this.el.innerHTML = '';
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
