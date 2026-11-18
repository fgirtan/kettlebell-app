// Shadowboxing module: rounds or continuous time, with spoken punch / defense combos.
// Uses the shared helpers exposed by app.js as window.KBAPI (voice, sounds, storage).
(function (global) {
  'use strict';

  const DEFAULTS = {
    mode: 'rounds', rounds: 3, roundSec: 180, restSec: 60, totalMin: 15,
    level: 2, pace: 0, terms: 'lr', stance: 'orth', defense: true, body: true, bursts: true, prep: 10,
  };
  const LEVELS = {
    1: { label: 'Beginner', len: [1, 3], gap: 3.2, defense: 0.12, power: 0.25, body: 0.05 },
    2: { label: 'Intermediate', len: [2, 4], gap: 2.3, defense: 0.25, power: 0.55, body: 0.12 },
    3: { label: 'Advanced', len: [3, 6], gap: 1.6, defense: 0.33, power: 0.75, body: 0.18 },
  };

  // ---------- Vocabulary ----------
  // Each move: kind (strike/defense), side ('L'/'R'/null), and how long it takes to throw (s).
  const STRIKES = {
    short: { t: 0.35 }, long: { t: 0.45 }, hook: { t: 0.55 }, uppercut: { t: 0.55 },
  };
  const DEFENSES = ['duck', 'duckL', 'duckR', 'block', 'stepBack', 'pivotL', 'pivotR'];
  const sideWord = (s) => (s === 'L' ? 'left' : 'right');

  // Words used when speaking/showing a move
  function moveText(m, cfg) {
    const lead = cfg.stance === 'orth' ? 'L' : 'R';
    if (m.kind === 'strike') {
      if (cfg.terms === 'classic') {
        const isLead = m.side === lead;
        const name = { short: isLead ? 'jab' : 'rear jab', long: isLead ? 'lead straight' : 'cross',
          hook: isLead ? 'lead hook' : 'rear hook', uppercut: isLead ? 'lead uppercut' : 'rear uppercut' }[m.type];
        return (m.double ? 'double ' : '') + name + (m.body ? ' to the body' : '');
      }
      // left/right wording: "short left", "long right", "hook left", "uppercut right"
      const base = m.type === 'short' || m.type === 'long' ? `${m.type} ${sideWord(m.side)}` : `${m.type} ${sideWord(m.side)}`;
      return (m.double ? 'double ' : '') + base + (m.body ? ' body' : '');
    }
    return { duck: 'duck', duckL: 'duck left', duckR: 'duck right', block: 'block', stepBack: 'step back',
      pivotL: 'pivot left', pivotR: 'pivot right' }[m.type];
  }

  // ---------- Combo generator ----------
  const rnd = (n) => Math.floor(Math.random() * n);
  const chance = (p) => Math.random() < p;
  const pick = (a) => a[rnd(a.length)];

  // Classic combos (orthodox notation: L = lead). Mirrored for southpaw.
  const CLASSICS = [
    [['short', 'L'], ['long', 'R']],
    [['short', 'L'], ['long', 'R'], ['hook', 'L']],
    [['short', 'L', 'double'], ['long', 'R']],
    [['long', 'R'], ['hook', 'L'], ['long', 'R']],
    [['short', 'L'], ['long', 'R'], ['duckR'], ['long', 'R']],
    [['short', 'L'], ['duckL'], ['hook', 'L']],
    [['uppercut', 'L'], ['hook', 'L'], ['long', 'R']],
    [['short', 'L'], ['long', 'R'], ['hook', 'L'], ['long', 'R']],
    [['duck'], ['hook', 'L'], ['long', 'R']],
    [['short', 'L'], ['uppercut', 'R'], ['hook', 'L']],
    [['hook', 'L', 'body'], ['hook', 'L']],
    [['short', 'L'], ['long', 'R', 'body'], ['hook', 'L']],
    [['long', 'R'], ['duckL'], ['long', 'R'], ['hook', 'L']],
    [['short', 'L'], ['long', 'R'], ['stepBack']],
  ];

  function fromClassic(c, cfg) {
    const flip = cfg.stance === 'south';
    const sw = (s) => (flip ? (s === 'L' ? 'R' : 'L') : s);
    return c.map(([type, side, mod]) => {
      if (DEFENSES.includes(type)) {
        const t = flip ? { duckL: 'duckR', duckR: 'duckL', pivotL: 'pivotR', pivotR: 'pivotL' }[type] || type : type;
        return { kind: 'defense', type: t };
      }
      return { kind: 'strike', type, side: sw(side), double: mod === 'double', body: mod === 'body' };
    });
  }

  function generateCombo(cfg) {
    const L = LEVELS[cfg.level];
    const lead = cfg.stance === 'orth' ? 'L' : 'R';
    const rear = lead === 'L' ? 'R' : 'L';
    const ok = (c) => c.every((m) => (cfg.defense || m.kind !== 'defense') && (cfg.body || !m.body));
    if (chance(0.35)) {
      const pool = CLASSICS.filter((c) => c.length >= L.len[0] && c.length <= L.len[1] + 1).map((c) => fromClassic(c, cfg)).filter(ok);
      if (pool.length) return pick(pool);
    }
    const n = L.len[0] + rnd(L.len[1] - L.len[0] + 1);
    const combo = [];
    let side = chance(0.6) ? lead : rear;
    for (let i = 0; i < n; i++) {
      const prev = combo[combo.length - 1];
      // defense: never first for beginners, never two in a row (except duck left → duck right)
      if (cfg.defense && i > 0 && chance(L.defense) && !(prev && prev.kind === 'defense')) {
        const d = pick(cfg.level === 1 ? ['duck', 'block', 'stepBack'] : DEFENSES);
        combo.push({ kind: 'defense', type: d });
        if (d === 'duckL') side = 'L'; else if (d === 'duckR') side = 'R'; // counter from the side you ducked to
        if (d === 'stepBack' || d === 'pivotL' || d === 'pivotR') break; // natural end of a combo
        continue;
      }
      let type;
      if (i === 0 && side === lead) type = chance(0.65) ? 'short' : chance(L.power) ? pick(['hook', 'uppercut']) : 'long';
      else if (side === rear) type = chance(L.power * 0.5) ? pick(['uppercut', 'hook']) : 'long';
      else type = chance(L.power) ? pick(['hook', 'hook', 'uppercut']) : 'short';
      const m = { kind: 'strike', type, side, body: cfg.body && type !== 'short' && chance(L.body) };
      if (i === 0 && type === 'short' && chance(0.15)) m.double = true;
      combo.push(m);
      side = chance(0.85) ? (side === 'L' ? 'R' : 'L') : side; // mostly alternate hands
    }
    // two identical punches in a row read better as a "double"
    for (let i = combo.length - 1; i > 0; i--) {
      const x = combo[i], y = combo[i - 1];
      if (x.kind === 'strike' && y.kind === 'strike' && x.type === y.type && x.side === y.side && !!x.body === !!y.body && !y.double) { y.double = true; combo.splice(i, 1); }
    }
    if (cfg.defense && cfg.level > 1 && chance(L.defense * 0.6) && combo[combo.length - 1].kind === 'strike') {
      combo.push({ kind: 'defense', type: pick(['duck', 'duckL', 'duckR', 'stepBack']) });
    }
    return combo;
  }

  const comboTime = (c) => c.reduce((s, m) => s + (m.kind === 'strike' ? STRIKES[m.type].t * (m.double ? 1.8 : 1) : 0.6), 0);

  const BURSTS = ['Fast hands! Straight punches.', 'Speed bag! Keep it going.', 'Body shots! Stay low.', 'Freestyle! Move your feet.', 'Hooks only! Turn the hips.'];
  const TIPS = ['Hands up.', 'Chin down.', 'Breathe.', 'Stay on your toes.', 'Move your head.', 'Snap it back.', 'Turn the hips.', 'Light feet.'];

  // ---------- Bell / clapper ----------
  function bell(Fx, S, times = 1) {
    if (!S.sound || !Fx.ctx) return;
    const ctx = Fx.ctx;
    for (let k = 0; k < times; k++) {
      const t0 = ctx.currentTime + k * 0.42;
      [[540, 0.35], [1085, 0.22], [1630, 0.14], [2610, 0.08]].forEach(([f, v]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 1.7);
      });
    }
  }
  function clapper(Fx, S) {
    if (!S.sound || !Fx.ctx) return;
    const ctx = Fx.ctx;
    for (let k = 0; k < 3; k++) {
      const t0 = ctx.currentTime + k * 0.13;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.06);
    }
  }

  // ---------- Setup screen ----------
  function cfgOf(api) {
    const S = api.S;
    S.boxing = Object.assign({}, DEFAULTS, S.boxing || {});
    return S.boxing;
  }

  function totalSec(c) {
    return c.prep + (c.mode === 'rounds' ? c.rounds * c.roundSec + (c.rounds - 1) * c.restSec : c.totalMin * 60);
  }

  function render(v, api) {
    const { ICON, fmtSec, fmt, save, $, $$ } = api;
    const c = cfgOf(api);
    const step = (key, label, sub, min, max, st, show) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>
      <div class="stepper"><button class="icon-btn" data-bstep="${key}" data-d="${-st}" data-min="${min}" data-max="${max}" aria-label="Less">${ICON.minus}</button>
      <b id="bv_${key}">${show(c[key])}</b>
      <button class="icon-btn" data-bstep="${key}" data-d="${st}" data-min="${min}" data-max="${max}" aria-label="More">${ICON.plus}</button></div></div>`;
    const seg = (key, opts) => `<div class="seg" data-bseg="${key}">${opts.map(([val, l]) => `<button data-v="${val}" class="${String(c[key]) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const sw = (key, label, sub) => `<div class="set-row"><div><div>${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" data-bk="${key}" ${c[key] ? 'checked' : ''}><span></span></label></div>`;
    const paceShow = (x) => (x ? x.toFixed(1) + 's' : 'auto');

    v.innerHTML = `
      <div class="card">
        <p class="label">Format</p>
        ${seg('mode', [['rounds', 'Rounds'], ['continuous', 'Continuous']])}
        <div id="bRounds" ${c.mode === 'rounds' ? '' : 'hidden'}>
          ${step('rounds', 'Rounds', '', 1, 20, 1, (x) => x)}
          ${step('roundSec', 'Round length', 'Boxing time per round', 30, 600, 30, fmtSec)}
          ${step('restSec', 'Rest between rounds', '', 0, 300, 15, fmtSec)}
        </div>
        <div id="bCont" ${c.mode === 'continuous' ? '' : 'hidden'}>
          ${step('totalMin', 'Duration', 'One continuous session', 1, 90, 1, (x) => x + ' min')}
        </div>
        ${step('prep', 'Get ready', 'Countdown before the first bell', 0, 30, 5, fmtSec)}
        <p class="small muted" style="margin:10px 2px 0" id="bTotal">Total: ${fmt(totalSec(c))}</p>
      </div>
      <div class="card">
        <p class="label">Level</p>
        ${seg('level', [[1, 'Beginner'], [2, 'Intermediate'], [3, 'Advanced']])}
        <p class="small muted" style="margin:10px 2px 0">Sets combo length (${LEVELS[c.level].len[0]}–${LEVELS[c.level].len[1]} moves), how often defense and power shots come up, and the pace.</p>
        ${step('pace', 'Pace', 'Pause after each combo before the next call', 0, 6, 0.5, paceShow)}
      </div>
      <div class="card">
        <p class="label">Calls</p>
        <div class="set-row"><div>Wording</div><div style="min-width:200px">${seg('terms', [['lr', 'Short / long'], ['classic', 'Jab / cross']])}</div></div>
        <div class="set-row"><div>Stance</div><div style="min-width:200px">${seg('stance', [['orth', 'Orthodox'], ['south', 'Southpaw']])}</div></div>
        ${sw('defense', 'Defense moves', 'Duck, duck left/right, block, step back, pivot')}
        ${sw('body', 'Body shots', 'e.g. “long right body”')}
        ${sw('bursts', 'Bursts & tips', 'Short freestyle bursts and quick reminders like “hands up”')}
        <p class="small muted" style="margin:10px 0 0" id="bSample"></p>
        <button class="btn ghost block" id="bSampleBtn" style="margin-top:8px">Hear a sample combo</button>
      </div>
      <div class="sticky-start" style="position:static"><button class="btn primary block big" id="bStart">${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start shadowboxing · ${fmt(totalSec(c))}</button></div>
    `;
    const sample = () => {
      const combo = generateCombo(c);
      const txt = combo.map((m) => moveText(m, c)).join(', ');
      $('#bSample').textContent = 'Example: ' + txt;
      return txt;
    };
    sample();
    const refresh = () => {
      $('#bTotal').textContent = 'Total: ' + fmt(totalSec(c));
      $('#bStart').innerHTML = `${ICON.play.replace('<svg', '<svg fill="currentColor"')} Start shadowboxing · ${fmt(totalSec(c))}`;
      save();
    };
    $$('[data-bstep]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.bstep;
      let val = +(c[k] + +b.dataset.d).toFixed(1);
      if (k === 'pace' && c[k] === 0 && +b.dataset.d > 0) val = LEVELS[c.level].gap; // from auto to a number
      c[k] = Math.max(+b.dataset.min, Math.min(+b.dataset.max, val));
      const shows = { rounds: (x) => x, roundSec: fmtSec, restSec: fmtSec, totalMin: (x) => x + ' min', prep: fmtSec, pace: paceShow };
      $('#bv_' + k).textContent = shows[k](c[k]);
      refresh();
    }));
    $$('[data-bseg]').forEach((sg) => $$('button', sg).forEach((b) => (b.onclick = () => {
      const k = sg.dataset.bseg; const val = b.dataset.v;
      c[k] = isNaN(+val) ? val : +val;
      $$('button', sg).forEach((x) => x.classList.toggle('on', x === b));
      if (k === 'mode') { $('#bRounds').hidden = c.mode !== 'rounds'; $('#bCont').hidden = c.mode !== 'continuous'; }
      if (k === 'level') { render(v, api); save(); return; }
      sample(); refresh();
    })));
    $$('input[data-bk]').forEach((i) => (i.onchange = () => { c[i.dataset.bk] = i.checked; sample(); save(); }));
    $('#bSampleBtn').onclick = () => { api.Fx.unlock(); api.Fx.say(sample(), true); };
    $('#bStart').onclick = () => Player.start(api);
  }

  // ---------- Player ----------
  const Player = {
    start(api) {
      this.api = api;
      const { Fx, ICON, $ } = api;
      Fx.unlock();
      if (global.speechSynthesis) speechSynthesis.cancel();
      const c = this.cfg = Object.assign({}, cfgOf(api));
      this.iv = [];
      if (c.prep) this.iv.push({ phase: 'prep', dur: c.prep, label: 'Get ready' });
      if (c.mode === 'rounds') {
        for (let r = 0; r < c.rounds; r++) {
          this.iv.push({ phase: 'box', dur: c.roundSec, label: `Round ${r + 1} of ${c.rounds}`, round: r + 1 });
          if (r < c.rounds - 1 && c.restSec) this.iv.push({ phase: 'rest', dur: c.restSec, label: `Rest · round ${r + 2} next` });
        }
      } else this.iv.push({ phase: 'box', dur: c.totalMin * 60, label: 'Continuous', round: 1 });
      this.total = this.iv.reduce((s, x) => s + x.dur, 0);
      this.boxed = 0; this.combos = 0;
      this.running = true; this.last = performance.now();
      this.el = $('#player'); this.el.hidden = false; this.el.className = 'player boxing';
      document.body.style.overflow = 'hidden';
      this.el.innerHTML = `
        <div class="p-top"><div><div class="p-phase"></div><div class="p-label"></div></div><div class="spacer"></div>
          <div class="p-left"><b id="bLeft"></b><span>left</span></div><button class="icon-btn" id="bClose" aria-label="Stop">${ICON.close}</button></div>
        <div class="p-progress"><i></i></div>
        <div class="bx-stage"><div class="bx-combo" id="bxCombo"></div><div class="bx-sub" id="bxSub"></div></div>
        <div class="p-timer" id="bxTimer"></div>
        <div class="p-next" id="bxCount"></div>
        <div class="p-controls">
          <button id="bPrev" aria-label="Back"><span class="ic">${ICON.prev}</span><small>Back</small></button>
          <button id="bPlay" class="main" aria-label="Pause"><span class="ic">${ICON.pause}</span></button>
          <button id="bNext" aria-label="Skip"><span class="ic">${ICON.next}</span><small>Skip</small></button>
        </div>`;
      $('#bClose').onclick = () => this.exit();
      $('#bPlay').onclick = () => this.toggle();
      $('#bNext').onclick = () => this.jump(1);
      $('#bPrev').onclick = () => this.jump(-1);
      this.enter(0);
      this.wake();
      this.timer = setInterval(() => this.tick(), 100);
    },
    async wake() { try { if ('wakeLock' in navigator) this.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* not available */ } },
    enter(i) {
      const { Fx, S } = this.api;
      this.idx = i;
      const x = this.iv[i];
      this.remain = x.dur; this.lastSec = null; this.warned = false; this.halfSaid = false;
      this.nextCall = x.phase === 'box' ? 1.5 : Infinity;
      this.sinceBurst = 0; this.burstLeft = 0;
      this.elapsedBefore = this.iv.slice(0, i).reduce((s, y) => s + y.dur, 0);
      this.el.classList.toggle('rest', x.phase === 'rest');
      this.el.classList.toggle('prep', x.phase === 'prep');
      const $ = this.api.$;
      $('.p-phase', this.el).textContent = { prep: 'Get ready', box: 'Box', rest: 'Rest' }[x.phase];
      $('.p-label', this.el).textContent = x.label;
      this.show(x.phase === 'box' ? 'Hands up' : x.phase === 'rest' ? 'Breathe' : 'Get ready', x.phase === 'rest' ? 'Shake out the arms, stay loose' : '');
      if (x.phase === 'box') { bell(Fx, S, 1); Fx.buzz(250); Fx.say(this.cfg.mode === 'rounds' ? `Round ${x.round}. Box!` : 'Box!', true); }
      else if (x.phase === 'rest') { Fx.say(`Rest. ${x.label.split('· ')[1] || ''}`, true); }
      else Fx.say('Get ready. Guard up.', true);
      this.renderTime();
    },
    show(main, sub) {
      const $ = this.api.$;
      $('#bxCombo').innerHTML = main;
      $('#bxSub').textContent = sub || '';
    },
    call() {
      const c = this.cfg, { Fx } = this.api;
      const L = LEVELS[c.level];
      const gap = c.pace || L.gap;
      // occasional burst or tip
      if (c.bursts && this.sinceBurst > 45 && this.remain > 20 && Math.random() < (c.level === 1 ? 0.15 : 0.3)) {
        const b = BURSTS[rnd(BURSTS.length)];
        this.sinceBurst = 0; this.burstLeft = c.level === 3 ? 10 : 8;
        this.show(b.split('!')[0] + '!', `${this.burstLeft} seconds`);
        Fx.say(b + ` ${this.burstLeft} seconds!`, true);
        this.nextCall = this.burstLeft + 1;
        return;
      }
      if (c.bursts && Math.random() < 0.07) {
        const t = TIPS[rnd(TIPS.length)];
        this.show(t, ''); Fx.say(t, true); this.nextCall = 1.6; return;
      }
      const combo = generateCombo(c);
      this.combos++;
      const parts = combo.map((m) => moveText(m, c));
      this.show(combo.map((m, k) => `<span class="bx-move ${m.kind}">${parts[k]}</span>`).join('<span class="bx-sep">›</span>'), '');
      const spoken = parts.join(', ');
      Fx.say(spoken, true);
      // time to hear it + throw it + recover
      const speech = spoken.split(/\s+/).length * 0.3 / (this.api.S.voiceRate || 1);
      this.nextCall = speech + comboTime(combo) + gap;
    },
    renderTime() {
      const $ = this.api.$, fmt = this.api.fmt;
      $('#bxTimer').textContent = fmt(Math.ceil(this.remain - 0.01));
      const done = this.elapsedBefore + (this.iv[this.idx].dur - this.remain);
      $('.p-progress i', this.el).style.width = (100 * done / this.total).toFixed(2) + '%';
      $('#bLeft').textContent = fmt(this.total - done);
      $('#bxCount').textContent = this.combos ? `${this.combos} combo${this.combos === 1 ? "" : "s"} called` : '';
    },
    tick() {
      const now = performance.now();
      const dt = (now - this.last) / 1000; this.last = now;
      if (!this.running) return;
      const { Fx, S } = this.api;
      const x = this.iv[this.idx];
      this.remain -= dt;
      if (x.phase === 'box') {
        this.boxed += dt; this.sinceBurst += dt;
        this.nextCall -= dt;
        if (this.burstLeft > 0) {
          this.burstLeft -= dt;
          this.api.$('#bxSub').textContent = this.burstLeft > 0 ? `${Math.ceil(this.burstLeft)} seconds` : '';
        }
        if (!this.warned && this.remain <= 10 && x.dur > 20) {
          this.warned = true; clapper(Fx, S); Fx.say('Ten seconds! Finish strong!', true); this.nextCall = 2.6;
        } else if (this.cfg.mode === 'continuous' && !this.halfSaid && this.remain <= x.dur / 2 && x.dur >= 240) {
          this.halfSaid = true; Fx.say('Halfway. Keep moving.', true); this.nextCall = 2;
        } else if (this.nextCall <= 0 && this.remain > 1.5) this.call();
      } else {
        const sec = Math.ceil(this.remain);
        if (sec !== this.lastSec && sec >= 1 && sec <= 3) { this.lastSec = sec; Fx.countdown(sec); }
        if (x.phase === 'rest' && !this.warned && this.remain <= 10 && x.dur > 15) { this.warned = true; Fx.say('Ten seconds. Get ready.', true); }
      }
      if (this.remain <= 0) {
        if (x.phase === 'box') { bell(Fx, S, 3); Fx.buzz([150, 80, 150]); }
        if (this.idx + 1 >= this.iv.length) return this.finish();
        this.enter(this.idx + 1);
      }
      this.renderTime();
    },
    toggle() {
      const { Fx, ICON, $ } = this.api;
      this.running = !this.running; this.last = performance.now();
      $('#bPlay .ic').innerHTML = this.running ? ICON.pause : ICON.play;
      if (this.running) { Fx.unlock(); this.wake(); } else { if (global.speechSynthesis) speechSynthesis.cancel(); Fx.say('Paused', true); }
    },
    jump(d) {
      let i = this.idx + d;
      if (d < 0 && this.iv[this.idx].dur - this.remain > 3) i = this.idx;
      if (i >= this.iv.length) return this.finish();
      this.enter(Math.max(0, i));
    },
    record(done) {
      const sec = Math.round(this.boxed);
      if (sec < 60) return;
      const c = this.cfg;
      this.api.store.history.push({ type: 'boxing', date: Date.now(), sec, done, mode: c.mode, rounds: c.mode === 'rounds' ? c.rounds : 0, roundSec: c.roundSec, level: c.level, combos: this.combos });
      this.api.save();
    },
    exit() {
      if (this.boxed > 30 && !confirm('Stop shadowboxing? Your time will be saved to history.')) return;
      this.record(false);
      this.close();
    },
    finish() {
      const { Fx, fmtMin, $ } = this.api;
      this.record(true);
      clearInterval(this.timer);
      Fx.say('Time! Great work.', true);
      this.el.innerHTML = `<div class="p-done"><div class="big">🥊</div><h2>Session complete!</h2>
        <p class="muted">${fmtMin(this.boxed)} of boxing · ${this.combos} combos${this.cfg.mode === 'rounds' ? ` · ${this.cfg.rounds} rounds` : ''}</p>
        <button class="btn primary big" id="bOk" style="min-width:220px">Done</button></div>`;
      $('#bOk').onclick = () => { this.close(); this.api.goTab('history'); };
    },
    close() {
      clearInterval(this.timer);
      if (global.speechSynthesis) speechSynthesis.cancel();
      this.api.Fx.mediaMode(false);
      try { if (this.lock) this.lock.release(); } catch (e) { /* ignore */ }
      this.lock = null;
      this.el.hidden = true; this.el.innerHTML = ''; this.el.className = 'player';
      document.body.style.overflow = '';
      this.api.rerender();
    },
  };

  global.Boxing = { render, generateCombo, moveText, LEVELS, DEFAULTS };
})(window);
